import React from 'react';
import { Encounter } from '../types';
import { generateFHIRR4Bundle } from '../services/fhirAndEducationService';
import { toast } from 'sonner';

interface FHIRExportModalProps {
    encounter: Encounter;
    onClose: () => void;
}

export const FHIRExportModal: React.FC<FHIRExportModalProps> = ({
    encounter,
    onClose
}) => {
    const bundle = generateFHIRR4Bundle(encounter);
    const jsonString = JSON.stringify(bundle, null, 2);

    const handleCopy = () => {
        navigator.clipboard.writeText(jsonString);
        toast.success("HL7 FHIR R4 Bundle JSON copied to clipboard.");
    };

    const handleDownload = () => {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FHIR-Bundle-${encounter.patientData.name ? encounter.patientData.name.replace(/\s+/g, '_') : 'Patient'}-${encounter.id.slice(0, 8)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("FHIR Bundle downloaded.");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="bg-primary-100 border border-primary-300/40 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-primary-900">
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-primary-300/30 flex items-center justify-between bg-primary-100/95 shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                                HL7 FHIR R4 Hospital Interoperability
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-primary-900 font-display tracking-tight mt-0.5">
                            FHIR Medical Data Export Bundle
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-primary-200/60 text-primary-400 hover:text-primary-900 hover:bg-primary-300/60 border border-primary-300/30 flex items-center justify-center transition-all"
                    >
                        ✕
                    </button>
                </div>

                {/* Subheader Details */}
                <div className="px-6 py-3 bg-primary-200/40 border-b border-primary-300/30 flex flex-wrap items-center justify-between gap-3 text-xs text-primary-600 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-700 dark:text-cyan-300">Resource: Bundle (document)</span>
                        <span>•</span>
                        <span>{bundle.entry?.length || 0} FHIR Resources Included (Patient, Encounter, Conditions, Observations, MedicationRequests)</span>
                    </div>
                    <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-bold">
                        Epic / Cerner Compatible
                    </span>
                </div>

                {/* JSON Display */}
                <div className="p-5 overflow-y-auto flex-1 bg-primary-200/25 font-mono text-xs text-primary-800">
                    <pre className="whitespace-pre leading-relaxed scrollbar-hide font-mono">
                        {jsonString}
                    </pre>
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-primary-300/30 bg-primary-200/40 flex items-center justify-between shrink-0">
                    <button
                        onClick={onClose}
                        className="text-xs font-bold text-primary-500 hover:text-primary-900 px-3 py-1.5 transition-colors"
                    >
                        Close
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="bg-primary-200 hover:bg-primary-300/60 text-primary-900 border border-primary-300/40 text-xs font-bold px-4 py-2 rounded-xl transition-all"
                        >
                            📋 Copy JSON
                        </button>
                        <button
                            onClick={handleDownload}
                            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider px-5 py-2 rounded-xl transition-all active:scale-95 shadow-md shadow-cyan-500/20"
                        >
                            💾 Download .json Bundle
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
