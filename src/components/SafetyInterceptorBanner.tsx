import React, { useState } from 'react';
import { Encounter } from '../types';
import { checkAllergiesAndInteractions } from '../services/safetyInterceptorService';

interface SafetyInterceptorBannerProps {
    encounter: Encounter;
    onOpenChangeTreatment?: () => void;
}

export const SafetyInterceptorBanner: React.FC<SafetyInterceptorBannerProps> = ({
    encounter,
    onOpenChangeTreatment
}) => {
    const [isDismissed, setIsDismissed] = useState<boolean>(false);
    const { ddiAlerts, allergyAlerts, hasCriticalAlert } = checkAllergiesAndInteractions(
        encounter.patientData,
        encounter.treatments || []
    );

    if (isDismissed) return null;

    if (!hasCriticalAlert && ddiAlerts.length === 0 && allergyAlerts.length === 0) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 text-xs">
                <span>🛡️</span>
                <span className="font-semibold">Prescribing Safety Verified:</span>
                <span className="text-slate-400">0 Allergy or Drug-Drug interactions detected across active treatments.</span>
            </div>
        );
    }

    return (
        <div className="space-y-2 animate-slide-up">
            {/* Allergy Conflict Alerts */}
            {allergyAlerts.map(alert => (
                <div
                    key={alert.id}
                    className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/70 text-rose-200 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                    <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0 mt-0.5">⚠️</span>
                        <div className="space-y-1">
                            <div className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
                                <span>ALLERGY CONFLICT DETECTED</span>
                                <span className="bg-rose-500 text-slate-950 px-2 py-0.2 rounded text-[10px] font-black">CRITICAL</span>
                            </div>
                            <div className="text-sm font-bold text-white">
                                {alert.drugName} conflicts with patient allergy: <span className="underline">{alert.matchedAllergy}</span>
                            </div>
                            <div className="text-xs text-rose-300 leading-relaxed">
                                {alert.reactionRisk} {alert.recommendation}
                            </div>
                        </div>
                    </div>

                    {onOpenChangeTreatment && (
                        <button
                            onClick={onOpenChangeTreatment}
                            className="bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl transition-all active:scale-95 shrink-0"
                        >
                            Change Medication ➔
                        </button>
                    )}
                </div>
            ))}

            {/* Drug-Drug Interaction Alerts */}
            {ddiAlerts.map(alert => (
                <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border text-xs shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        alert.severity === 'Contraindicated'
                            ? 'bg-rose-950/60 border-rose-500/70 text-rose-200'
                            : 'bg-amber-950/50 border-amber-500/60 text-amber-200'
                    }`}
                >
                    <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0 mt-0.5">
                            {alert.severity === 'Contraindicated' ? '🚫' : '⚠️'}
                        </span>
                        <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                                <span className={alert.severity === 'Contraindicated' ? 'text-rose-400' : 'text-amber-400'}>
                                    DRUG INTERACTION: {alert.interactingDrugs[0]} + {alert.interactingDrugs[1]}
                                </span>
                                <span className="px-2 py-0.2 rounded text-[9px] font-black bg-slate-900 border border-current">
                                    {alert.severity}
                                </span>
                            </div>
                            <div className="text-xs text-slate-200 leading-relaxed">
                                <strong>Mechanism:</strong> {alert.mechanism}
                            </div>
                            <div className="text-xs text-slate-300">
                                <strong>Action:</strong> {alert.recommendation}
                            </div>
                        </div>
                    </div>

                    {onOpenChangeTreatment && (
                        <button
                            onClick={onOpenChangeTreatment}
                            className="bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all active:scale-95 shrink-0 border border-slate-700"
                        >
                            Review Regimen
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
};
