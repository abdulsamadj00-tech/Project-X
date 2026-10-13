
import React, { useState, useEffect } from 'react';
import { Treatment, MedicationSuggestion } from '../types';
import { XCircleIcon, CheckCircleIcon } from './icons';

interface TreatmentModalProps {
    onClose: () => void;
    onSave: (treatment: Treatment) => void;
    suggestion?: MedicationSuggestion;
    initialTreatment?: Treatment;
}

const TreatmentModal: React.FC<TreatmentModalProps> = ({ onClose, onSave, suggestion, initialTreatment }) => {
    const [drugName, setDrugName] = useState(suggestion?.drugName || initialTreatment?.drugName || '');
    const [dosage, setDosage] = useState(suggestion?.dosage || initialTreatment?.dosage || '');
    const [duration, setDuration] = useState(initialTreatment?.duration || '');
    const [line, setLine] = useState<Treatment['line']>(suggestion?.line || initialTreatment?.line || 'First-line');
    const [rationale, setRationale] = useState(suggestion?.rationale || initialTreatment?.rationale || '');
    const [deviationReason, setDeviationReason] = useState(initialTreatment?.deviationReason || '');
    const [isGuidelineFollowed, setIsGuidelineFollowed] = useState(true);

    useEffect(() => {
        if (suggestion) {
            const followed = drugName === suggestion.drugName && dosage === suggestion.dosage;
            setIsGuidelineFollowed(followed);
        } else if (!initialTreatment || initialTreatment.source === 'Clinician-Decided') {
            setIsGuidelineFollowed(false);
        }
    }, [drugName, dosage, suggestion, initialTreatment]);

    const handleSave = () => {
        if (!drugName || !dosage || !duration) {
            alert("Please fill in all required fields.");
            return;
        }

        if (!isGuidelineFollowed && !deviationReason) {
            alert("Please provide a reason for deviating from guidelines or for this manual entry.");
            return;
        }

        const treatment: Treatment = {
            id: initialTreatment?.id || `tx-${Date.now()}`,
            drugName,
            dosage,
            duration,
            line,
            source: suggestion ? 'AI-Recommended' : 'Clinician-Decided',
            rationale,
            guidelineFollowed: isGuidelineFollowed,
            deviationReason: isGuidelineFollowed ? undefined : deviationReason,
            isActive: initialTreatment ? initialTreatment.isActive : true,
            history: initialTreatment?.history || [],
        };

        onSave(treatment);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-primary-100 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
                <div className="bg-brand-600 p-8 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black text-white tracking-tight font-display">
                            {initialTreatment ? 'Edit Treatment' : 'Add Treatment'}
                        </h3>
                        <p className="text-brand-100 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 opacity-80">
                            {suggestion ? 'AI-Optimized Protocol' : 'Clinician-Directed Entry'}
                        </p>
                    </div>
                    <button onClick={onClose} className="bg-primary-100/10 hover:bg-primary-100/20 p-2 rounded-xl text-white transition-all active:scale-90 relative z-10">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-10 space-y-8">
                    <div className="grid grid-cols-1 gap-8">
                        <div className="group">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Drug Name</label>
                            <input 
                                type="text" 
                                value={drugName} 
                                onChange={(e) => setDrugName(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-bold text-slate-900 transition-all placeholder:text-slate-300"
                                placeholder="e.g. Amoxicillin"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Dosage</label>
                                <input 
                                    type="text" 
                                    value={dosage} 
                                    onChange={(e) => setDosage(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-bold text-slate-900 transition-all placeholder:text-slate-300"
                                    placeholder="500mg TID"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Duration</label>
                                <input 
                                    type="text" 
                                    value={duration} 
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-bold text-slate-900 transition-all placeholder:text-slate-300"
                                    placeholder="7 days"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Line of Treatment</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['First-line', 'Second-line', 'Empirical', 'Combination', 'Supportive'].map((l) => (
                                    <button
                                        key={l}
                                        type="button"
                                        onClick={() => setLine(l as any)}
                                        className={`px-3 py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border ${
                                            line === l 
                                            ? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-500/20' 
                                            : 'bg-primary-100 text-slate-400 border-slate-100 hover:border-brand-200'
                                        }`}
                                    >
                                        {l.split('-')[0]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Rationale</label>
                            <textarea 
                                value={rationale} 
                                onChange={(e) => setRationale(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-bold text-slate-900 transition-all placeholder:text-slate-300 resize-none"
                                rows={2}
                                placeholder="Clinical reasoning for this medication..."
                            />
                        </div>

                        {!isGuidelineFollowed && (
                            <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] animate-in fade-in slide-in-from-top-2">
                                <label className="block text-[10px] font-bold text-amber-600 uppercase tracking-[0.2em] mb-3 ml-1">Reason for Deviation / Manual Entry</label>
                                <textarea 
                                    value={deviationReason} 
                                    onChange={(e) => setDeviationReason(e.target.value)}
                                    className="w-full px-6 py-4 bg-primary-100 border border-amber-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none font-bold text-slate-900 transition-all placeholder:text-amber-200 resize-none"
                                    rows={2}
                                    placeholder="Explain why guidelines are not being followed..."
                                    required
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button 
                            onClick={onClose}
                            className="flex-1 px-8 py-5 bg-slate-50 text-slate-400 font-bold rounded-2xl hover:bg-slate-100 transition-all text-xs uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave}
                            className="flex-1 px-8 py-5 bg-brand-600 text-white font-bold rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition-all active:scale-95 flex items-center justify-center gap-3 text-xs uppercase tracking-widest"
                        >
                            <CheckCircleIcon className="h-5 w-5" />
                            Confirm Plan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TreatmentModal;

