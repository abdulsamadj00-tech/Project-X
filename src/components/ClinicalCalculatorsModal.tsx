import React, { useState } from 'react';
import { Encounter, ClinicalRiskScore } from '../types';
import {
    calculateNEWS2,
    calculateWellsPE,
    calculateTIMI_ACS,
    calculateCURB65,
    calculateCHA2DS2_VASc
} from '../services/clinicalCalculators';
import { toast } from 'sonner';

interface ClinicalCalculatorsModalProps {
    encounter: Encounter;
    onUpdateEncounter: (encounter: Encounter) => void;
    onClose: () => void;
}

type CalculatorKey = 'news2' | 'wells_pe' | 'timi' | 'curb65' | 'cha2ds2';

export const ClinicalCalculatorsModal: React.FC<ClinicalCalculatorsModalProps> = ({
    encounter,
    onUpdateEncounter,
    onClose
}) => {
    const [activeCalc, setActiveCalc] = useState<CalculatorKey>('news2');

    // NEWS2 State (defaults from patient vitals)
    const [news2O2, setNews2O2] = useState<boolean>(false);
    const [news2Conscious, setNews2Conscious] = useState<'Alert' | 'Verbal' | 'Pain' | 'Unresponsive'>('Alert');

    // Wells PE State
    const [wellsCriteria, setWellsCriteria] = useState({
        clinicalSignsDVT: false,
        peMostLikely: true,
        heartRateOver100: parseFloat(encounter.patientData.vitals?.hr || '0') > 100,
        recentSurgeryOrBedridden: false,
        previousDVT_PE: false,
        hemoptysis: false,
        malignancyActive: false
    });

    // TIMI State
    const [timiCriteria, setTimiCriteria] = useState({
        age65OrOlder: parseInt(encounter.patientData.age || '0') >= 65,
        threeOrMoreCADRiskFactors: true,
        knownCADStenosis50: false,
        aspirinUsePast7Days: true,
        severeAnginaPast24h: true,
        stSegmentDeviation05mm: true,
        elevatedCardiacMarkers: true
    });

    // CURB-65 State
    const [curbCriteria, setCurbCriteria] = useState({
        confusion: false,
        ureaOver7OrBUNOver19: false,
        respiratoryRate30OrMore: parseFloat(encounter.patientData.vitals?.rr || '0') >= 30,
        bloodPressureLow: parseFloat(encounter.patientData.vitals?.bp?.split('/')[0] || '120') < 90,
        age65OrOlder: parseInt(encounter.patientData.age || '0') >= 65
    });

    // CHA2DS2-VASc State
    const [chaCriteria, setChaCriteria] = useState({
        congestiveHeartFailure: false,
        hypertension: (encounter.patientData.pmh || '').toLowerCase().includes('hypertension'),
        age75OrOlder: parseInt(encounter.patientData.age || '0') >= 75,
        diabetesMellitus: (encounter.patientData.pmh || '').toLowerCase().includes('diabet'),
        strokeOrTIAorThromboembolism: false,
        vascularDisease: true,
        age65to74: parseInt(encounter.patientData.age || '0') >= 65 && parseInt(encounter.patientData.age || '0') < 75,
        femaleSex: encounter.patientData.sex === 'Female'
    });

    // Calculations
    const news2Result = calculateNEWS2(encounter.patientData.vitals, news2O2, news2Conscious);
    const wellsResult = calculateWellsPE(wellsCriteria);
    const timiResult = calculateTIMI_ACS(timiCriteria);
    const curbResult = calculateCURB65(curbCriteria);
    const chaResult = calculateCHA2DS2_VASc(chaCriteria);

    const handleAttachScore = (score: ClinicalRiskScore) => {
        const existing = encounter.riskScores || [];
        const filtered = existing.filter(s => s.name !== score.name);
        const updatedScores = [score, ...filtered];

        onUpdateEncounter({
            ...encounter,
            riskScores: updatedScores,
            news2: activeCalc === 'news2' ? news2Result : encounter.news2
        });
        toast.success(`Attached ${score.name} to encounter record.`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="bg-primary-100 border border-primary-300/40 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-primary-900">
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-primary-300/30 flex items-center justify-between bg-primary-100/95 shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-400"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-400">
                                Bedside Decision Support
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-primary-900 font-display tracking-tight mt-0.5">
                            Clinical Risk Calculators
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-primary-200/60 text-primary-400 hover:text-primary-900 hover:bg-primary-300/60 border border-primary-300/30 flex items-center justify-center transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Minimalist Calculator Nav Bar */}
                <div className="flex items-center gap-1.5 p-2 bg-primary-200/50 border-b border-primary-300/30 overflow-x-auto scrollbar-hide shrink-0">
                    {[
                        { id: 'news2', label: 'NEWS2 (Deterioration)', badge: `${news2Result.totalScore}` },
                        { id: 'timi', label: 'TIMI (NSTEMI Risk)', badge: `${timiResult.score}/7` },
                        { id: 'wells_pe', label: 'Wells Score (PE)', badge: `${wellsResult.score}` },
                        { id: 'curb65', label: 'CURB-65 (Pneumonia)', badge: `${curbResult.score}/5` },
                        { id: 'cha2ds2', label: 'CHA2DS2-VASc (AF)', badge: `${chaResult.score}` }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveCalc(tab.id as CalculatorKey)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                                activeCalc === tab.id
                                    ? 'bg-brand-500 text-white shadow-md font-black'
                                    : 'text-primary-600 hover:bg-primary-300/40 hover:text-primary-900'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                                activeCalc === tab.id ? 'bg-black/20 text-white' : 'bg-primary-300/40 text-primary-700'
                            }`}>
                                {tab.badge}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Calculator Body */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
                    {/* --- 1. NEWS2 Calculator --- */}
                    {activeCalc === 'news2' && (
                        <div className="space-y-6">
                            {/* Score Card */}
                            <div className={`p-6 rounded-2xl border ${
                                news2Result.colorCode === 'red'
                                    ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                                    : news2Result.colorCode === 'amber'
                                    ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                                    : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                            }`}>
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <div className="text-[10px] uppercase font-black tracking-widest opacity-80">
                                            National Early Warning Score 2 (Royal College of Physicians)
                                        </div>
                                        <div className="text-4xl font-black font-mono tracking-tight mt-1 text-white">
                                            {news2Result.totalScore} <span className="text-sm font-normal opacity-80">/ 20</span>
                                        </div>
                                        <div className="text-sm font-bold mt-1">
                                            Acuity: {news2Result.riskLevel}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAttachScore({
                                            id: `score-news2-${Date.now()}`,
                                            name: "NEWS2 Aggregate Deterioration Score",
                                            score: news2Result.totalScore,
                                            maxScore: 20,
                                            riskCategory: news2Result.riskLevel.includes('High') ? 'High Risk' : news2Result.riskLevel.includes('Medium') ? 'Intermediate / Moderate Risk' : 'Low Risk',
                                            interpretation: `NEWS2 Score: ${news2Result.totalScore} (${news2Result.riskLevel}). Frequency: ${news2Result.monitoringFrequency}`,
                                            clinicalRecommendation: news2Result.clinicalResponse,
                                            criteriaChecked: [],
                                            calculatedAt: Date.now()
                                        })}
                                        className="bg-white text-slate-950 text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl hover:bg-slate-200 transition-all active:scale-95 shrink-0"
                                    >
                                        Attach to Case ✓
                                    </button>
                                </div>
                                <div className="mt-4 pt-3 border-t border-current/20 text-xs leading-relaxed opacity-95">
                                    <strong>Clinical Action:</strong> {news2Result.clinicalResponse}
                                </div>
                            </div>

                            {/* Vitals Breakdown Matrix */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {Object.entries(news2Result.parameterScores).map(([key, val]) => (
                                    <div key={key} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                                            {key.replace(/([A-Z])/g, ' $1')}
                                        </div>
                                        <div className="flex justify-between items-baseline mt-1">
                                            <span className="font-mono text-white">{String(val.value)}</span>
                                            <span className={`font-mono text-xs font-black px-1.5 py-0.5 rounded ${
                                                val.score >= 3 ? 'bg-rose-500 text-white' : val.score > 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                                            }`}>
                                                +{val.score}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Supplementary Toggles */}
                            <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={news2O2}
                                        onChange={(e) => setNews2O2(e.target.checked)}
                                        className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                                    />
                                    <span>Patient on Supplemental Oxygen (+2 pts)</span>
                                </label>
                                <div className="flex items-center gap-2 text-xs text-slate-300 ml-auto">
                                    <span>Consciousness:</span>
                                    <select
                                        value={news2Conscious}
                                        onChange={(e) => setNews2Conscious(e.target.value as any)}
                                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                                    >
                                        <option value="Alert">Alert (0)</option>
                                        <option value="Verbal">Verbal Response (3)</option>
                                        <option value="Pain">Pain Response (3)</option>
                                        <option value="Unresponsive">Unresponsive (3)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- 2. TIMI ACS Calculator --- */}
                    {activeCalc === 'timi' && (
                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl bg-slate-950/80 border border-cyan-500/40 text-slate-200 flex justify-between items-start gap-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                                        TIMI Risk Score for UA / NSTEMI
                                    </div>
                                    <div className="text-4xl font-black font-mono text-white mt-1">
                                        {timiResult.score} / 7
                                    </div>
                                    <div className="text-xs text-slate-300 mt-1 font-bold">{timiResult.interpretation}</div>
                                </div>
                                <button
                                    onClick={() => handleAttachScore(timiResult)}
                                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all active:scale-95 shrink-0"
                                >
                                    Attach Score ✓
                                </button>
                            </div>

                            <div className="space-y-2">
                                {[
                                    { key: 'age65OrOlder', label: 'Age >= 65 years (+1)' },
                                    { key: 'threeOrMoreCADRiskFactors', label: '>= 3 Coronary Risk Factors (HTN, Lipids, Smoking, DM, Family Hx) (+1)' },
                                    { key: 'knownCADStenosis50', label: 'Known CAD (prior stenosis >= 50%) (+1)' },
                                    { key: 'aspirinUsePast7Days', label: 'Aspirin use within last 7 days (+1)' },
                                    { key: 'severeAnginaPast24h', label: '>= 2 Anginal episodes in past 24 hours (+1)' },
                                    { key: 'stSegmentDeviation05mm', label: 'ST-segment deviation >= 0.5 mm on ECG (+1)' },
                                    { key: 'elevatedCardiacMarkers', label: 'Elevated cardiac biomarkers (Troponin I/T) (+1)' }
                                ].map(item => (
                                    <label
                                        key={item.key}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:bg-slate-800/40 cursor-pointer text-xs text-slate-300 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={(timiCriteria as any)[item.key]}
                                            onChange={(e) => setTimiCriteria({ ...timiCriteria, [item.key]: e.target.checked })}
                                            className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                                        />
                                        <span>{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- 3. Wells PE Calculator --- */}
                    {activeCalc === 'wells_pe' && (
                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl bg-slate-950/80 border border-indigo-500/40 text-slate-200 flex justify-between items-start gap-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                        Wells Clinical Prediction Rule for Pulmonary Embolism
                                    </div>
                                    <div className="text-4xl font-black font-mono text-white mt-1">
                                        {wellsResult.score} pts
                                    </div>
                                    <div className="text-xs text-slate-300 mt-1 font-bold">{wellsResult.interpretation}</div>
                                </div>
                                <button
                                    onClick={() => handleAttachScore(wellsResult)}
                                    className="bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all active:scale-95 shrink-0"
                                >
                                    Attach Score ✓
                                </button>
                            </div>

                            <div className="space-y-2">
                                {[
                                    { key: 'clinicalSignsDVT', label: 'Clinical signs and symptoms of DVT (+3.0 pts)' },
                                    { key: 'peMostLikely', label: 'PE is #1 diagnosis or equally likely (+3.0 pts)' },
                                    { key: 'heartRateOver100', label: 'Heart rate > 100 bpm (+1.5 pts)' },
                                    { key: 'recentSurgeryOrBedridden', label: 'Immobilization (>= 3 days) or surgery in last 4 weeks (+1.5 pts)' },
                                    { key: 'previousDVT_PE', label: 'Previous confirmed DVT or PE (+1.5 pts)' },
                                    { key: 'hemoptysis', label: 'Hemoptysis (+1.0 pt)' },
                                    { key: 'malignancyActive', label: 'Malignancy treated in last 6 months or palliative (+1.0 pt)' }
                                ].map(item => (
                                    <label
                                        key={item.key}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:bg-slate-800/40 cursor-pointer text-xs text-slate-300 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={(wellsCriteria as any)[item.key]}
                                            onChange={(e) => setWellsCriteria({ ...wellsCriteria, [item.key]: e.target.checked })}
                                            className="w-4 h-4 accent-indigo-400 rounded cursor-pointer"
                                        />
                                        <span>{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- 4. CURB-65 Calculator --- */}
                    {activeCalc === 'curb65' && (
                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl bg-slate-950/80 border border-emerald-500/40 text-slate-200 flex justify-between items-start gap-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                        CURB-65 Pneumonia Severity Score
                                    </div>
                                    <div className="text-4xl font-black font-mono text-white mt-1">
                                        {curbResult.score} / 5
                                    </div>
                                    <div className="text-xs text-slate-300 mt-1 font-bold">{curbResult.interpretation}</div>
                                </div>
                                <button
                                    onClick={() => handleAttachScore(curbResult)}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all active:scale-95 shrink-0"
                                >
                                    Attach Score ✓
                                </button>
                            </div>

                            <div className="space-y-2">
                                {[
                                    { key: 'confusion', label: 'Confusion (Abbreviated Mental Test <= 8 or new acute disorientation) (+1)' },
                                    { key: 'ureaOver7OrBUNOver19', label: 'Urea > 7 mmol/L (BUN > 19 mg/dL) (+1)' },
                                    { key: 'respiratoryRate30OrMore', label: 'Respiratory rate >= 30 breaths/min (+1)' },
                                    { key: 'bloodPressureLow', label: 'Blood Pressure low (SBP < 90 or DBP <= 60 mmHg) (+1)' },
                                    { key: 'age65OrOlder', label: 'Age >= 65 years (+1)' }
                                ].map(item => (
                                    <label
                                        key={item.key}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:bg-slate-800/40 cursor-pointer text-xs text-slate-300 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={(curbCriteria as any)[item.key]}
                                            onChange={(e) => setCurbCriteria({ ...curbCriteria, [item.key]: e.target.checked })}
                                            className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
                                        />
                                        <span>{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- 5. CHA2DS2-VASc Calculator --- */}
                    {activeCalc === 'cha2ds2' && (
                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl bg-slate-950/80 border border-amber-500/40 text-slate-200 flex justify-between items-start gap-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                                        CHA2DS2-VASc Stroke Risk in Atrial Fibrillation
                                    </div>
                                    <div className="text-4xl font-black font-mono text-white mt-1">
                                        {chaResult.score} pts
                                    </div>
                                    <div className="text-xs text-slate-300 mt-1 font-bold">{chaResult.clinicalRecommendation}</div>
                                </div>
                                <button
                                    onClick={() => handleAttachScore(chaResult)}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all active:scale-95 shrink-0"
                                >
                                    Attach Score ✓
                                </button>
                            </div>

                            <div className="space-y-2">
                                {[
                                    { key: 'congestiveHeartFailure', label: 'Congestive Heart Failure / LVEF <= 40% (+1)' },
                                    { key: 'hypertension', label: 'Hypertension history or current BP medication (+1)' },
                                    { key: 'age75OrOlder', label: 'Age >= 75 years (+2)' },
                                    { key: 'diabetesMellitus', label: 'Diabetes Mellitus (+1)' },
                                    { key: 'strokeOrTIAorThromboembolism', label: 'Prior Stroke / TIA / Thromboembolism (+2)' },
                                    { key: 'vascularDisease', label: 'Vascular Disease (prior MI, PAD, complex aortic plaque) (+1)' },
                                    { key: 'age65to74', label: 'Age 65 - 74 years (+1)' },
                                    { key: 'femaleSex', label: 'Sex Category Female (+1)' }
                                ].map(item => (
                                    <label
                                        key={item.key}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:bg-slate-800/40 cursor-pointer text-xs text-slate-300 transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={(chaCriteria as any)[item.key]}
                                            onChange={(e) => setChaCriteria({ ...chaCriteria, [item.key]: e.target.checked })}
                                            className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                                        />
                                        <span>{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-primary-300/30 bg-primary-200/40 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-xs font-bold text-primary-600 hover:text-primary-900 bg-primary-200/50 hover:bg-primary-300/60 rounded-xl border border-primary-300/30 transition-all"
                    >
                        Close Calculators
                    </button>
                </div>
            </div>
        </div>
    );
};
