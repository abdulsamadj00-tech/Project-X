import React, { useState } from 'react';
import { Encounter, Treatment, TreatmentChangeRecord } from '../types';
import { suggestTreatmentAlternatives } from '../services/geminiService';
import { toast } from 'sonner';

interface OngoingTreatmentManagerProps {
    encounter: Encounter;
    onUpdateEncounter: (encounter: Encounter) => void;
    onNext?: () => void;
}

const REASON_CATEGORIES = [
    'Renal / Hepatic Clearance',
    'Adverse Reaction / Allergy',
    'Treatment Failure / Deterioration',
    'Culture / Sensitivity Optimization',
    'Guideline Escalation',
    'Hemodynamic Shift'
] as const;

const OngoingTreatmentManager: React.FC<OngoingTreatmentManagerProps> = ({ encounter, onUpdateEncounter, onNext }) => {
    const [treatments, setTreatments] = useState<Treatment[]>(encounter.treatments || []);
    const [selectedTreatmentForChange, setSelectedTreatmentForChange] = useState<Treatment | null>(null);
    const [newDrugName, setNewDrugName] = useState<string>('');
    const [newDosage, setNewDosage] = useState<string>('');
    const [newRoute, setNewRoute] = useState<Treatment['route']>('Oral (PO)');
    const [newFrequency, setNewFrequency] = useState<Treatment['frequency']>('Once Daily (QD)');
    const [selectedReasonCategory, setSelectedReasonCategory] = useState<typeof REASON_CATEGORIES[number]>('Renal / Hepatic Clearance');
    const [changeRationale, setChangeRationale] = useState<string>('');
    const [isSuggestingAlternatives, setIsSuggestingAlternatives] = useState<boolean>(false);
    const [suggestedAlternatives, setSuggestedAlternatives] = useState<string[]>([]);
    const [suggestionRationale, setSuggestionRationale] = useState<string>('');

    // Add new medication state
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [addDrugName, setAddDrugName] = useState<string>('');
    const [addDosage, setAddDosage] = useState<string>('');
    const [addRoute, setAddRoute] = useState<Treatment['route']>('Oral (PO)');
    const [addFrequency, setAddFrequency] = useState<Treatment['frequency']>('Once Daily (QD)');
    const [addLine, setAddLine] = useState<Treatment['line']>('First-line');
    const [addRationale, setAddRationale] = useState<string>('');

    const handleOpenChangeModal = (treatment: Treatment) => {
        setSelectedTreatmentForChange(treatment);
        setNewDrugName(treatment.drugName);
        setNewDosage(treatment.dosage);
        setNewRoute(treatment.route || 'Oral (PO)');
        setNewFrequency(treatment.frequency || 'Once Daily (QD)');
        setSelectedReasonCategory('Renal / Hepatic Clearance');
        setChangeRationale('');
        setSuggestedAlternatives([]);
        setSuggestionRationale('');
    };

    const handleAskAlternatives = async () => {
        if (!selectedTreatmentForChange) return;
        setIsSuggestingAlternatives(true);
        try {
            const result = await suggestTreatmentAlternatives(
                selectedTreatmentForChange,
                encounter.patientData,
                selectedReasonCategory
            );
            setSuggestedAlternatives(result.alternatives || []);
            setSuggestionRationale(result.rationale || '');
            toast.success("AI alternative options generated.");
        } catch (e) {
            toast.error("Could not fetch alternative suggestions.");
        } finally {
            setIsSuggestingAlternatives(false);
        }
    };

    const handleSaveOptionChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTreatmentForChange || !newDrugName.trim()) return;

        const changeRecord: TreatmentChangeRecord = {
            id: `change-${Date.now()}`,
            timestamp: Date.now(),
            previousDrug: selectedTreatmentForChange.drugName,
            previousDosage: selectedTreatmentForChange.dosage,
            newDrug: newDrugName,
            newDosage: newDosage,
            reasonCategory: selectedReasonCategory,
            clinicalRationale: changeRationale || `Option changed due to ${selectedReasonCategory}`
        };

        const updated = treatments.map(t => {
            if (t.id === selectedTreatmentForChange.id) {
                const history = t.changeHistory || [];
                return {
                    ...t,
                    drugName: newDrugName,
                    dosage: newDosage,
                    route: newRoute,
                    frequency: newFrequency,
                    status: 'Active' as const,
                    changeHistory: [changeRecord, ...history]
                };
            }
            return t;
        });

        setTreatments(updated);
        onUpdateEncounter({ ...encounter, treatments: updated });
        setSelectedTreatmentForChange(null);
        toast.success(`Treatment updated: ${newDrugName} (${newDosage})`);
    };

    const handleStatusChange = (id: string, status: Treatment['status']) => {
        const updated = treatments.map(t => {
            if (t.id === id) {
                return {
                    ...t,
                    status,
                    isActive: status === 'Active' || status === 'Titrating'
                };
            }
            return t;
        });
        setTreatments(updated);
        onUpdateEncounter({ ...encounter, treatments: updated });
        toast.info(`Treatment status set to: ${status}`);
    };

    const handleAddTreatment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!addDrugName.trim()) return;

        const newTx: Treatment = {
            id: `tx-${Date.now()}`,
            drugName: addDrugName,
            dosage: addDosage,
            route: addRoute,
            frequency: addFrequency,
            duration: 'As clinically directed',
            line: addLine,
            source: 'Clinician-Decided',
            rationale: addRationale || 'Guideline-directed in-flight medical therapy',
            guidelineFollowed: true,
            isActive: true,
            status: 'Active',
            changeHistory: [],
            history: [{ date: Date.now(), reason: 'Initial prescription initiated' }]
        };

        const updated = [...treatments, newTx];
        setTreatments(updated);
        onUpdateEncounter({ ...encounter, treatments: updated });
        setIsAddModalOpen(false);
        setAddDrugName('');
        setAddDosage('');
        setAddRationale('');
        toast.success(`New therapy added: ${newTx.drugName}`);
    };

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-cyan-400 font-mono text-[11px] uppercase tracking-widest font-black">
                                In-Flight Clinical Pharmacotherapy & Regimen Management
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 text-xs font-mono">{treatments.length} Active Regimens</span>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-white font-display tracking-tight">
                            Ongoing Treatments & Option Changing
                        </h2>
                        <p className="text-xs md:text-sm text-slate-400 mt-1">
                            Adjust doses, switch therapeutic alternatives, log clinical change rationales, and audit prescription modifications.
                        </p>
                    </div>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-cyan-500/20 shrink-0"
                    >
                        + Add In-Flight Therapy
                    </button>
                </div>
            </div>

            {/* Treatments Cards Feed */}
            <div className="space-y-4">
                {treatments.length === 0 ? (
                    <div className="p-10 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400">
                        <p className="text-sm">No ongoing treatments currently configured for this patient case.</p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="mt-4 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold"
                        >
                            + Add First Treatment
                        </button>
                    </div>
                ) : (
                    treatments.map(t => {
                        const status = t.status || (t.isActive ? 'Active' : 'Completed');
                        const changeHistory = t.changeHistory || [];
                        return (
                            <div
                                key={t.id}
                                className={`p-6 rounded-2xl border transition-all ${
                                    status === 'Active'
                                        ? 'bg-slate-900/70 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                                        : status === 'Titrating'
                                        ? 'bg-slate-900/70 border-amber-500/40'
                                        : status === 'Paused'
                                        ? 'bg-slate-900/50 border-yellow-500/30'
                                        : 'bg-slate-900/40 border-slate-800 opacity-80'
                                }`}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                                                t.line === 'First-line'
                                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                                                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                                            }`}>
                                                {t.line}
                                            </span>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                                                status === 'Active'
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                                    : status === 'Titrating'
                                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                                    : status === 'Paused'
                                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                                                    : 'bg-slate-800 text-slate-400'
                                            }`}>
                                                ● {status}
                                            </span>
                                            {t.route && (
                                                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                                                    {t.route}
                                                </span>
                                            )}
                                            {t.frequency && (
                                                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                                                    {t.frequency}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-baseline gap-3">
                                            <h3 className="text-xl font-bold text-white tracking-tight">
                                                {t.drugName}
                                            </h3>
                                            <span className="text-base font-black font-mono text-cyan-400">
                                                {t.dosage}
                                            </span>
                                        </div>

                                        <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                                            {t.rationale}
                                        </p>

                                        {/* Change History Audit Trail */}
                                        {changeHistory.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
                                                <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                                    <span>🔄</span>
                                                    <span>Option Change History ({changeHistory.length} Modifications):</span>
                                                </div>
                                                {changeHistory.map((rec, i) => (
                                                    <div key={i} className="text-xs p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 flex flex-col gap-1">
                                                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                                                            <span className="text-amber-400 font-bold">Reason: {rec.reasonCategory}</span>
                                                            <span>{new Date(rec.timestamp).toLocaleTimeString()}</span>
                                                        </div>
                                                        <div>
                                                            <span className="line-through text-slate-500">{rec.previousDrug} ({rec.previousDosage})</span>
                                                            <span className="mx-2 text-cyan-400">➔</span>
                                                            <span className="font-bold text-white">{rec.newDrug} ({rec.newDosage})</span>
                                                        </div>
                                                        {rec.clinicalRationale && (
                                                            <div className="text-[11px] text-slate-400 italic">
                                                                "{rec.clinicalRationale}"
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Controls */}
                                    <div className="flex flex-wrap lg:flex-col items-end gap-2.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenChangeModal(t)}
                                            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
                                        >
                                            <span>🔄</span> Change Option / Adjust Dose
                                        </button>

                                        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange(t.id, 'Active')}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                                    status === 'Active' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-500 hover:text-emerald-400'
                                                }`}
                                            >
                                                Active
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange(t.id, 'Titrating')}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                                    status === 'Titrating' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-500 hover:text-amber-400'
                                                }`}
                                            >
                                                Titrate
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange(t.id, 'Paused')}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                                    status === 'Paused' ? 'bg-yellow-500 text-slate-950 font-black' : 'text-slate-500 hover:text-yellow-400'
                                                }`}
                                            >
                                                Pause
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleStatusChange(t.id, 'Discontinued')}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                                    status === 'Discontinued' ? 'bg-rose-500 text-slate-950 font-black' : 'text-slate-500 hover:text-rose-400'
                                                }`}
                                            >
                                                Stop
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Option Changing Modal */}
            {selectedTreatmentForChange && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-xl w-full space-y-6 shadow-2xl my-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                                    Clinical Change & Dose Adjustment Protocol
                                </span>
                                <h3 className="text-xl font-bold text-white">Change Medication Option</h3>
                            </div>
                            <button onClick={() => setSelectedTreatmentForChange(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        {/* Current Regimen Summary */}
                        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                            <span className="text-slate-500">Current Regimen:</span> <strong className="text-white">{selectedTreatmentForChange.drugName}</strong> ({selectedTreatmentForChange.dosage})
                        </div>

                        {/* AI Alternative Suggestions Assistant */}
                        <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                                    <span>💡</span> AI Guideline Alternative Advisor
                                </span>
                                <button
                                    type="button"
                                    onClick={handleAskAlternatives}
                                    disabled={isSuggestingAlternatives}
                                    className="text-[10px] font-black uppercase tracking-wider bg-cyan-500 text-slate-950 px-3 py-1.5 rounded-lg hover:bg-cyan-400 active:scale-95 transition-all"
                                >
                                    {isSuggestingAlternatives ? 'Consulting...' : 'Suggest Alternatives'}
                                </button>
                            </div>

                            {suggestedAlternatives.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-cyan-800/40">
                                    <div className="text-[11px] text-slate-300 italic">{suggestionRationale}</div>
                                    <div className="space-y-1">
                                        {suggestedAlternatives.map((alt, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    const parts = alt.split('(');
                                                    setNewDrugName(parts[0].trim());
                                                    if (parts[1]) setNewDosage(parts[1].replace(')', '').trim());
                                                    toast.success("Applied alternative option.");
                                                }}
                                                className="w-full text-left p-2.5 rounded-xl bg-slate-900 hover:bg-cyan-950/60 border border-cyan-700/50 text-cyan-200 text-xs font-medium flex items-center justify-between group transition-colors"
                                            >
                                                <span>✓ {alt}</span>
                                                <span className="text-[10px] uppercase font-bold text-cyan-400 opacity-0 group-hover:opacity-100">Apply</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSaveOptionChange} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Structured Clinical Reason for Change
                                </label>
                                <select
                                    value={selectedReasonCategory}
                                    onChange={(e) => setSelectedReasonCategory(e.target.value as any)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs font-bold"
                                >
                                    {REASON_CATEGORIES.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        New Medication Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newDrugName}
                                        onChange={(e) => setNewDrugName(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        New Dosage & Frequency
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newDosage}
                                        onChange={(e) => setNewDosage(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Route</label>
                                    <select
                                        value={newRoute}
                                        onChange={(e) => setNewRoute(e.target.value as any)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                    >
                                        <option value="Oral (PO)">Oral (PO)</option>
                                        <option value="Intravenous (IV)">Intravenous (IV)</option>
                                        <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
                                        <option value="Sublingual (SL)">Sublingual (SL)</option>
                                        <option value="Inhalation">Inhalation</option>
                                        <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                                        <option value="Topical">Topical</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Frequency</label>
                                    <select
                                        value={newFrequency}
                                        onChange={(e) => setNewFrequency(e.target.value as any)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                    >
                                        <option value="Once Daily (QD)">Once Daily (QD)</option>
                                        <option value="Twice Daily (BID)">Twice Daily (BID)</option>
                                        <option value="Three Times Daily (TID)">Three Times Daily (TID)</option>
                                        <option value="Four Times Daily (QID)">Four Times Daily (QID)</option>
                                        <option value="Every 8 Hours (q8h)">Every 8 Hours (q8h)</option>
                                        <option value="Every 12 Hours (q12h)">Every 12 Hours (q12h)</option>
                                        <option value="Continuous Infusion">Continuous Infusion</option>
                                        <option value="STAT / Once">STAT / Once</option>
                                        <option value="PRN (As Needed)">PRN (As Needed)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Clinical Justification & Notes
                                </label>
                                <textarea
                                    rows={3}
                                    value={changeRationale}
                                    onChange={(e) => setChangeRationale(e.target.value)}
                                    placeholder="e.g. Switched to IV formulation due to worsening hemodynamic intolerance..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                <button type="button" onClick={() => setSelectedTreatmentForChange(null)} className="px-4 py-2 text-xs text-slate-400">Cancel</button>
                                <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20">
                                    Commit Option Change
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add In-Flight Treatment Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Add In-Flight Treatment Regimen</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleAddTreatment} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Medication Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={addDrugName}
                                        onChange={(e) => setAddDrugName(e.target.value)}
                                        placeholder="e.g. Enoxaparin Sodium"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Starting Dosage</label>
                                    <input
                                        type="text"
                                        required
                                        value={addDosage}
                                        onChange={(e) => setAddDosage(e.target.value)}
                                        placeholder="e.g. 1 mg/kg SC q12h"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Route</label>
                                    <select
                                        value={addRoute}
                                        onChange={(e) => setAddRoute(e.target.value as any)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                    >
                                        <option value="Oral (PO)">Oral (PO)</option>
                                        <option value="Intravenous (IV)">Intravenous (IV)</option>
                                        <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
                                        <option value="Sublingual (SL)">Sublingual (SL)</option>
                                        <option value="Inhalation">Inhalation</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Line</label>
                                    <select
                                        value={addLine}
                                        onChange={(e) => setAddLine(e.target.value as any)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                    >
                                        <option value="First-line">First-line</option>
                                        <option value="Second-line">Second-line</option>
                                        <option value="Supportive">Supportive</option>
                                        <option value="Empirical">Empirical</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Clinical Rationale</label>
                                <textarea
                                    rows={3}
                                    value={addRationale}
                                    onChange={(e) => setAddRationale(e.target.value)}
                                    placeholder="Indication, guideline alignment, target endpoints..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs text-slate-400">Cancel</button>
                                <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider">Start Therapy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {onNext && (
                <div className="flex justify-end pt-4">
                    <button
                        onClick={onNext}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-8 py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center gap-2"
                    >
                        Proceed to Next Recommendations AI Discussion ➔
                    </button>
                </div>
            )}
        </div>
    );
};

export default OngoingTreatmentManager;
