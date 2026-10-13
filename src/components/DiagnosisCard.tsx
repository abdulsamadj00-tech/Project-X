
import React, { useState } from 'react';
import { Diagnosis } from '../types';
import { 
    ChevronDownIcon, 
    CheckCircleIcon, 
    XCircleIcon, 
    BeakerIcon, 
    PillIcon, 
    HeartPulseIcon, 
    SkullIcon, 
    BookOpenIcon,
    SparklesIcon
} from './icons';

interface DiagnosisCardProps {
    diagnosis: Diagnosis;
    index: number;
}

const DiagnosisCard: React.FC<DiagnosisCardProps> = ({ diagnosis, index }) => {
    const [isOpen, setIsOpen] = useState(index === 0);

    const getProbabilityColor = (prob: number) => {
        if (prob > 75) return 'from-rose-500 to-red-600';
        if (prob > 50) return 'from-amber-500 to-orange-600';
        if (prob > 25) return 'from-emerald-500 to-teal-600';
        return 'from-brand-500 to-brand-700';
    };

    const hasGuidelines = diagnosis.treatmentSuggestions.guidelines && diagnosis.treatmentSuggestions.guidelines.length > 0;

    return (
        <div className={`bg-primary-100 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-500 mb-8 ${isOpen ? 'shadow-xl shadow-slate-200/40 ring-1 ring-brand-500/5' : 'hover:shadow-md hover:border-slate-200'} group`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-8 text-left focus:outline-none transition-all duration-500 ${isOpen ? 'bg-slate-50/30' : 'hover:bg-slate-50/50'}`}
            >
                <div className="flex items-center gap-8">
                    <div className={`w-14 h-14 flex items-center justify-center font-black text-xl rounded-2xl border transition-all duration-700 ${isOpen ? 'bg-brand-600 text-white border-brand-500 shadow-lg shadow-brand-500/30 rotate-3' : 'bg-slate-50 text-slate-400 border-slate-100 group-hover:scale-110'}`}>
                        {index + 1}
                    </div>
                    <div>
                        <h3 className={`text-2xl font-bold tracking-tight font-display transition-colors duration-500 ${isOpen ? 'text-slate-900' : 'text-slate-600'}`}>{diagnosis.diagnosisName}</h3>
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2.5">
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-extrabold tracking-wide bg-brand-500/15 text-brand-500 border border-brand-500/30 shadow-sm">
                                {diagnosis.icdCode || 'ICD-11 Standard'}
                            </span>
                            <span className="text-slate-300 text-[10px]">•</span>
                            <div className="flex items-center gap-1.5">
                                <SparklesIcon className={`h-3.5 w-3.5 transition-colors duration-500 ${isOpen ? 'text-brand-500' : 'text-slate-400'}`} />
                                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${isOpen ? 'text-brand-600' : 'text-slate-400'}`}>Clinical Probability</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-10">
                    <div className="hidden md:flex flex-col items-end gap-3">
                        <div className="w-40 bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50 p-0.5">
                            <div 
                                className={`h-full rounded-full bg-gradient-to-r ${getProbabilityColor(diagnosis.probability)} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)]`} 
                                style={{ width: isOpen ? `${diagnosis.probability}%` : '0%' }}
                            ></div>
                        </div>
                        <span className="text-sm font-black text-slate-900 tracking-tighter">{diagnosis.probability}%</span>
                    </div>
                    <div className={`w-12 h-12 flex items-center justify-center rounded-full border transition-all duration-500 ${isOpen ? 'bg-brand-50 border-brand-100 rotate-180' : 'bg-primary-100 border-slate-100'}`}>
                        <ChevronDownIcon className={`h-6 w-6 transition-colors duration-500 ${isOpen ? 'text-brand-600' : 'text-slate-300'}`} />
                    </div>
                </div>
            </button>

            <div className={`transition-all duration-700 ease-in-out ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="px-10 pb-10 pt-4 border-t border-slate-50/50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-8 animate-fade-in">
                        
                        {/* Evidence */}
                        <div className="space-y-8">
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    Clinical Evidence Matrix
                                </h4>
                                <div className="space-y-4">
                                    {diagnosis.supportingEvidence.map((item, i) => (
                                        <div key={i} className="flex items-start gap-5 p-5 bg-emerald-50/30 border border-emerald-100/50 rounded-3xl group/item transition-all hover:bg-emerald-50 hover:shadow-sm">
                                            <div className="mt-0.5 p-1.5 bg-emerald-100 text-emerald-600 rounded-xl shadow-sm">
                                                <CheckCircleIcon className="h-4 w-4" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-700 leading-relaxed">{item}</span>
                                        </div>
                                    ))}
                                    {diagnosis.contradictingEvidence.map((item, i) => (
                                        <div key={i} className="flex items-start gap-5 p-5 bg-rose-50/30 border border-rose-100/50 rounded-3xl group/item transition-all hover:bg-rose-50 hover:shadow-sm">
                                            <div className="mt-0.5 p-1.5 bg-rose-100 text-rose-600 rounded-xl shadow-sm">
                                                <XCircleIcon className="h-4 w-4" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-700 leading-relaxed">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                    <div className="w-2 h-2 bg-brand-500 rounded-full shadow-[0_0_8px_rgba(14,145,233,0.5)]"></div>
                                    Diagnostic Investigations
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {diagnosis.recommendedTests.map((item, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:border-brand-200 hover:bg-primary-100 hover:shadow-md group/test">
                                            <div className="p-2 bg-primary-100 text-slate-400 group-hover/test:text-brand-500 rounded-xl shadow-sm border border-slate-100 transition-all group-hover/test:scale-110">
                                                <BeakerIcon className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 group-hover/test:text-slate-900 transition-colors">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Treatment Suggestions */}
                        <div className="space-y-10">
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                                    Therapeutic Strategy
                                </h4>
                                <div className="space-y-6">
                                    <div className="bg-primary-100 p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                                <PillIcon className="h-6 w-6" />
                                            </div>
                                            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-[0.2em]">Pharmacotherapy Protocol</h5>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                            <div>
                                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                                    First-Line
                                                </p>
                                                <ul className="space-y-3">
                                                    {diagnosis.treatmentSuggestions.firstLine.map((item, i) => (
                                                        <li key={i} className="text-xs font-medium text-slate-600 flex items-center gap-3">
                                                            <div className="w-1 h-1 bg-indigo-200 rounded-full flex-shrink-0"></div>
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                                                    Second-Line
                                                </p>
                                                <ul className="space-y-3">
                                                    {diagnosis.treatmentSuggestions.secondLine.map((item, i) => (
                                                        <li key={i} className="text-xs font-medium text-slate-500 flex items-center gap-3">
                                                            <div className="w-1 h-1 bg-slate-200 rounded-full flex-shrink-0"></div>
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                                <HeartPulseIcon className="h-6 w-6" />
                                            </div>
                                            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-[0.2em]">Lifestyle & Support</h5>
                                        </div>
                                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {diagnosis.treatmentSuggestions.lifestyle.map((item, i) => (
                                                <li key={i} className="text-xs font-medium text-slate-600 flex items-center gap-3 bg-primary-100 p-4 rounded-2xl border border-slate-100 hover:shadow-sm transition-all">
                                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0"></div>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {hasGuidelines && (
                                <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl shadow-slate-300/50 relative overflow-hidden group/guidelines">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover/guidelines:scale-150"></div>
                                    <h5 className="text-[10px] font-bold text-brand-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3 relative z-10">
                                        <BookOpenIcon className="h-5 w-5" />
                                        Evidence-Based Guidelines
                                    </h5>
                                    <ul className="space-y-4 relative z-10">
                                        {diagnosis.treatmentSuggestions.guidelines?.map((item, i) => (
                                            <li key={i} className="text-xs font-medium text-slate-300 leading-relaxed flex items-start gap-4">
                                                <div className="mt-2 w-1.5 h-1.5 bg-brand-500 rounded-full flex-shrink-0 shadow-[0_0_8px_rgba(14,145,233,0.8)]"></div>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 bg-orange-50/50 border border-orange-100 rounded-[2rem] hover:bg-orange-50 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-1.5 bg-orange-100 rounded-lg">
                                            <HeartPulseIcon className="h-4 w-4 text-orange-600" />
                                        </div>
                                        <h4 className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Morbidity</h4>
                                    </div>
                                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{diagnosis.morbidity}</p>
                                </div>
                                <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-slate-100 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-1.5 bg-slate-200 rounded-lg">
                                            <SkullIcon className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mortality</h4>
                                    </div>
                                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{diagnosis.mortality}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiagnosisCard;

