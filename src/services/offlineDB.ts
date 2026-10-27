/**
 * @fileoverview IndexedDB wrapper service for MediDx offline-first architecture.
 * Uses the `idb` library to provide a typed, promise-based interface to IndexedDB.
 * All encounter, doctor, sync queue, and audit data is persisted locally for
 * offline access and later synchronization with Firestore.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Encounter, DoctorProfile, SharedCase } from '../types';

// ─── Interfaces ──────────────────────────────────────────────────────────────

/** Represents a pending synchronization entry queued for Firestore upload. */
export interface PendingSyncEntry {
    id: string;
    operation: 'create' | 'update' | 'delete';
    entityType: 'encounter' | 'doctor' | 'shared_case';
    entityId: string;
    data?: any;
    timestamp: number;
    retryCount: number;
    lastError?: string;
}

/** Represents an immutable audit log entry tracking all user actions. */
export interface AuditEntry {
    id: string;
    timestamp: number;
    userId: string;
    userName: string;
    userRole: string;
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'LOGIN' | 'LOGOUT' | 'DIAGNOSIS_GENERATED' | 'TREATMENT_CHANGED' | 'SYNC';
    entityType: 'encounter' | 'treatment' | 'diagnosis' | 'progress_note' | 'profile' | 'system';
    entityId: string;
    details?: string;
    previousValue?: any;
    newValue?: any;
    fieldChanged?: string;
    syncStatus: 'local' | 'synced' | 'pending';
}

/** Optional filters for querying audit entries. */
export interface AuditQueryFilters {
    userId?: string;
    entityType?: AuditEntry['entityType'];
    action?: AuditEntry['action'];
    startTime?: number;
    endTime?: number;
}

// ─── DB Schema ───────────────────────────────────────────────────────────────

/** Typed schema for the MediDx IndexedDB database. */
interface MediDxDB extends DBSchema {
    encounters: {
        key: string;
        value: Encounter;
        indexes: {
            'ownerId': string;
            'status': Encounter['status'];
            'timestamp': number;
        };
    };
    doctors: {
        key: string;
        value: DoctorProfile;
    };
    shared_cases: {
        key: string;
        value: SharedCase;
        indexes: {
            'encounterId': string;
            'sharedWith': string;
        };
    };
    pending_sync: {
        key: string;
        value: PendingSyncEntry;
        indexes: {
            'operation': PendingSyncEntry['operation'];
            'timestamp': number;
            'entityType': PendingSyncEntry['entityType'];
        };
    };
    audit_log: {
        key: string;
        value: AuditEntry;
        indexes: {
            'timestamp': number;
            'userId': string;
            'entityType': AuditEntry['entityType'];
            'action': AuditEntry['action'];
        };
    };
}

// ─── Database Constants ──────────────────────────────────────────────────────

const DB_NAME = 'medidx-db';
const DB_VERSION = 1;

// ─── Singleton Connection ────────────────────────────────────────────────────

let dbInstance: IDBPDatabase<MediDxDB> | null = null;

/**
 * Checks whether IndexedDB is available in the current environment.
 * @returns `true` if IndexedDB is supported, `false` otherwise.
 */
function isIndexedDBAvailable(): boolean {
    try {
        return typeof indexedDB !== 'undefined' && indexedDB !== null;
    } catch {
        return false;
    }
}

// ─── Core DB Lifecycle ───────────────────────────────────────────────────────

/**
 * Opens (or creates) the MediDx IndexedDB database and returns the connection.
 * If the database already exists, returns the cached instance.
 *
 * @returns A promise resolving to the database connection.
 * @throws Error if IndexedDB is not available in the current environment.
 */
export async function initDB(): Promise<IDBPDatabase<MediDxDB>> {
    if (dbInstance) {
        return dbInstance;
    }

    if (!isIndexedDBAvailable()) {
        throw new Error(
            'IndexedDB is not available in this environment. ' +
            'Offline storage features will be disabled.'
        );
    }

    try {
        dbInstance = await openDB<MediDxDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // ── Encounters store ─────────────────────────────────────
                if (!db.objectStoreNames.contains('encounters')) {
                    const encounterStore = db.createObjectStore('encounters', { keyPath: 'id' });
                    encounterStore.createIndex('ownerId', 'ownerId', { unique: false });
                    encounterStore.createIndex('status', 'status', { unique: false });
                    encounterStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // ── Doctors store ────────────────────────────────────────
                if (!db.objectStoreNames.contains('doctors')) {
                    db.createObjectStore('doctors', { keyPath: 'uid' });
                }

                // ── Shared cases store ───────────────────────────────────
                if (!db.objectStoreNames.contains('shared_cases')) {
                    const sharedStore = db.createObjectStore('shared_cases', { keyPath: 'id' });
                    sharedStore.createIndex('encounterId', 'encounterId', { unique: false });
                    sharedStore.createIndex('sharedWith', 'sharedWith', { unique: false });
                }

                // ── Pending sync queue ───────────────────────────────────
                if (!db.objectStoreNames.contains('pending_sync')) {
                    const syncStore = db.createObjectStore('pending_sync', { keyPath: 'id' });
                    syncStore.createIndex('operation', 'operation', { unique: false });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                    syncStore.createIndex('entityType', 'entityType', { unique: false });
                }

                // ── Audit log ────────────────────────────────────────────
                if (!db.objectStoreNames.contains('audit_log')) {
                    const auditStore = db.createObjectStore('audit_log', { keyPath: 'id' });
                    auditStore.createIndex('timestamp', 'timestamp', { unique: false });
                    auditStore.createIndex('userId', 'userId', { unique: false });
                    auditStore.createIndex('entityType', 'entityType', { unique: false });
                    auditStore.createIndex('action', 'action', { unique: false });
                }
            },
            blocked() {
                console.warn('[MediDx OfflineDB] Database upgrade blocked by another open connection.');
            },
            blocking() {
                console.warn('[MediDx OfflineDB] This connection is blocking a database upgrade.');
                dbInstance?.close();
                dbInstance = null;
            },
            terminated() {
                console.warn('[MediDx OfflineDB] Database connection was unexpectedly terminated.');
                dbInstance = null;
            },
        });

        return dbInstance;
    } catch (error) {
        console.error('[MediDx OfflineDB] Failed to initialise database:', error);
        throw error;
    }
}

/**
 * Returns the existing database connection, initialising it if necessary.
 *
 * @returns A promise resolving to the database connection.
 */
export async function getDB(): Promise<IDBPDatabase<MediDxDB>> {
    if (!dbInstance) {
        return initDB();
    }
    return dbInstance;
}

// ─── Encounter CRUD ──────────────────────────────────────────────────────────

/**
 * Retrieves all encounters, optionally filtered by owner.
 *
 * @param ownerId - If provided, only encounters belonging to this owner are returned.
 * @returns A promise resolving to an array of encounters.
 */
export async function getAllEncounters(ownerId?: string): Promise<Encounter[]> {
    try {
        const db = await getDB();
        if (ownerId) {
            return db.getAllFromIndex('encounters', 'ownerId', ownerId);
        }
        return db.getAll('encounters');
    } catch (error) {
        console.error('[MediDx OfflineDB] Failed to get all encounters:', error);
        return [];
    }
}

/**
 * Retrieves a single encounter by its ID.
 *
 * @param id - The encounter ID.
 * @returns A promise resolving to the encounter, or `undefined` if not found.
 */
export async function getEncounter(id: string): Promise<Encounter | undefined> {
    try {
        const db = await getDB();
        return db.get('encounters', id);
    } catch (error) {
        console.error(`[MediDx OfflineDB] Failed to get encounter ${id}:`, error);
        return undefined;
    }
}

/**
 * Creates or updates an encounter in the local database.
 *
 * @param encounter - The full encounter object to persist.
 */
export async function putEncounter(encounter: Encounter): Promise<void> {
    try {
        const db = await getDB();
        await db.put('encounters', encounter);
    } catch (error) {
        console.error(`[MediDx OfflineDB] Failed to put encounter ${encounter.id}:`, error);
        throw error;
    }
}

/**
 * Deletes an encounter from the local database.
 *
 * @param id - The encounter ID to remove.
 */
export async function deleteEncounter(id: string): Promise<void> {
    try {
        const db = await getDB();
        await db.delete('encounters', id);
    } catch (error) {
        console.error(`[MediDx OfflineDB] Failed to delete encounter ${id}:`, error);
        throw error;
    }
}

/**
 * Retrieves all encounters belonging to a specific owner.
 *
 * @param ownerId - The owner's user ID.
 * @returns A promise resolving to an array of encounters.
 */
export async function getEncountersByOwner(ownerId: string): Promise<Encounter[]> {
    try {
        const db = await getDB();
        return db.getAllFromIndex('encounters', 'ownerId', ownerId);
    } catch (error) {
        console.error(`[MediDx OfflineDB] Failed to get encounters for owner ${ownerId}:`, error);
        return [];
    }
}

/**
 * Retrieves all encounters matching a given status.
 *
 * @param status - The encounter status to filter by.
 * @returns A promise resolving to an array of encounters.
 */
export async function getEncountersByStatus(status: Encounter['status']): Promise<Encounter[]> {
    try {
        const db = await getDB();
        return db.getAllFromIndex('encounters', 'status', status);
    } catch (error) {
        console.error(`[MediDx OfflineDB] Failed to get encounters by status ${status}:`, error);
        return [];
    }
}

// ─── Doctor CRUD ─────────────────────────────────────────────────────────────

/**
 * Retrieves a single doctor profile by UID.
 *
 * @param uid - The doctor's unique identifier.
 * @returns A promise resolving to the doctor profile, or `undefined` if not found.
 */
export async function getDoctor(uid: string): Promise<DoctorProfile | undefined> {
    try {
        const db = await getDB();
        return db.get('doctors', uid);
    } catch (error) {
        console.error(`[MediDx OfflineDB] Failed to get doctor ${uid}:`, error);
        return undefined;
    }
}

/**
 * Creates or updates a doctor profile in the local database.
 *
 * @param profile - The full doctor profile to persist.
 */
export async function putDoctor(profile: DoctorProfile): Promise<void> {
    try {
        const db = await getDB();
        await db.put('doctors', profile);
    } catch (error) {
        console.error(`[MediDx OfflineDB] Failed to put doctor ${profile.uid}:`, error);
        throw error;
    }
}

/**
 * Retrieves all doctor profiles from the local database.
 *
 * @returns A promise resolving to an array of doctor profiles.
 */
export async function getAllDoctors(): Promise<DoctorProfile[]> {
    try {
        const db = await getDB();
        return db.getAll('doctors');
    } catch (error) {
        console.error('[MediDx OfflineDB] Failed to get all doctors:', error);
        return [];
    }
}

// ─── Sync Queue ──────────────────────────────────────────────────────────────

/**
 * Adds a new entry to the pending sync queue.
 *
 * @param entry - The sync entry to enqueue.
 */
export async function addPendingSync(entry: PendingSyncEntry): Promise<void> {
    try {
        const db = await getDB();
        await db.put('pending_sync', entry);
    } catch (error) {
        console.error('[MediDx OfflineDB] Failed to add pending sync entry:', error);
        throw error;
    }
}

/**
 * Retrieves all entries in the pending sync queue, ordered by timestamp.
 *
 * @returns A promise resolving to an array of pending sync entries.
 */
export async function getPendingSyncEntries(): Promise<PendingSyncEntry[]> {
    try {
        const db = await getDB();
        return db.getAllFromIndex('pending_sync', 'timestamp');
    } catch (error) {
        console.error('[MediDx OfflineDB] Failed to get pending sync entries:', error);
        return [];
    }
}

/**
 * Removes a single entry from the sync queue after successful processing.
 *
 * @param id - The sync entry ID to remove.
 */
export async function removePendingSync(id: string): Promise<void> {
    try {
        const db = await getDB();
        await db.delete('pending_sync', id);
    } catch (error) {
        console.error(`[MediDx OfflineDB] Failed to remove pending sync ${id}:`, error);
        throw error;
    }
}

/**
 * Clears all entries from the pending sync queue.
 */
export async function clearPendingSync(): Promise<void> {
    try {
        const db = await getDB();
        await db.clear('pending_sync');
    } catch (error) {
        console.error('[MediDx OfflineDB] Failed to clear pending sync queue:', error);
        throw error;
    }
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

/**
 * Adds an immutable audit log entry.
 *
 * @param entry - The audit entry to record.
 */
export async function addAuditEntry(entry: AuditEntry): Promise<void> {
    try {
        const db = await getDB();
        await db.put('audit_log', entry);
    } catch (error) {
        console.error('[MediDx OfflineDB] Failed to add audit entry:', error);
        throw error;
    }
}

/**
 * Retrieves audit entries with optional filtering.
 *
 * @param filters - Optional filters to narrow down results.
 * @returns A promise resolving to an array of audit entries matching the filters.
 */
export async function getAuditEntries(filters?: AuditQueryFilters): Promise<AuditEntry[]> {
    try {
        const db = await getDB();

        // If a specific single-index filter is provided, use the index for performance
        if (filters?.userId && !filters.entityType && !filters.action) {
            const entries = await db.getAllFromIndex('audit_log', 'userId', filters.userId);
            return applyTimeFilters(entries, filters);
        }
        if (filters?.entityType && !filters.userId && !filters.action) {
            const entries = await db.getAllFromIndex('audit_log', 'entityType', filters.entityType);
            return applyTimeFilters(entries, filters);
        }
        if (filters?.action && !filters.userId && !filters.entityType) {
            const entries = await db.getAllFromIndex('audit_log', 'action', filters.action);
            return applyTimeFilters(entries, filters);
        }

        // Fallback: fetch all and filter in memory for compound filters
        let entries = await db.getAll('audit_log');

        if (filters) {
            entries = entries.filter((entry) => {
                if (filters.userId && entry.userId !== filters.userId) return false;
                if (filters.entityType && entry.entityType !== filters.entityType) return false;
                if (filters.action && entry.action !== filters.action) return false;
                if (filters.startTime && entry.timestamp < filters.startTime) return false;
                if (filters.endTime && entry.timestamp > filters.endTime) return false;
                return true;
            });
        }

        return entries;
    } catch (error) {
        console.error('[MediDx OfflineDB] Failed to get audit entries:', error);
        return [];
    }
}

/**
 * Retrieves all audit entries related to a specific entity.
 *
 * @param entityId - The entity ID to look up.
 * @returns A promise resolving to an array of audit entries for the entity.
 */
export async function getAuditEntriesByEntity(entityId: string): Promise<AuditEntry[]> {
    try {
        const db = await getDB();
        const allEntries = await db.getAll('audit_log');
        return allEntries.filter((entry) => entry.entityId === entityId);
    } catch (error) {
        console.error(`[MediDx OfflineDB] Failed to get audit entries for entity ${entityId}:`, error);
        return [];
    }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Clears all data from every object store in the database.
 * ⚠️ This is a destructive operation intended for debugging / logout flows.
 */
export async function clearAllData(): Promise<void> {
    try {
        const db = await getDB();
        const tx = db.transaction(
            ['encounters', 'doctors', 'shared_cases', 'pending_sync', 'audit_log'],
            'readwrite'
        );
        await Promise.all([
            tx.objectStore('encounters').clear(),
            tx.objectStore('doctors').clear(),
            tx.objectStore('shared_cases').clear(),
            tx.objectStore('pending_sync').clear(),
            tx.objectStore('audit_log').clear(),
            tx.done,
        ]);
    } catch (error) {
        console.error('[MediDx OfflineDB] Failed to clear all data:', error);
        throw error;
    }
}

/**
 * Returns the browser's estimate of current storage usage and quota.
 *
 * @returns An object with `usage` and `quota` in bytes, or `null` if the
 *          Storage Manager API is unavailable.
 */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
    try {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage ?? 0,
                quota: estimate.quota ?? 0,
            };
        }
        return null;
    } catch (error) {
        console.error('[MediDx OfflineDB] Failed to get storage estimate:', error);
        return null;
    }
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Applies time-range filters to a pre-fetched set of audit entries.
 */
function applyTimeFilters(entries: AuditEntry[], filters?: AuditQueryFilters): AuditEntry[] {
    if (!filters) return entries;
    return entries.filter((entry) => {
        if (filters.startTime && entry.timestamp < filters.startTime) return false;
        if (filters.endTime && entry.timestamp > filters.endTime) return false;
        return true;
    });
}
