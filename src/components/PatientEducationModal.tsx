import React, { useState } from 'react';
import { Encounter } from '../types';
import { buildPatientEducation } from '../services/fhirAndEducationService';
import { toast } from 'sonner';

interface PatientEducationModalProps {
    encounter: Encounter;
    onClose: () => void;
}

const LANGUAGES = [
    { id: 'English', label: 'English' },
    { id: 'Spanish', label: 'Español (Spanish)' },
    { id: 'Urdu', label: 'اردو (Urdu)' },
    { id: 'Arabic', label: 'العربية (Arabic)' }
];

export const PatientEducationModal: React.FC<PatientEducationModalProps> = ({
    encounter,
    onClose
}) => {
    const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
    const doc = buildPatientEducation(encounter, selectedLanguage);

    const handleCopy = () => {
        const text = `
PATIENT DISCHARGE & AFTERCARE INSTRUCTIONS
Condition: ${doc.conditionName}

SUMMARY:
${doc.simpleSummary}

MEDICATIONS:
${doc.whyPrescribedMedications.map(m => `- ${m.drug}: ${m.howToTake}\n  Why: ${m.purpose}`).join('\n')}

EMERGENCY RED FLAGS:
${doc.redFlagSigns.map(s => `⚠️ ${s}`).join('\n')}

EMERGENCY ADVICE:
${doc.whatToDoInEmergency}

LIFESTYLE ADVICE:
${doc.lifestyleAndDietAdvice.map(a => `• ${a}`).join('\n')}

FOLLOW-UP:
${doc.followUpPlan}
        `.trim();

        navigator.clipboard.writeText(text);
        toast.success("Patient instructions copied to clipboard.");
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                6th-Grade Reading Level • Multilingual
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight mt-0.5">
                            Patient-Friendly Aftercare Instructions
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                    >
                        ✕
                    </button>
                </div>

                {/* Language Switcher Bar */}
                <div className="flex items-center gap-2 p-3 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto scrollbar-hide shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-500 mr-2">Language:</span>
                    {LANGUAGES.map(lang => (
                        <button
                            key={lang.id}
                            type="button"
                            onClick={() => setSelectedLanguage(lang.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                selectedLanguage === lang.id
                                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>

                {/* Printable Document Body */}
                <div className="p-5 sm:p-8 overflow-y-auto space-y-6 flex-1 text-slate-200">
                    {/* Condition Title */}
                    <div className="p-6 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                            Your Condition
                        </div>
                        <h3 className="text-2xl font-black text-white font-display">
                            {doc.conditionName}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            {doc.simpleSummary}
                        </p>
                    </div>

                    {/* Medications & Why Prescribed */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                            💊 Your Medicines & Why You Are Taking Them
                        </h4>
                        <div className="grid grid-cols-1 gap-2.5">
                            {doc.whyPrescribedMedications.map((m, idx) => (
                                <div key={idx} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-bold text-white text-sm">{m.drug}</span>
                                        <span className="text-xs font-mono text-cyan-400">{m.howToTake}</span>
                                    </div>
                                    <p className="text-xs text-slate-300">
                                        <strong>Why:</strong> {m.purpose}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Emergency Red Flags */}
                    <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/60 text-rose-200 space-y-3">
                        <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-wider">
                            <span>🚨</span>
                            <span>Warning Signs: When to Seek Immediate Emergency Care</span>
                        </div>
                        <ul className="space-y-2 text-xs">
                            {doc.redFlagSigns.map((rf, idx) => (
                                <li key={idx} className="flex items-start gap-2.5">
                                    <span className="text-rose-400 font-bold shrink-0 mt-0.5">⚠️</span>
                                    <span>{rf}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="pt-2 border-t border-rose-800/40 text-xs font-bold text-white">
                            {doc.whatToDoInEmergency}
                        </div>
                    </div>

                    {/* Lifestyle & Follow-Up */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                🥗 Daily Care & Lifestyle
                            </h5>
                            <ul className="space-y-1.5 text-xs text-slate-300">
                                {doc.lifestyleAndDietAdvice.map((a, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-emerald-400 font-bold">✓</span>
                                        <span>{a}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                            <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                📅 Next Doctor Appointment
                            </h5>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                {doc.followUpPlan}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
                    <span className="text-[11px] text-slate-500">
                        Patient: {encounter.patientData.name || 'Patient'} ({encounter.patientData.age}yo)
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl transition-all"
                        >
                            📋 Copy Text
                        </button>
                        <button
                            onClick={handlePrint}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider px-5 py-2 rounded-xl transition-all active:scale-95 shadow-md shadow-emerald-500/20"
                        >
                            🖨️ Print Instructions
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
