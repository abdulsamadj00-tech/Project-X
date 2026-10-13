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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                                HL7 FHIR R4 Hospital Interoperability
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight mt-0.5">
                            FHIR Medical Data Export Bundle
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                    >
                        ✕
                    </button>
                </div>

                {/* Subheader Details */}
                <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-400">Resource: Bundle (document)</span>
                        <span>•</span>
                        <span>{bundle.entry?.length || 0} FHIR Resources Included (Patient, Encounter, Conditions, Observations, MedicationRequests)</span>
                    </div>
                    <span className="text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded">
                        Epic / Cerner Compatible
                    </span>
                </div>

                {/* JSON Display */}
                <div className="p-5 overflow-y-auto flex-1 bg-slate-950/90 font-mono text-xs text-slate-300">
                    <pre className="whitespace-pre leading-relaxed scrollbar-hide">
                        {jsonString}
                    </pre>
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
                    <button
                        onClick={onClose}
                        className="text-xs font-bold text-slate-400 hover:text-white"
                    >
                        Close
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl transition-all"
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
