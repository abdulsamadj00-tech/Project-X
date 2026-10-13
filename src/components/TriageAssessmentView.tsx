import React, { useState, useEffect } from 'react';
import { Encounter, TriageAssessment, TriageLevel } from '../types';
import { calculateTriageAcuity } from '../services/geminiService';
import { toast } from 'sonner';

interface TriageAssessmentViewProps {
    encounter: Encounter;
    onUpdateEncounter: (encounter: Encounter) => void;
    onNext?: () => void;
}

const TRIAGE_LEVELS: {
    level: TriageLevel;
    name: string;
    subtext: string;
    targetTime: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    dotColor: string;
}[] = [
    {
        level: 1,
        name: 'Level 1: Resuscitation',
        subtext: 'Immediate Life-Saving Intervention Required',
        targetTime: 'Immediate (0 min)',
        badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
        badgeText: 'text-rose-500',
        borderColor: 'border-rose-500/50',
        dotColor: 'bg-rose-500 animate-ping'
    },
    {
        level: 2,
        name: 'Level 2: Emergent',
        subtext: 'High-Risk / Acute Pain / Danger Vitals / Chest Pain',
        targetTime: '< 15 mins',
        badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        badgeText: 'text-amber-500',
        borderColor: 'border-amber-500/50',
        dotColor: 'bg-amber-500'
    },
    {
        level: 3,
        name: 'Level 3: Urgent',
        subtext: 'Stable Vitals, Multiple Hospital Resources (2+)',
        targetTime: '< 60 mins',
        badgeBg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
        badgeText: 'text-yellow-500',
        borderColor: 'border-yellow-500/50',
        dotColor: 'bg-yellow-500'
    },
    {
        level: 4,
        name: 'Level 4: Less Urgent',
        subtext: 'Single Focused Diagnostic or Therapeutic Resource',
        targetTime: '< 120 mins',
        badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        badgeText: 'text-emerald-500',
        borderColor: 'border-emerald-500/50',
        dotColor: 'bg-emerald-500'
    },
    {
        level: 5,
        name: 'Level 5: Non-Urgent',
        subtext: 'Examination & Prescription Only (0 Resources)',
        targetTime: '< 240 mins',
        badgeBg: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
        badgeText: 'text-sky-500',
        borderColor: 'border-sky-500/50',
        dotColor: 'bg-sky-500'
    }
];

const COMMON_RED_FLAGS = [
    "Acute retrosternal chest pressure / radiation to left arm or jaw",
    "Diaphoresis, syncope, or acute dyspnea with chest discomfort",
    "Focal neurological deficit / suspected acute ischemic stroke (FAST+)",
    "Compromised airway, stridor, or severe accessory muscle use",
    "Severe systemic infection / suspected sepsis with hypotension",
    "Active acute hemorrhage or pulsatile abdominal mass",
    "Severe acute pain score >= 8/10 refractory to rest"
];

const TriageAssessmentView: React.FC<TriageAssessmentViewProps> = ({ encounter, onUpdateEncounter, onNext }) => {
    const currentTriage = encounter.triage || calculateTriageAcuity(encounter.patientData);
    const [triage, setTriage] = useState<TriageAssessment>(currentTriage);
    const [isRecalculating, setIsRecalculating] = useState<boolean>(false);

    useEffect(() => {
        if (!encounter.triage) {
            const initial = calculateTriageAcuity(encounter.patientData);
            setTriage(initial);
            onUpdateEncounter({ ...encounter, triage: initial });
        }
    }, [encounter.patientData]);

    const handleSaveTriage = (updated: TriageAssessment) => {
        setTriage(updated);
        onUpdateEncounter({ ...encounter, triage: updated });
    };

    const handleLevelSelect = (level: TriageLevel) => {
        const updated = calculateTriageAcuity(encounter.patientData, {
            ...triage,
            level
        });
        handleSaveTriage(updated);
        toast.info(`Triage set to Level ${level}`);
    };

    const handleAutoRecalculate = () => {
        setIsRecalculating(true);
        setTimeout(() => {
            const calculated = calculateTriageAcuity(encounter.patientData, {
                painScore: triage.painScore,
                avpu: triage.avpu
            });
            handleSaveTriage(calculated);
            setIsRecalculating(false);
            toast.success(`Triage automatically evaluated: Level ${calculated.level}`);
        }, 500);
    };

    const toggleRedFlag = (flag: string) => {
        const exists = triage.redFlags.includes(flag);
        const updatedFlags = exists 
            ? triage.redFlags.filter(f => f !== flag)
            : [...triage.redFlags, flag];
        
        const updated = calculateTriageAcuity(encounter.patientData, {
            ...triage,
            redFlags: updatedFlags
        });
        handleSaveTriage(updated);
    };

    const activeLevelMeta = TRIAGE_LEVELS.find(l => l.level === triage.level) || TRIAGE_LEVELS[1];

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header / Acuity Banner */}
            <div className={`relative overflow-hidden rounded-3xl p-6 md:p-8 border ${activeLevelMeta.borderColor} bg-slate-900/90 shadow-2xl backdrop-blur-xl`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="relative flex h-3.5 w-3.5">
                                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${activeLevelMeta.dotColor}`}></span>
                                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${activeLevelMeta.badgeBg.split(' ')[0]}`}></span>
                            </span>
                            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-cyan-400">
                                Emergency Severity Index (ESI 1–5 Standard)
                            </span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight font-display">
                            {activeLevelMeta.name}
                        </h2>
                        <p className="text-sm md:text-base text-slate-300 font-medium">
                            {activeLevelMeta.subtext}
                        </p>
                    </div>

                    <div className="flex flex-wrap md:flex-col items-start md:items-end gap-3 shrink-0">
                        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-5 py-3 text-right">
                            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Target Time to Provider</div>
                            <div className={`text-xl md:text-2xl font-black font-mono ${activeLevelMeta.badgeText}`}>
                                {activeLevelMeta.targetTime}
                            </div>
                        </div>

                        <button
                            onClick={handleAutoRecalculate}
                            disabled={isRecalculating}
                            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isRecalculating ? 'Evaluating...' : 'AI Auto-Calculate'}
                        </button>
                    </div>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
                    <span><strong>Clinical Rationale:</strong> {triage.clinicalRationale}</span>
                    <span className="font-mono text-[11px] text-slate-500">Last Assessed: {new Date(triage.lastAssessed).toLocaleTimeString()}</span>
                </div>
            </div>

            {/* 1–5 Level Selector Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {TRIAGE_LEVELS.map(item => {
                    const isSelected = triage.level === item.level;
                    return (
                        <button
                            key={item.level}
                            type="button"
                            onClick={() => handleLevelSelect(item.level)}
                            className={`p-4 rounded-2xl text-left transition-all border relative flex flex-col justify-between ${
                                isSelected
                                    ? `${item.badgeBg} ${item.borderColor} shadow-lg scale-102 ring-2 ring-cyan-400/30`
                                    : 'bg-slate-900/50 hover:bg-slate-800/60 border-slate-800 text-slate-400'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs font-black uppercase tracking-widest ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                        Level {item.level}
                                    </span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300">
                                        {item.targetTime}
                                    </span>
                                </div>
                                <div className={`text-sm font-bold leading-snug ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                    {item.name.replace(`Level ${item.level}: `, '')}
                                </div>
                            </div>
                            <p className="text-[11px] mt-3 opacity-80 line-clamp-2">
                                {item.subtext}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Triage Assessment Grid: Vitals Triggers, AVPU & Pain Score */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Vital Sign Triggers */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                            Vital Sign Danger Triggers
                        </h3>
                        <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-lg">
                            {triage.vitalTriggers.length} Active
                        </span>
                    </div>

                    {triage.vitalTriggers.length === 0 ? (
                        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 text-xs">
                            ✓ Baseline vitals within acceptable emergency parameters.
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {triage.vitalTriggers.map((trig, idx) => (
                                <li key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-medium">
                                    <span className="text-rose-400 font-bold shrink-0">⚠️</span>
                                    <span>{trig}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="mt-5 pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                        <div className="flex justify-between"><span>Blood Pressure:</span> <span className="font-mono text-white">{encounter.patientData.vitals?.bp || 'N/A'}</span></div>
                        <div className="flex justify-between"><span>Heart Rate:</span> <span className="font-mono text-white">{encounter.patientData.vitals?.hr || 'N/A'} bpm</span></div>
                        <div className="flex justify-between"><span>Oxygen Saturation:</span> <span className="font-mono text-white">{encounter.patientData.vitals?.spo2 || 'N/A'}%</span></div>
                        <div className="flex justify-between"><span>Respiratory Rate:</span> <span className="font-mono text-white">{encounter.patientData.vitals?.rr || 'N/A'}/min</span></div>
                        <div className="flex justify-between"><span>Temperature:</span> <span className="font-mono text-white">{encounter.patientData.vitals?.temp || 'N/A'}°C</span></div>
                    </div>
                </div>

                {/* 2. Consciousness (AVPU) & Pain Intensity */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-white mb-3">
                            Consciousness Level (AVPU)
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {(['Alert', 'Verbal', 'Pain', 'Unresponsive'] as const).map(mode => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => handleSaveTriage({ ...triage, avpu: mode })}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                                        triage.avpu === mode
                                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md font-black'
                                            : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                                    }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-black uppercase tracking-wider text-white">
                                Pain Intensity (0–10 Score)
                            </h3>
                            <span className={`text-base font-black font-mono px-3 py-0.5 rounded-lg border ${
                                triage.painScore >= 8 
                                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
                                    : triage.painScore >= 5 
                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            }`}>
                                {triage.painScore} / 10
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="1"
                            value={triage.painScore}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                handleSaveTriage({ ...triage, painScore: val });
                            }}
                            className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase mt-1">
                            <span>0 (No Pain)</span>
                            <span>5 (Moderate)</span>
                            <span>10 (Worst Possible)</span>
                        </div>
                    </div>
                </div>

                {/* 3. Immediate Triage Clinical Actions */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                        Immediate Resuscitation / Triage Actions
                    </h3>
                    <div className="space-y-2">
                        {triage.immediateActions.map((action, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-slate-200 text-xs">
                                <span className="text-cyan-400 font-bold">▶</span>
                                <span>{action}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Red Flags Checklist */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    High-Risk Clinical Red Flags Checklist
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {COMMON_RED_FLAGS.map((flag, idx) => {
                        const isChecked = triage.redFlags.includes(flag);
                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => toggleRedFlag(flag)}
                                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left text-xs transition-all ${
                                    isChecked
                                        ? 'bg-rose-950/40 border-rose-500/60 text-rose-200 font-semibold'
                                        : 'bg-slate-800/30 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                                }`}
                            >
                                <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                                    isChecked ? 'bg-rose-500 border-rose-400 text-white font-bold' : 'border-slate-600'
                                }`}>
                                    {isChecked ? '✓' : ''}
                                </span>
                                <span>{flag}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {onNext && (
                <div className="flex justify-end pt-4">
                    <button
                        onClick={onNext}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-8 py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center gap-2"
                    >
                        Proceed to Stepwise Management ➔
                    </button>
                </div>
            )}
        </div>
    );
};

export default TriageAssessmentView;
