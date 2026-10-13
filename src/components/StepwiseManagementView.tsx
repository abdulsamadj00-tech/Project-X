import React, { useState, useEffect } from 'react';
import { Encounter, ManagementStep } from '../types';
import { generateStepwiseManagement } from '../services/geminiService';
import { toast } from 'sonner';

interface StepwiseManagementViewProps {
    encounter: Encounter;
    onUpdateEncounter: (encounter: Encounter) => void;
    onNext?: () => void;
}

const PHASES = [
    { phase: 1, title: 'Phase 1: Immediate Stabilization & Resuscitation (0–15 min)', color: 'from-rose-500/20 to-rose-600/5', border: 'border-rose-500/30', badge: 'text-rose-400 bg-rose-500/10' },
    { phase: 2, title: 'Phase 2: Rapid Diagnostic Workup & Biomarkers (15–60 min)', color: 'from-amber-500/20 to-amber-600/5', border: 'border-amber-500/30', badge: 'text-amber-400 bg-amber-500/10' },
    { phase: 3, title: 'Phase 3: Targeted Pharmacotherapy & Protocol Interventions (1–4 hrs)', color: 'from-cyan-500/20 to-cyan-600/5', border: 'border-cyan-500/30', badge: 'text-cyan-400 bg-cyan-500/10' },
    { phase: 4, title: 'Phase 4: In-Hospital Monitoring & Escalation Triggers (4–24 hrs)', color: 'from-indigo-500/20 to-indigo-600/5', border: 'border-indigo-500/30', badge: 'text-indigo-400 bg-indigo-500/10' },
    { phase: 5, title: 'Phase 5: Post-Acute Secondary Prevention & Disposition (24+ hrs)', color: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/30', badge: 'text-emerald-400 bg-emerald-500/10' }
];

const StepwiseManagementView: React.FC<StepwiseManagementViewProps> = ({ encounter, onUpdateEncounter, onNext }) => {
    const [steps, setSteps] = useState<ManagementStep[]>(encounter.stepwisePlan || []);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [filterPhase, setFilterPhase] = useState<number | 'all'>('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [newStep, setNewStep] = useState<{
        phase: 1 | 2 | 3 | 4 | 5;
        title: string;
        description: string;
        priority: 'STAT / Critical' | 'Urgent' | 'Standard' | 'Conditional';
        guidelineRef: string;
    }>({
        phase: 1,
        title: '',
        description: '',
        priority: 'Standard',
        guidelineRef: ''
    });

    useEffect(() => {
        if (!encounter.stepwisePlan || encounter.stepwisePlan.length === 0) {
            handleAutoGenerate();
        }
    }, [encounter.patientData, encounter.provisionalDiagnoses]);

    const handleAutoGenerate = async () => {
        setIsGenerating(true);
        try {
            const generated = await generateStepwiseManagement(
                encounter.patientData,
                encounter.finalDiagnosis || encounter.provisionalDiagnoses?.[0]
            );
            setSteps(generated);
            onUpdateEncounter({ ...encounter, stepwisePlan: generated });
            toast.success("Evidence-based stepwise clinical pathway generated.");
        } catch (e) {
            toast.error("Failed to generate stepwise plan.");
        } finally {
            setIsGenerating(false);
        }
    };

    const updateStepStatus = (id: string, status: 'Pending' | 'In Progress' | 'Completed') => {
        const updated = steps.map(s => {
            if (s.id === id) {
                return {
                    ...s,
                    status,
                    completedAt: status === 'Completed' ? Date.now() : undefined
                };
            }
            return s;
        });
        setSteps(updated);
        onUpdateEncounter({ ...encounter, stepwisePlan: updated });
    };

    const handleAddStep = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStep.title.trim()) return;

        const phaseMeta = PHASES.find(p => p.phase === newStep.phase);
        const item: ManagementStep = {
            id: `custom-step-${Date.now()}`,
            phase: newStep.phase,
            phaseTitle: phaseMeta?.title || `Phase ${newStep.phase}`,
            title: newStep.title,
            description: newStep.description,
            priority: newStep.priority,
            status: 'Pending',
            guidelineRef: newStep.guidelineRef || 'Clinician Custom Milestone'
        };

        const updated = [...steps, item];
        setSteps(updated);
        onUpdateEncounter({ ...encounter, stepwisePlan: updated });
        setIsAddModalOpen(false);
        setNewStep({ phase: 1, title: '', description: '', priority: 'Standard', guidelineRef: '' });
        toast.success("Custom management step added.");
    };

    const totalSteps = steps.length;
    const completedSteps = steps.filter(s => s.status === 'Completed').length;
    const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    const filteredSteps = filterPhase === 'all' ? steps : steps.filter(s => s.phase === filterPhase);

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Pathway Overview Header */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-cyan-400 font-mono text-[11px] uppercase tracking-widest font-black">
                                Evidence-Based Stepwise Care Protocol
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 text-xs">5 Sequential Clinical Phases</span>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-white font-display tracking-tight">
                            Stepwise Clinical Pathway
                        </h2>
                        <p className="text-xs md:text-sm text-slate-400 mt-1">
                            Targeted protocol for <strong className="text-white">{encounter.finalDiagnosis?.diagnosisName || encounter.provisionalDiagnoses?.[0]?.diagnosisName || encounter.patientData.primaryComplaint}</strong>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                        >
                            + Add Custom Step
                        </button>
                        <button
                            onClick={handleAutoGenerate}
                            disabled={isGenerating}
                            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isGenerating ? 'Generating...' : 'AI Re-Align Pathway'}
                        </button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                        <span className="text-slate-300">Overall Pathway Adherence & Execution</span>
                        <span className="text-cyan-400 font-mono">{completedSteps} of {totalSteps} Complete ({progressPercent}%)</span>
                    </div>
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500 shadow-lg shadow-cyan-500/50"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>

                {/* Phase Filter Tabs */}
                <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => setFilterPhase('all')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                            filterPhase === 'all'
                                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                                : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-white'
                        }`}
                    >
                        All Phases ({steps.length})
                    </button>
                    {PHASES.map(p => {
                        const count = steps.filter(s => s.phase === p.phase).length;
                        return (
                            <button
                                key={p.phase}
                                onClick={() => setFilterPhase(p.phase)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                                    filterPhase === p.phase
                                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                                        : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-white'
                                }`}
                            >
                                Phase {p.phase} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Steps Timeline Feed */}
            <div className="space-y-4">
                {filteredSteps.map((step) => {
                    const phaseMeta = PHASES.find(p => p.phase === step.phase) || PHASES[0];
                    return (
                        <div
                            key={step.id}
                            className={`p-5 md:p-6 rounded-2xl border transition-all ${
                                step.status === 'Completed'
                                    ? 'bg-slate-900/40 border-emerald-500/30 opacity-90'
                                    : step.status === 'In Progress'
                                    ? 'bg-slate-900/80 border-cyan-500/50 shadow-lg shadow-cyan-500/5'
                                    : 'bg-slate-900/60 border-slate-800'
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${phaseMeta.badge}`}>
                                            Phase {step.phase}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                            step.priority === 'STAT / Critical'
                                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                                : step.priority === 'Urgent'
                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                : 'bg-slate-800 text-slate-300'
                                        }`}>
                                            {step.priority}
                                        </span>
                                        {step.guidelineRef && (
                                            <span className="text-[10px] text-slate-400 italic">
                                                📜 {step.guidelineRef}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className={`text-base md:text-lg font-bold ${
                                        step.status === 'Completed' ? 'text-slate-300 line-through' : 'text-white'
                                    }`}>
                                        {step.title}
                                    </h3>

                                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                                        {step.description}
                                    </p>

                                    {step.completedAt && (
                                        <div className="text-[11px] text-emerald-400 font-mono">
                                            ✓ Completed at {new Date(step.completedAt).toLocaleTimeString()}
                                        </div>
                                    )}
                                </div>

                                {/* Status Toggle Buttons */}
                                <div className="flex items-center gap-1.5 shrink-0 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 self-start">
                                    <button
                                        type="button"
                                        onClick={() => updateStepStatus(step.id, 'Pending')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                            step.status === 'Pending'
                                                ? 'bg-slate-800 text-white font-black'
                                                : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                    >
                                        Pending
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateStepStatus(step.id, 'In Progress')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                            step.status === 'In Progress'
                                                ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                                                : 'text-slate-500 hover:text-cyan-400'
                                        }`}
                                    >
                                        Active
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateStepStatus(step.id, 'Completed')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                            step.status === 'Completed'
                                                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                                                : 'text-slate-500 hover:text-emerald-400'
                                        }`}
                                    >
                                        Done ✓
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Custom Step Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Add Custom Clinical Milestone</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleAddStep} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Phase</label>
                                <select
                                    value={newStep.phase}
                                    onChange={(e) => setNewStep({ ...newStep, phase: parseInt(e.target.value) as any })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                >
                                    {PHASES.map(p => (
                                        <option key={p.phase} value={p.phase}>{p.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Step Title</label>
                                <input
                                    type="text"
                                    required
                                    value={newStep.title}
                                    onChange={(e) => setNewStep({ ...newStep, title: e.target.value })}
                                    placeholder="e.g. Draw Repeat Lactate at 2 hours"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Clinical Instructions</label>
                                <textarea
                                    rows={3}
                                    value={newStep.description}
                                    onChange={(e) => setNewStep({ ...newStep, description: e.target.value })}
                                    placeholder="Detailed clinical rationale, dosage, or measurement parameters..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Priority</label>
                                    <select
                                        value={newStep.priority}
                                        onChange={(e) => setNewStep({ ...newStep, priority: e.target.value as any })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                    >
                                        <option value="STAT / Critical">STAT / Critical</option>
                                        <option value="Urgent">Urgent</option>
                                        <option value="Standard">Standard</option>
                                        <option value="Conditional">Conditional</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Guideline Reference</label>
                                    <input
                                        type="text"
                                        value={newStep.guidelineRef}
                                        onChange={(e) => setNewStep({ ...newStep, guidelineRef: e.target.value })}
                                        placeholder="e.g. 2023 ESC Guidelines"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs text-slate-400">Cancel</button>
                                <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider">Save Step</button>
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
                        Proceed to Lab & Test Trackers ➔
                    </button>
                </div>
            )}
        </div>
    );
};

export default StepwiseManagementView;
