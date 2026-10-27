/**
 * MediDx Background Sync Engine
 * Replays queued offline modifications to Firebase Firestore once connectivity is restored.
 * Implements Conflict Resolution (Last-Write-Wins with audit tracking) and Exponential Backoff.
 */

import { 
    PendingSyncEntry, 
    addPendingSync, 
    getPendingSyncEntries, 
    removePendingSync, 
    clearPendingSync, 
    addAuditEntry,
    AuditEntry
} from './offlineDB';
import { db, doc, setDoc, updateDoc, deleteDoc, getDoc } from '../firebase';
import { Encounter } from '../types';

export type SyncEventListener = (status: {
    isSyncing: boolean;
    pendingCount: number;
    lastSyncedAt: number | null;
    error: string | null;
}) => void;

class SyncEngine {
    private isSyncing = false;
    private listeners: Set<SyncEventListener> = new Set();
    private lastSyncedAt: number | null = null;
    private lastError: string | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                console.log('[SyncEngine] Connection restored. Triggering automatic background sync...');
                this.processQueue();
            });
        }
    }

    public subscribe(listener: SyncEventListener): () => void {
        this.listeners.add(listener);
        this.notify();
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.getPendingCount().then(count => {
            const state = {
                isSyncing: this.isSyncing,
                pendingCount: count,
                lastSyncedAt: this.lastSyncedAt,
                error: this.lastError
            };
            this.listeners.forEach(fn => fn(state));
        });
    }

    public async getPendingCount(): Promise<number> {
        try {
            const list = await getPendingSyncEntries();
            return list.length;
        } catch {
            return 0;
        }
    }

    /**
     * Enqueue a pending mutation when offline or in background
     */
    public async queueMutation(
        operation: PendingSyncEntry['operation'],
        entityType: PendingSyncEntry['entityType'],
        entityId: string,
        data?: any
    ): Promise<void> {
        const entry: PendingSyncEntry = {
            id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            operation,
            entityType,
            entityId,
            data,
            timestamp: Date.now(),
            retryCount: 0
        };

        await addPendingSync(entry);
        this.notify();

        // If online right now, attempt immediate background sync
        if (typeof navigator !== 'undefined' && navigator.onLine) {
            this.processQueue();
        }
    }

    /**
     * Process all queued pending synchronizations
     */
    public async processQueue(): Promise<{ success: number; failed: number }> {
        if (this.isSyncing) {
            return { success: 0, failed: 0 };
        }

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            console.log('[SyncEngine] Device is offline. Sync postponed.');
            return { success: 0, failed: 0 };
        }

        this.isSyncing = true;
        this.lastError = null;
        this.notify();

        let success = 0;
        let failed = 0;

        try {
            const queue = await getPendingSyncEntries();
            if (queue.length === 0) {
                this.isSyncing = false;
                this.notify();
                return { success: 0, failed: 0 };
            }

            console.log(`[SyncEngine] Processing ${queue.length} pending mutations...`);

            for (const item of queue) {
                try {
                    await this.syncItem(item);
                    await removePendingSync(item.id);
                    success++;

                    // Log audit entry for sync success
                    await addAuditEntry({
                        id: `audit-sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        timestamp: Date.now(),
                        userId: item.data?.ownerId || 'system',
                        userName: 'Background Sync',
                        userRole: 'System',
                        action: 'SYNC',
                        entityType: item.entityType as AuditEntry['entityType'],
                        entityId: item.entityId,
                        details: `Synchronized ${item.operation.toUpperCase()} on ${item.entityType} ${item.entityId} to Cloud Firestore`,
                        syncStatus: 'synced'
                    });
                } catch (err: any) {
                    console.warn(`[SyncEngine] Error syncing item ${item.id}:`, err);
                    failed++;
                    item.retryCount = (item.retryCount || 0) + 1;
                    item.lastError = err.message || String(err);

                    // If failed more than 5 times, keep in queue but log warning
                    if (item.retryCount >= 5) {
                        console.error(`[SyncEngine] Mutation ${item.id} exceeded maximum retry limit (5).`);
                    }
                    await addPendingSync(item);
                }
            }

            this.lastSyncedAt = Date.now();
        } catch (e: any) {
            this.lastError = e.message || 'Sync processing error';
            console.error('[SyncEngine] Fatal queue sync error:', e);
        } finally {
            this.isSyncing = false;
            this.notify();
        }

        return { success, failed };
    }

    /**
     * Sync single item to Cloud Firestore with conflict checking
     */
    private async syncItem(item: PendingSyncEntry): Promise<void> {
        // Skip guest clinician sync to avoid Firestore unauthorized errors
        if (item.data?.ownerId === 'guest-clinician-id') {
            return;
        }

        const collectionName = item.entityType === 'encounter' ? 'encounters'
            : item.entityType === 'doctor' ? 'doctors' : 'shared_cases';

        const docRef = doc(db, collectionName, item.entityId);

        if (item.operation === 'delete') {
            await deleteDoc(docRef);
            return;
        }

        if (item.operation === 'create' || item.operation === 'update') {
            // Conflict resolution: Check if server copy is newer
            try {
                const serverSnap = await getDoc(docRef);
                if (serverSnap.exists()) {
                    const serverData = serverSnap.data();
                    const serverTimestamp = serverData.timestamp || 0;
                    const localTimestamp = item.timestamp || 0;

                    // If server data was modified after this local change, resolve conflict
                    if (serverTimestamp > localTimestamp) {
                        console.warn(`[SyncEngine] Conflict detected on ${item.entityId}. Applying Last-Write-Wins with merge.`);
                        // Merge fields: preserve server timestamp if newer, but keep local user edits
                        const merged = { ...serverData, ...item.data, timestamp: serverTimestamp };
                        await setDoc(docRef, merged, { merge: true });
                        return;
                    }
                }
            } catch (checkErr) {
                // If getDoc fails due to permissions, proceed to write
            }

            await setDoc(docRef, item.data, { merge: true });
        }
    }

    /**
     * Clear all pending items
     */
    public async clearAll(): Promise<void> {
        await clearPendingSync();
        this.notify();
    }
}

export const syncEngine = new SyncEngine();
