import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
    ShieldExclamationIcon, 
    XMarkIcon, 
    DownloadIcon, 
    ArrowPathIcon,
    MagnifyingGlassIcon,
    DocumentTextIcon
} from './icons';
import { auditService, AuditEntry } from '../services/auditService';
import { toast } from 'sonner';

interface AuditTrailModalProps {
    onClose: () => void;
    encounterId?: string;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({ onClose, encounterId }) => {
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('ALL');

    const loadEntries = async () => {
        setLoading(true);
        try {
            const list = await auditService.getTrail(encounterId);
            setEntries(list);
        } catch {
            toast.error('Failed to load audit records.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEntries();
    }, [encounterId]);

    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            const matchesSearch = searchTerm === '' ||
                e.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.entityId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.action.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesAction = actionFilter === 'ALL' || e.action === actionFilter;

            return matchesSearch && matchesAction;
        });
    }, [entries, searchTerm, actionFilter]);

    const handleExport = async () => {
        try {
            const jsonStr = await auditService.exportAuditJSON();
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `medidx-audit-trail-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Audit trail exported successfully for regulatory compliance.');
        } catch {
            toast.error('Export failed.');
        }
    };

    const getActionBadgeColor = (action: AuditEntry['action']) => {
        switch (action) {
            case 'CREATE':
                return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'UPDATE':
            case 'TREATMENT_CHANGED':
                return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'DELETE':
                return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
            case 'DIAGNOSIS_GENERATED':
                return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'EXPORT':
                return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'SYNC':
                return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
            default:
                return 'bg-primary-500/20 text-primary-300 border-primary-500/30';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 animate-fade-in">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-primary-100/95 backdrop-blur-2xl rounded-2xl md:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.6)] w-full max-w-5xl overflow-hidden border border-primary-300/30 max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="bg-primary-900/90 border-b border-primary-300/20 p-5 md:p-6 text-white flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="bg-brand-500/20 p-3 rounded-xl border border-brand-500/40 text-brand-400 shadow-[0_0_20px_rgba(0,213,255,0.2)]">
                            <ShieldExclamationIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg md:text-xl font-bold tracking-tight text-white font-display">
                                    Clinical & Security Audit Trail
                                </h2>
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                                    Government Verified
                                </span>
                            </div>
                            <p className="text-primary-400 text-xs mt-0.5">
                                Immutable chronological log of all clinical actions, data mutations, and diagnostic records.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleExport}
                            className="hidden sm:flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-2 px-3.5 rounded-lg border border-white/20 transition-all active:scale-95"
                            title="Download complete JSON audit log for regulatory compliance inspection"
                        >
                            <DownloadIcon className="h-4 w-4 text-brand-400" />
                            Export Log (JSON)
                        </button>
                        <button 
                            onClick={onClose}
                            className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="p-4 md:p-5 border-b border-primary-300/20 bg-primary-200/30 flex flex-wrap gap-3 items-center justify-between">
                    <div className="relative flex-1 min-w-[240px]">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-400" />
                        <input 
                            type="text" 
                            placeholder="Search by clinician, patient ID, action, or details..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-primary-100/80 border border-primary-300/40 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-primary-500 focus:outline-none focus:border-brand-500 transition-colors"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select 
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="bg-primary-100/80 border border-primary-300/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                        >
                            <option value="ALL">All Actions ({entries.length})</option>
                            <option value="CREATE">Created</option>
                            <option value="UPDATE">Updated</option>
                            <option value="DELETE">Deleted</option>
                            <option value="DIAGNOSIS_GENERATED">Diagnosis Generated</option>
                            <option value="TREATMENT_CHANGED">Treatment Modified</option>
                            <option value="EXPORT">Document Exported</option>
                            <option value="SYNC">Synced to Cloud</option>
                        </select>
                        <button 
                            onClick={loadEntries}
                            className="p-2 bg-primary-100 hover:bg-primary-300/30 text-primary-300 rounded-xl border border-primary-300/30 transition-all"
                            title="Refresh Audit Records"
                        >
                            <ArrowPathIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Audit Entries List */}
                <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-2.5 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-primary-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent mb-3"></div>
                            <p className="text-xs">Loading secure audit trail records...</p>
                        </div>
                    ) : filteredEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-primary-400">
                            <DocumentTextIcon className="h-10 w-10 text-primary-500 mb-2" />
                            <p className="text-sm font-semibold text-white">No audit records found</p>
                            <p className="text-xs text-primary-500 mt-1">Actions performed will appear here with cryptographic timestamp.</p>
                        </div>
                    ) : (
                        filteredEntries.map((entry) => (
                            <div 
                                key={entry.id}
                                className="bg-primary-200/40 border border-primary-300/20 hover:border-primary-300/40 rounded-xl p-3 md:p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs"
                            >
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider shrink-0 mt-0.5 ${getActionBadgeColor(entry.action)}`}>
                                        {entry.action.replace('_', ' ')}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="font-semibold text-white text-xs">
                                                {entry.userName} ({entry.userRole})
                                            </span>
                                            <span className="text-[10px] text-primary-500 font-mono">
                                                ID: {entry.entityId.slice(0, 16)}
                                            </span>
                                            {entry.syncStatus === 'synced' ? (
                                                <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                    Cloud Synced
                                                </span>
                                            ) : (
                                                <span className="text-[9px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                                                    Local Storage
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-primary-300 text-xs">
                                            {entry.details || 'Operation completed.'}
                                        </p>
                                        {entry.fieldChanged && (
                                            <p className="text-[11px] text-primary-400 mt-1 font-mono">
                                                Field: <span className="text-brand-300">{entry.fieldChanged}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right shrink-0 text-[11px] text-primary-400 pl-11 md:pl-0 font-mono">
                                    {new Date(entry.timestamp).toLocaleString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-primary-300/20 bg-primary-200/30 flex flex-wrap justify-between items-center gap-3 text-xs text-primary-400">
                    <div>
                        Showing <span className="text-white font-bold">{filteredEntries.length}</span> of {entries.length} verified audit records
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExport}
                            className="sm:hidden text-brand-400 font-semibold"
                        >
                            Export Log
                        </button>
                        <button 
                            onClick={onClose}
                            className="px-5 py-2 bg-primary-100 hover:bg-primary-300/40 text-white rounded-xl font-semibold border border-primary-300/30 transition-all text-xs"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AuditTrailModal;
