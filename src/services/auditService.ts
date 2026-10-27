/**
 * MediDx Clinical Audit Trail Service
 * Provides immutable audit logging for all clinical data operations.
 * Essential for Government Healthcare Compliance (NIST 800-53, HIPAA Security Rule, GDPR Article 30).
 */

import { AuditEntry, addAuditEntry, getAuditEntries, getAuditEntriesByEntity } from './offlineDB';

class AuditService {
    private userId: string = 'guest-clinician-id';
    private userName: string = 'Dr. Alex Mercer';
    private userRole: string = 'Clinician';

    public setUserContext(userId: string, userName: string, userRole: string): void {
        this.userId = userId || 'unknown';
        this.userName = userName || 'Clinician';
        this.userRole = userRole || 'Clinician';
    }

    public async log(params: {
        action: AuditEntry['action'];
        entityType: AuditEntry['entityType'];
        entityId: string;
        details?: string;
        previousValue?: any;
        newValue?: any;
        fieldChanged?: string;
    }): Promise<AuditEntry> {
        const entry: AuditEntry = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            timestamp: Date.now(),
            userId: this.userId,
            userName: this.userName,
            userRole: this.userRole,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId,
            details: params.details,
            previousValue: params.previousValue ? this.sanitizeValue(params.previousValue) : undefined,
            newValue: params.newValue ? this.sanitizeValue(params.newValue) : undefined,
            fieldChanged: params.fieldChanged,
            syncStatus: typeof navigator !== 'undefined' && navigator.onLine ? 'synced' : 'local'
        };

        try {
            await addAuditEntry(entry);
        } catch (e) {
            console.warn('[AuditService] Failed to record audit log:', e);
        }

        return entry;
    }

    public async logEncounterCreated(encounterId: string, patientName: string): Promise<void> {
        await this.log({
            action: 'CREATE',
            entityType: 'encounter',
            entityId: encounterId,
            details: `Created new patient record for "${patientName || 'Anonymous Patient'}"`,
        });
    }

    public async logEncounterUpdated(encounterId: string, fieldChanged: string, prev?: any, next?: any): Promise<void> {
        await this.log({
            action: 'UPDATE',
            entityType: 'encounter',
            entityId: encounterId,
            fieldChanged,
            previousValue: prev,
            newValue: next,
            details: `Updated field '${fieldChanged}' in encounter ${encounterId}`,
        });
    }

    public async logEncounterDeleted(encounterId: string, patientName: string): Promise<void> {
        await this.log({
            action: 'DELETE',
            entityType: 'encounter',
            entityId: encounterId,
            details: `Deleted patient encounter record for "${patientName || 'Anonymous Patient'}"`,
        });
    }

    public async logDiagnosisGenerated(encounterId: string, count: number, source: 'AI' | 'Offline'): Promise<void> {
        await this.log({
            action: 'DIAGNOSIS_GENERATED',
            entityType: 'diagnosis',
            entityId: encounterId,
            details: `Generated ${count} differential diagnoses using ${source} engine`,
        });
    }

    public async logTreatmentChanged(encounterId: string, drugName: string, changeDetail: string): Promise<void> {
        await this.log({
            action: 'TREATMENT_CHANGED',
            entityType: 'treatment',
            entityId: encounterId,
            details: `Treatment modified: ${drugName} - ${changeDetail}`,
        });
    }

    public async logReportExported(encounterId: string, reportType: string): Promise<void> {
        await this.log({
            action: 'EXPORT',
            entityType: 'encounter',
            entityId: encounterId,
            details: `Exported medical document: ${reportType}`,
        });
    }

    public async logAuth(action: 'LOGIN' | 'LOGOUT', userEmail: string): Promise<void> {
        await this.log({
            action,
            entityType: 'profile',
            entityId: this.userId,
            details: `Clinician authentication: ${action} for ${userEmail}`,
        });
    }

    public async getTrail(entityId?: string): Promise<AuditEntry[]> {
        if (entityId) {
            return await getAuditEntriesByEntity(entityId);
        }
        return await getAuditEntries();
    }

    public async exportAuditJSON(): Promise<string> {
        const records = await getAuditEntries();
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            exportedBy: this.userName,
            clinicianRole: this.userRole,
            totalAuditRecords: records.length,
            records
        }, null, 2);
    }

    private sanitizeValue(val: any): any {
        if (typeof val === 'string' && val.length > 300) {
            return val.slice(0, 300) + '... [truncated for audit log]';
        }
        if (typeof val === 'object' && val !== null) {
            try {
                const str = JSON.stringify(val);
                if (str.length > 500) {
                    return str.slice(0, 500) + '...';
                }
            } catch {
                return '[Complex Object]';
            }
        }
        return val;
    }
}

export const auditService = new AuditService();
export type { AuditEntry };
