// This file is conceptually renamed to EncounterView.tsx
// It now orchestrates the entire tab-based interface for a single patient encounter.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Encounter, PatientData, Diagnosis, Treatment, ProgressNote, VitalsRecord, Vitals, DoctorDetails, ReportModules, MedicationSuggestion, MedicalReport } from '../types';
import { generateDiagnoses, generateProgressSummary, generateAIRecommendations, extractTextFromImage, suggestMedications, chatWithAI } from '../services/geminiService';
import { generateAutoTags } from '../services/autoTaggingService';
import ModuleCard from './ModuleCard';
import DiagnosisCard from './DiagnosisCard';
import { 
    UserGroupIcon, PillIcon, ChartPieIcon, SparklesIcon, DocumentTextIcon, ChevronDownIcon, XCircleIcon,
    PlusCircleIcon, CheckCircleIcon, BeakerIcon, HeartPulseIcon, SkullIcon, BookOpenIcon, CameraIcon,
    ExclamationCircleIcon, ArrowUpOnSquareIcon, ClipboardDocumentListIcon,
    PencilSquareIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon, UserIcon, CpuChipIcon,
    ArrowPathIcon, TrashIcon
} from './icons';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import DischargeSummaryModal from './DischargeSummaryModal';
import ReferralLetterModal from './ReferralLetterModal';
import LamaModal from './LamaModal';
import GenerateReportModal from './GenerateReportModal';
import { generateComprehensivePdf } from '../utils/reportGenerator';
import TreatmentModal from './TreatmentModal';
import TriageAssessmentView from './TriageAssessmentView';
import StepwiseManagementView from './StepwiseManagementView';
import LabTestTrackerView from './LabTestTrackerView';
import OngoingTreatmentManager from './OngoingTreatmentManager';
import NextRecommendationsAIConsultation from './NextRecommendationsAIConsultation';

import { useCases } from '../CaseContext';
import { useAuth } from '../AuthContext';

// --- PROPS ---
interface EncounterViewProps {
    encounter: Encounter;
    onUpdateEncounter: (encounter: Encounter) => void;
    onBack: () => void;
}

// --- TABS ---
type ActiveTab = 'case' | 'triage' | 'stepwise' | 'labs' | 'treatment' | 'next-rec' | 'progress' | 'analysis' | 'reports' | 'sharing';

const TABS: { id: ActiveTab; name: string; icon: React.ReactNode }[] = [
    { id: 'case', name: 'Patient Case', icon: <UserGroupIcon className="h-5 w-5 mr-2"/> },
    { id: 'triage', name: 'Triage (1–5)', icon: <ExclamationCircleIcon className="h-5 w-5 mr-2"/> },
    { id: 'stepwise', name: 'Stepwise Care', icon: <ClipboardDocumentListIcon className="h-5 w-5 mr-2"/> },
    { id: 'labs', name: 'Labs & Tests', icon: <BeakerIcon className="h-5 w-5 mr-2"/> },
    { id: 'treatment', name: 'Diagnoses & Rx', icon: <PillIcon className="h-5 w-5 mr-2"/> },
    { id: 'next-rec', name: 'Next Recs AI', icon: <SparklesIcon className="h-5 w-5 mr-2"/> },
    { id: 'progress', name: 'Daily Progress', icon: <ChartPieIcon className="h-5 w-5 mr-2"/> },
    { id: 'analysis', name: 'AI Diagnostics', icon: <CpuChipIcon className="h-5 w-5 mr-2"/> },
    { id: 'reports', name: 'Reports', icon: <DocumentTextIcon className="h-5 w-5 mr-2"/> },
    { id: 'sharing', name: 'Sharing', icon: <UserGroupIcon className="h-5 w-5 mr-2"/> },
];

// --- MAIN COMPONENT ---
const EncounterView: React.FC<EncounterViewProps> = ({ encounter: initialEncounter, onUpdateEncounter, onBack }) => {
    const { profile } = useAuth();
    const { shareCase } = useCases();
    const [encounter, setEncounter] = useState<Encounter>(initialEncounter);
    const [activeTab, setActiveTab] = useState<ActiveTab>('case');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const isLimitedRole = profile?.role === 'Nurse' || profile?.role === 'MT' || profile?.role === 'WardBoy';
    const canManageTreatments = !isLimitedRole;
    const canAnalyze = !isLimitedRole;
    const canShare = !isLimitedRole;

    const filteredTabs = TABS.filter(tab => {
        if (isLimitedRole) {
            return tab.id === 'case' || tab.id === 'progress';
        }
        return true;
    });

    // Debounced save
    useEffect(() => {
        const handler = setTimeout(() => {
            if (JSON.stringify(encounter) !== JSON.stringify(initialEncounter)) {
                setIsSaving(true);
                onUpdateEncounter(encounter);
                setTimeout(() => setIsSaving(false), 1000);
            }
        }, 1500);
        return () => clearTimeout(handler);
    }, [encounter, onUpdateEncounter, initialEncounter]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                onUpdateEncounter(encounter);
                setIsSaving(true);
                setTimeout(() => setIsSaving(false), 1000);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [encounter, onUpdateEncounter]);

    // Auto-tagging
     useEffect(() => {
        const handler = setTimeout(() => {
            const newAutoTags = generateAutoTags(encounter.patientData, encounter.provisionalDiagnoses);
            const userTags = encounter.tags.filter(t => !generateAutoTags(initialEncounter.patientData, initialEncounter.provisionalDiagnoses).includes(t));
            const combined = [...new Set([...userTags, ...newAutoTags])];
            
            if (JSON.stringify(encounter.tags.sort()) !== JSON.stringify(combined.sort())) {
                setEncounter(prev => ({...prev, tags: combined }));
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [encounter.patientData, encounter.provisionalDiagnoses]);

    const handleGenerateDiagnoses = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await generateDiagnoses(encounter.patientData, 'C'); // Assuming Celsius for now
            setEncounter(prev => ({ ...prev, provisionalDiagnoses: result }));
            setActiveTab('treatment'); // Move to next logical tab
        } catch (err: any) {
            setError(err?.message || 'Failed to generate diagnosis. Please check patient symptoms and try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleNext = () => {
        const currentIndex = filteredTabs.findIndex(t => t.id === activeTab);
        if (currentIndex < filteredTabs.length - 1) {
            setActiveTab(filteredTabs[currentIndex + 1].id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'case':
                return <PatientCaseTab encounter={encounter} setEncounter={setEncounter} onGenerateDiagnoses={handleGenerateDiagnoses} isLoading={isLoading} error={error} isLimitedRole={isLimitedRole} onNext={() => setActiveTab('triage')} onOpenTriage={() => setActiveTab('triage')} />;
            case 'triage':
                return <TriageAssessmentView encounter={encounter} onUpdateEncounter={(updated) => setEncounter(updated)} onNext={() => setActiveTab('stepwise')} />;
            case 'stepwise':
                return <StepwiseManagementView encounter={encounter} onUpdateEncounter={(updated) => setEncounter(updated)} onNext={() => setActiveTab('labs')} />;
            case 'labs':
                return <LabTestTrackerView encounter={encounter} onUpdateEncounter={(updated) => setEncounter(updated)} onNext={() => setActiveTab('treatment')} />;
            case 'treatment':
                return <DiagnosisTreatmentTab encounter={encounter} setEncounter={setEncounter} onNext={() => setActiveTab('next-rec')} />;
            case 'next-rec':
                return <NextRecommendationsAIConsultation encounter={encounter} onUpdateEncounter={(updated) => setEncounter(updated)} onNext={() => setActiveTab('progress')} />;
            case 'progress':
                return <ProgressMonitoringTab encounter={encounter} setEncounter={setEncounter} isLimitedRole={isLimitedRole} onNext={handleNext} />;
            case 'analysis':
                return <AIAnalysisTab encounter={encounter} setEncounter={setEncounter} onNext={handleNext} />;
            case 'reports':
                return <ReportsTab encounter={encounter} setEncounter={setEncounter} doctorDetails={profile || { name: '', role: 'Clinician', licenseNumber: '' }} onNext={handleNext} />;
            case 'sharing':
                return <SharingTab encounter={encounter} onShare={shareCase} />;
            default:
                return null;
        }
    };

    return (
        <div className="animate-slide-up">
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 md:mb-12 gap-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-8 w-full md:w-auto">
                    <button onClick={onBack} className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-primary-100 border border-slate-200 shadow-sm rounded-2xl hover:bg-slate-50 transition-all active:scale-95 group shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-slate-400 group-hover:text-brand-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-2">
                            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tighter font-display truncate max-w-full">{encounter.patientData.name || 'New Patient Case'}</h2>
                            <span className={`status-badge text-[10px] md:text-xs ${
                                encounter.status === 'Active' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                                {encounter.status}
                            </span>
                            {encounter.triage && (
                                <button
                                    onClick={() => setActiveTab('triage')}
                                    className={`text-[10px] md:text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl border flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm ${
                                        encounter.triage.level === 1 ? 'bg-rose-500/10 text-rose-600 border-rose-300' :
                                        encounter.triage.level === 2 ? 'bg-amber-500/10 text-amber-600 border-amber-300' :
                                        encounter.triage.level === 3 ? 'bg-yellow-500/10 text-yellow-600 border-yellow-300' :
                                        encounter.triage.level === 4 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-300' :
                                        'bg-sky-500/10 text-sky-600 border-sky-300'
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${
                                        encounter.triage.level === 1 ? 'bg-rose-500 animate-ping' :
                                        encounter.triage.level === 2 ? 'bg-amber-500 animate-pulse' :
                                        encounter.triage.level === 3 ? 'bg-yellow-500' :
                                        encounter.triage.level === 4 ? 'bg-emerald-500' : 'bg-sky-500'
                                    }`}></span>
                                    ESI Level {encounter.triage.level}: {encounter.triage.acuityName.split(' ')[0]} ({encounter.triage.targetTimeMinutes === 0 ? 'STAT' : `<${encounter.triage.targetTimeMinutes}m`})
                                </button>
                            )}
                        </div>
                        <p className="text-slate-400 text-[10px] md:text-sm font-semibold flex flex-wrap items-center gap-2 md:gap-3 uppercase tracking-widest">
                            <span className="text-slate-300">Case ID:</span> {encounter.id.slice(0, 12)}...
                            <span className="text-slate-200 hidden sm:inline">|</span>
                            <span className="text-slate-300">Opened:</span> {new Date(encounter.timestamp).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-4 w-full md:w-auto">
                    {isSaving && (
                        <div className="flex items-center text-[10px] font-bold text-brand-500 uppercase tracking-[0.3em] animate-pulse bg-brand-50 px-4 py-2 rounded-xl border border-brand-100">
                            <div className="w-2 h-2 bg-brand-500 rounded-full mr-2.5 shadow-[0_0_10px_rgba(14,145,233,0.6)]"></div>
                            Syncing
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 max-w-full md:max-w-xs justify-start md:justify-end">
                        {encounter.tags.map(tag => (
                            <span key={tag} className="bg-primary-100 text-brand-600 text-[9px] md:text-[10px] font-bold px-3 md:px-4 py-1.5 rounded-xl uppercase tracking-widest border border-brand-100 shadow-sm">{tag}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mb-8 md:mb-12 sticky top-[70px] md:top-[100px] z-40">
                <nav className="flex items-center gap-2 bg-primary-100/80 backdrop-blur-xl p-1.5 md:p-2 rounded-2xl md:rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-x-auto scrollbar-hide">
                    {filteredTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap flex items-center gap-2 md:gap-3 px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all ${
                                activeTab === tab.id
                                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20 scale-105'
                                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                            }`}
                        >
                            {React.cloneElement(tab.icon as React.ReactElement<any>, { className: `h-4 w-4 md:h-5 md:w-5 ${activeTab === tab.id ? 'text-white' : 'text-slate-300'}` })}
                            <span className={activeTab === tab.id ? 'inline' : 'hidden md:inline'}>{tab.name}</span>
                            {activeTab === tab.id && <span className="md:hidden ml-1">{tab.name}</span>}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                {renderTabContent()}
            </div>
        </div>
    );
};

// --- TAB SUB-COMPONENTS ---

// NOTE: In a real application, these would be in separate files.
// They are combined here due to platform constraints.

// --- REUSABLE COMPONENTS ---

const NextStepButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
    <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-slate-100 flex justify-end">
        <button 
            onClick={onClick}
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-brand-600 text-white font-bold py-3.5 md:py-4 px-8 md:px-10 rounded-xl md:rounded-2xl shadow-lg shadow-brand-500/20 hover:bg-brand-700 hover:scale-105 transition-all active:scale-95 group text-xs md:text-sm uppercase tracking-widest"
        >
            {label}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 group-hover:translate-x-1.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
        </button>
    </div>
);

const VitalInput: React.FC<{
    label: string;
    name: string;
    value: string;
    onChange: (name: string, value: string) => void;
    unit: string;
    min?: number;
    max?: number;
    step?: number;
}> = ({ label, name, value, onChange, unit, min, max, step = 1 }) => {
    const handleStep = (delta: number) => {
        const current = parseFloat(value) || (min !== undefined ? min : 0);
        let next = current + delta;
        if (min !== undefined) next = Math.max(min, next);
        if (max !== undefined) next = Math.min(max, next);
        const formatted = step < 1 ? next.toFixed(1) : Math.round(next).toString();
        onChange(name, formatted);
    };

    return (
        <div className="flex flex-col">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">{label} ({unit})</label>
            <div className="flex items-center group bg-slate-50 p-1.5 rounded-2xl border border-slate-100 focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:border-brand-500 transition-all shadow-sm">
                <button 
                    type="button"
                    onClick={() => handleStep(-step)}
                    className="w-11 h-11 flex items-center justify-center bg-primary-100 border border-slate-100 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-brand-600 transition-all active:scale-90 shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                    </svg>
                </button>
                <input 
                    type="text" 
                    value={value} 
                    onChange={(e) => onChange(name, e.target.value)}
                    className="w-full px-2 py-2 bg-transparent text-center text-xl font-black text-slate-900 focus:outline-none min-w-[70px] tracking-tighter"
                />
                <button 
                    type="button"
                    onClick={() => handleStep(step)}
                    className="w-11 h-11 flex items-center justify-center bg-primary-100 border border-slate-100 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-brand-600 transition-all active:scale-90 shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

// --- 1. Patient Case Tab ---
interface PatientCaseTabProps {
    encounter: Encounter;
    setEncounter: React.Dispatch<React.SetStateAction<Encounter>>;
    onGenerateDiagnoses: () => void;
    isLoading: boolean;
    error: string | null;
    isLimitedRole?: boolean;
    onNext: () => void;
    onOpenTriage?: () => void;
}
const PatientCaseTab: React.FC<PatientCaseTabProps> = ({ encounter, setEncounter, onGenerateDiagnoses, isLoading, error, isLimitedRole, onNext, onOpenTriage }) => {
    const investigationTemplates = {
        "CBC": "Hemoglobin: \nWBC: \nPlatelets: ",
        "Renal Panel": "Sodium: \nPotassium: \nChloride: \nBicarbonate: \nBUN: \nCreatinine: ",
        "Liver Panel": "AST: \nALT: \nAlkaline Phosphatase: \nBilirubin (Total): \nAlbumin: ",
        "Thyroid Panel": "TSH: \nFree T4: ",
        "ANA": "Result: \nTiter: \nPattern: ",
    };
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadTarget, setUploadTarget] = useState<string | null>(null);
    const [processingImageFor, setProcessingImageFor] = useState<string | null>(null);

    const handlePatientDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (isLimitedRole) return;
        const { name, value } = e.target;
        setEncounter(prev => ({...prev, patientData: {...prev.patientData, [name]: value }}));
    };
    
    const handleInvestigationChange = (key: string, value: string) => {
        setEncounter(prev => ({...prev, patientData: {...prev.patientData, investigations: {...prev.patientData.investigations, [key]: value }}}));
    };

    const handleVitalsChange = (name: string, value: string) => {
        setEncounter(prev => ({
            ...prev, 
            patientData: {
                ...prev.patientData, 
                vitals: {
                    ...prev.patientData.vitals, 
                    [name]: value 
                }
            }
        }));
    };

    const addInvestigation = (templateKey: keyof typeof investigationTemplates) => {
         if (!encounter.patientData.investigations[templateKey]) {
             handleInvestigationChange(templateKey, investigationTemplates[templateKey]);
         }
    };
    
    const removeInvestigation = (key: string) => {
        const newInvestigations = {...encounter.patientData.investigations};
        delete newInvestigations[key];
        setEncounter(prev => ({...prev, patientData: {...prev.patientData, investigations: newInvestigations }}));
    };
    
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    resolve((reader.result as string).split(',')[1]);
                } else {
                    reject(new Error("Failed to convert blob to base64."));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const triggerFileUpload = (target: string) => {
        setUploadTarget(target);
        fileInputRef.current?.click();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadTarget) return;

        setProcessingImageFor(uploadTarget);
        try {
            const base64Data = await blobToBase64(file);
            
            let context = "a medical document";
            if (uploadTarget === 'hopi') context = "a patient's history of present illness notes";
            else if (uploadTarget === 'findings') context = "a clinician's examination findings sheet";
            else if (uploadTarget === 'pmh') context = "a patient's past medical history summary";
            else if (uploadTarget === 'psh') context = "a patient's past surgical history summary";
            else if (uploadTarget === 'allergies') context = "a patient's list of allergies";
            else if (Object.keys(investigationTemplates).includes(uploadTarget)) {
                context = `a lab report for ${uploadTarget}`;
            }

            const extractedText = await extractTextFromImage(base64Data, file.type, context);
            const formattedText = `\n\n--- Extracted from image ---\n${extractedText}`;

            if (['hopi', 'findings', 'pmh', 'psh', 'allergies', 'primaryComplaint'].includes(uploadTarget)) {
                setEncounter(prev => {
                    const currentVal = prev.patientData[uploadTarget as keyof PatientData] as string;
                    return {...prev, patientData: {...prev.patientData, [uploadTarget]: currentVal + formattedText}};
                });
            } else { // It's an investigation
                 setEncounter(prev => {
                     const currentVal = prev.patientData.investigations[uploadTarget] || '';
                     return {...prev, patientData: {...prev.patientData, investigations: {...prev.patientData.investigations, [uploadTarget]: currentVal + formattedText }}};
                 });
            }

        } catch (err) {
            console.error("Image analysis failed:", err);
            alert(`Image analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setProcessingImageFor(null);
            setUploadTarget(null);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input
        }
    };


    const isFormValid = encounter.patientData.age && encounter.patientData.primaryComplaint;
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" capture="environment" className="hidden" />
            
            {/* Left Column: Demographics & Vitals */}
            <div className="lg:col-span-4 space-y-8">
                {encounter.triage && (
                    <div 
                        onClick={onOpenTriage}
                        className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-lg cursor-pointer hover:border-cyan-500/50 transition-all group"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Emergency Triage (ESI 1–5)</span>
                            <span className="text-[10px] text-slate-400 group-hover:text-cyan-400 font-bold">Open Full Triage ➔</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <span className={`w-3 h-3 rounded-full ${
                                encounter.triage.level === 1 ? 'bg-rose-500 animate-ping' :
                                encounter.triage.level === 2 ? 'bg-amber-500 animate-pulse' :
                                'bg-yellow-500'
                            }`}></span>
                            <div className="text-base font-black">
                                Level {encounter.triage.level}: {encounter.triage.acuityName.split(' ')[0]}
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 ml-auto">
                                {encounter.triage.targetTimeMinutes === 0 ? 'STAT' : `< ${encounter.triage.targetTimeMinutes}m`}
                            </span>
                        </div>
                    </div>
                )}
                <div className="bg-primary-100 p-6 md:p-8 rounded-2xl md:rounded-[3rem] border border-slate-100 shadow-sm animate-slide-up" style={{ animationDelay: '0ms' }}>
                    <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                        <div className="p-2.5 md:p-3 bg-brand-50 text-brand-600 rounded-xl md:rounded-2xl">
                            <UserGroupIcon className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <h3 className="font-bold text-slate-900 tracking-tight text-base md:text-lg font-display">Demographics</h3>
                    </div>
                    
                    <div className="space-y-5 md:space-y-6">
                        <div className="group">
                            <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Patient Name</label>
                            <input 
                                name="name" 
                                value={encounter.patientData.name} 
                                onChange={handlePatientDataChange} 
                                disabled={isLimitedRole} 
                                placeholder="Full Name"
                                className="input-field !py-3 md:!py-3.5 text-sm md:text-base" 
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                            <div className="group">
                                <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Age</label>
                                <input 
                                    name="age" 
                                    type="number" 
                                    value={encounter.patientData.age} 
                                    onChange={handlePatientDataChange} 
                                    disabled={isLimitedRole} 
                                    placeholder="Years"
                                    className="input-field !py-3 md:!py-3.5 text-sm md:text-base" 
                                    required
                                />
                            </div>
                            <div className="group">
                                <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Sex</label>
                                <select 
                                    name="sex" 
                                    value={encounter.patientData.sex} 
                                    onChange={handlePatientDataChange} 
                                    disabled={isLimitedRole} 
                                    className="input-field !py-3 md:!py-3.5 text-sm md:text-base appearance-none cursor-pointer"
                                >
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-primary-100 p-6 md:p-8 rounded-2xl md:rounded-[3rem] border border-slate-100 shadow-sm animate-slide-up" style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                        <div className="p-2.5 md:p-3 bg-rose-50 text-rose-600 rounded-xl md:rounded-2xl">
                            <HeartPulseIcon className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <h3 className="font-bold text-slate-900 tracking-tight text-base md:text-lg font-display">Vital Signs</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                        <VitalInput label="Temp" name="temp" value={encounter.patientData.vitals.temp} onChange={handleVitalsChange} unit="°C" min={30} max={45} step={0.1} />
                        <VitalInput label="HR" name="hr" value={encounter.patientData.vitals.hr} onChange={handleVitalsChange} unit="bpm" min={20} max={250} />
                        <VitalInput label="RR" name="rr" value={encounter.patientData.vitals.rr} onChange={handleVitalsChange} unit="br/m" min={4} max={60} />
                        <VitalInput label="SpO2" name="spo2" value={encounter.patientData.vitals.spo2} onChange={handleVitalsChange} unit="%" min={50} max={100} />
                        <div className="col-span-2 group">
                            <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">BP (mmHg)</label>
                            <input 
                                name="bp" 
                                value={encounter.patientData.vitals.bp} 
                                onChange={(e) => handleVitalsChange('bp', e.target.value)} 
                                placeholder="e.g. 120/80" 
                                className="w-full px-4 md:px-5 py-3 md:py-3.5 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-brand-500/10 outline-none transition-all font-bold text-slate-900 text-center text-base md:text-lg tracking-tighter placeholder:text-slate-300" 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Clinical Details */}
            <div className="lg:col-span-8 space-y-6 md:space-y-8">
                <div className="bg-primary-100 p-6 md:p-8 rounded-2xl md:rounded-[3rem] border border-slate-100 shadow-sm animate-slide-up" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center justify-between mb-6 md:mb-8">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="p-2.5 md:p-3 bg-amber-50 text-amber-600 rounded-xl md:rounded-2xl">
                                <ClipboardDocumentListIcon className="h-5 w-5 md:h-6 md:w-6" />
                            </div>
                            <h3 className="font-bold text-slate-900 tracking-tight text-base md:text-lg font-display">Clinical Presentation</h3>
                        </div>
                    </div>

                    <div className="space-y-6 md:space-y-8">
                        <div className="group relative">
                            <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Primary Complaint</label>
                            <div className="relative">
                                <textarea 
                                    name="primaryComplaint" 
                                    value={encounter.patientData.primaryComplaint} 
                                    onChange={handlePatientDataChange} 
                                    disabled={isLimitedRole} 
                                    placeholder="What is the main reason for this visit?"
                                    className="w-full px-5 md:px-6 py-4 md:py-5 bg-slate-50 border border-slate-100 rounded-xl md:rounded-[2rem] focus:ring-4 focus:ring-brand-500/10 outline-none transition-all font-bold text-slate-700 min-h-[100px] md:min-h-[120px] resize-none placeholder:text-slate-300 text-sm md:text-base"
                                />
                                <button 
                                    onClick={() => triggerFileUpload('primaryComplaint')}
                                    className="absolute bottom-3 right-3 md:bottom-4 md:right-4 p-2.5 md:p-3 bg-primary-100 text-slate-400 hover:text-brand-600 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-90"
                                >
                                    {processingImageFor === 'primaryComplaint' ? <ArrowPathIcon className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <CameraIcon className="h-4 w-4 md:h-5 md:w-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            <div className="group relative">
                                <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">History (HOPI)</label>
                                <div className="relative">
                                    <textarea 
                                        name="hopi" 
                                        value={encounter.patientData.hopi} 
                                        onChange={handlePatientDataChange} 
                                        disabled={isLimitedRole} 
                                        placeholder="Detailed history of present illness..."
                                        className="w-full px-5 md:px-6 py-4 md:py-5 bg-slate-50 border border-slate-100 rounded-xl md:rounded-[2rem] focus:ring-4 focus:ring-brand-500/10 outline-none transition-all font-medium text-slate-600 min-h-[150px] md:min-h-[180px] resize-none placeholder:text-slate-300 text-sm md:text-base"
                                    />
                                    <button 
                                        onClick={() => triggerFileUpload('hopi')}
                                        className="absolute bottom-3 right-3 md:bottom-4 md:right-4 p-2.5 md:p-3 bg-primary-100 text-slate-400 hover:text-brand-600 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-90"
                                    >
                                        {processingImageFor === 'hopi' ? <ArrowPathIcon className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <CameraIcon className="h-4 w-4 md:h-5 md:w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="group relative">
                                <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Examination Findings</label>
                                <div className="relative">
                                    <textarea 
                                        name="findings" 
                                        value={encounter.patientData.findings} 
                                        onChange={handlePatientDataChange} 
                                        disabled={isLimitedRole} 
                                        placeholder="Physical exam findings..."
                                        className="w-full px-5 md:px-6 py-4 md:py-5 bg-slate-50 border border-slate-100 rounded-xl md:rounded-[2rem] focus:ring-4 focus:ring-brand-500/10 outline-none transition-all font-medium text-slate-600 min-h-[150px] md:min-h-[180px] resize-none placeholder:text-slate-300 text-sm md:text-base"
                                    />
                                    <button 
                                        onClick={() => triggerFileUpload('findings')}
                                        className="absolute bottom-3 right-3 md:bottom-4 md:right-4 p-2.5 md:p-3 bg-primary-100 text-slate-400 hover:text-brand-600 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-90"
                                    >
                                        {processingImageFor === 'findings' ? <ArrowPathIcon className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <CameraIcon className="h-4 w-4 md:h-5 md:w-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                             <div className="group relative">
                                <label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">PMH</label>
                                <div className="relative">
                                    <textarea 
                                        name="pmh" 
                                        value={encounter.patientData.pmh} 
                                        onChange={handlePatientDataChange} 
                                        disabled={isLimitedRole} 
                                        placeholder="Past medical history..."
                                        className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-brand-500/10 outline-none transition-all font-medium text-slate-600 min-h-[100px] resize-none text-xs"
                                    />
                                    <button onClick={() => triggerFileUpload('pmh')} className="absolute bottom-2 right-2 p-2 bg-primary-100 text-slate-400 hover:text-brand-600 rounded-xl shadow-sm border border-slate-100 transition-all">
                                        {processingImageFor === 'pmh' ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CameraIcon className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="group relative">
                                <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">PSH</label>
                                <div className="relative">
                                    <textarea 
                                        name="psh" 
                                        value={encounter.patientData.psh} 
                                        onChange={handlePatientDataChange} 
                                        disabled={isLimitedRole} 
                                        placeholder="Past surgical history..."
                                        className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-medium text-slate-600 min-h-[100px] resize-none text-xs"
                                    />
                                    <button onClick={() => triggerFileUpload('psh')} className="absolute bottom-2 right-2 p-2 bg-primary-100 text-slate-400 hover:text-primary-600 rounded-xl shadow-sm border border-slate-100 transition-all">
                                        {processingImageFor === 'psh' ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CameraIcon className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="group relative">
                                <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Allergies</label>
                                <div className="relative">
                                    <textarea 
                                        name="allergies" 
                                        value={encounter.patientData.allergies} 
                                        onChange={handlePatientDataChange} 
                                        disabled={isLimitedRole} 
                                        placeholder="Known allergies..."
                                        className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-medium text-slate-600 min-h-[100px] resize-none text-xs"
                                    />
                                    <button onClick={() => triggerFileUpload('allergies')} className="absolute bottom-2 right-2 p-2 bg-primary-100 text-slate-400 hover:text-primary-600 rounded-xl shadow-sm border border-slate-100 transition-all">
                                        {processingImageFor === 'allergies' ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CameraIcon className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-primary-100 p-6 md:p-8 rounded-2xl md:rounded-[3rem] border border-slate-100 shadow-sm animate-slide-up" style={{ animationDelay: '300ms' }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-4">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="p-2.5 md:p-3 bg-indigo-50 text-indigo-600 rounded-xl md:rounded-2xl">
                                <BeakerIcon className="h-5 w-5 md:h-6 md:w-6" />
                            </div>
                            <h3 className="font-bold text-slate-900 tracking-tight text-base md:text-lg font-display">Investigations & Labs</h3>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(investigationTemplates).map((key) => (
                                <button 
                                    key={key}
                                    onClick={() => addInvestigation(key as keyof typeof investigationTemplates)}
                                    className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-50 text-slate-500 hover:bg-brand-50 hover:text-brand-600 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all border border-slate-100"
                                >
                                    + {key}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {Object.keys(encounter.patientData.investigations).length === 0 ? (
                            <div className="py-8 md:py-12 text-center bg-slate-50/50 rounded-xl md:rounded-[2rem] border-2 border-dashed border-slate-100">
                                <p className="text-xs md:text-sm text-slate-400 font-bold">No investigations added yet.</p>
                                <p className="text-[9px] md:text-[10px] text-slate-300 uppercase tracking-widest mt-1">Select a template above to begin</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                {Object.entries(encounter.patientData.investigations).map(([key, value]) => (
                                    <div key={key} className="group relative bg-slate-50 p-5 md:p-6 rounded-xl md:rounded-[2rem] border border-slate-100 transition-all hover:shadow-lg hover:shadow-slate-100">
                                        <div className="flex items-center justify-between mb-3 md:mb-4">
                                            <h4 className="text-[10px] md:text-xs font-bold text-slate-900 uppercase tracking-widest">{key}</h4>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => triggerFileUpload(key)}
                                                    className="p-1.5 md:p-2 bg-primary-100 text-slate-400 hover:text-brand-600 rounded-lg md:rounded-xl shadow-sm border border-slate-100 transition-all"
                                                >
                                                    {processingImageFor === key ? <ArrowPathIcon className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" /> : <CameraIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />}
                                                </button>
                                                <button 
                                                    onClick={() => removeInvestigation(key)}
                                                    className="p-1.5 md:p-2 bg-primary-100 text-slate-400 hover:text-rose-500 rounded-lg md:rounded-xl shadow-sm border border-slate-100 transition-all"
                                                >
                                                    <TrashIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <textarea 
                                            value={value} 
                                            onChange={(e) => handleInvestigationChange(key, e.target.value)}
                                            className="w-full bg-transparent border-none focus:ring-0 text-xs md:text-sm font-medium text-slate-600 min-h-[100px] md:min-h-[120px] resize-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl md:rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-slide-up" style={{ animationDelay: '400ms' }}>
                    <div className="p-6 md:p-10">
                        <div className="flex items-center mb-5 md:mb-6">
                            <div className="bg-brand-500/20 p-2.5 md:p-3 rounded-xl md:rounded-2xl mr-3 md:mr-4">
                                <SparklesIcon className="h-6 w-6 md:h-8 md:w-8 text-brand-400"/>
                            </div>
                            <div>
                                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight font-display">AI Diagnostic Engine</h3>
                                <p className="text-[9px] md:text-[10px] text-brand-400 uppercase tracking-[0.2em] font-bold">Powered by Gemini 3.1 Flash</p>
                            </div>
                        </div>
                        <p className="text-xs md:text-sm text-slate-300 mb-6 md:mb-8 leading-relaxed font-medium">Analyze the patient's symptoms, history, and lab results to generate a list of potential differential diagnoses with evidence-based treatment suggestions.</p>
                        <button 
                            onClick={onGenerateDiagnoses} 
                            disabled={!isFormValid || isLoading || !!processingImageFor} 
                            className="w-full flex items-center justify-center bg-brand-600 text-white font-bold py-4 md:py-5 px-6 md:px-8 rounded-xl md:rounded-2xl shadow-xl shadow-brand-900/40 hover:bg-brand-500 disabled:bg-slate-700 disabled:text-slate-500 transition-all active:scale-95 group text-xs md:text-sm uppercase tracking-widest"
                        >
                            {isLoading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 md:h-5 md:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Analyzing Case...
                                </span>
                            ) : (
                                <>
                                    Generate AI Analysis
                                    <SparklesIcon className="h-4 w-4 md:h-5 md:w-5 ml-2 md:ml-3 group-hover:animate-pulse"/>
                                </>
                            )}
                        </button>
                        {!isFormValid && (
                            <p className="mt-3 text-[11px] text-amber-400/90 text-center font-medium">
                                💡 Tip: Please provide at least Patient Age and Primary Complaint to enable AI diagnosis.
                            </p>
                        )}
                        {error && (
                            <div className="mt-4 md:mt-6 p-3 md:p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl md:rounded-2xl flex items-start">
                                <ExclamationCircleIcon className="h-4 w-4 md:h-5 md:w-5 text-rose-400 mr-2 md:mr-3 flex-shrink-0 mt-0.5"/>
                                <p className="text-rose-200 text-[10px] md:text-xs font-medium">{error}</p>
                            </div>
                        )}
                    </div>
                </div>

                <NextStepButton onClick={onNext} label={isLimitedRole ? "Next: Daily Progress" : "Next: Diagnosis & Treatment"} />
            </div>
        </div>
    );
};

// --- 2. Diagnosis & Treatment Tab ---
interface DiagnosisTreatmentTabProps {
    encounter: Encounter;
    setEncounter: React.Dispatch<React.SetStateAction<Encounter>>;
    onNext: () => void;
}
const DiagnosisTreatmentTab: React.FC<DiagnosisTreatmentTabProps> = ({ encounter, setEncounter, onNext }) => {
    const [medicationSuggestions, setMedicationSuggestions] = useState<MedicationSuggestion[]>([]);
    const [isSuggestingMeds, setIsSuggestingMeds] = useState(false);
    const [suggestionError, setSuggestionError] = useState<string | null>(null);
    const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState<MedicationSuggestion | undefined>(undefined);
    const [editingTreatment, setEditingTreatment] = useState<Treatment | undefined>(undefined);
    
    const setFinalDiagnosis = (dx: Diagnosis) => {
        setEncounter(prev => ({...prev, finalDiagnosis: dx }));
    };

    const handleSuggestMedications = async () => {
        if (!encounter.finalDiagnosis) return;
        setIsSuggestingMeds(true);
        setSuggestionError(null);
        setMedicationSuggestions([]);
        try {
            const suggestions = await suggestMedications(encounter.finalDiagnosis.diagnosisName);
            setMedicationSuggestions(suggestions);
        } catch (err) {
            setSuggestionError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSuggestingMeds(false);
        }
    };

    const openAddTreatment = (sugg?: MedicationSuggestion) => {
        setSelectedSuggestion(sugg);
        setEditingTreatment(undefined);
        setIsTreatmentModalOpen(true);
    };

    const openEditTreatment = (tx: Treatment) => {
        setEditingTreatment(tx);
        setSelectedSuggestion(undefined);
        setIsTreatmentModalOpen(true);
    };

    const handleSaveTreatment = (treatment: Treatment) => {
        setEncounter(prev => {
            const existingIndex = prev.treatments.findIndex(t => t.id === treatment.id);
            if (existingIndex >= 0) {
                const updatedTreatments = [...prev.treatments];
                updatedTreatments[existingIndex] = treatment;
                return { ...prev, treatments: updatedTreatments };
            } else {
                return { ...prev, treatments: [...prev.treatments, treatment] };
            }
        });
        setIsTreatmentModalOpen(false);
    };

    const toggleTreatmentStatus = (id: string) => {
        setEncounter(prev => ({...prev, treatments: prev.treatments.map(tx => 
            tx.id === id ? {...tx, isActive: !tx.isActive, history: [...tx.history, { date: Date.now(), reason: tx.isActive ? 'Deactivated' : 'Reactivated'}]} : tx
        )}));
    };

    return (
        <div className="space-y-6">
            <ModuleCard title="Provisional Diagnoses" icon={<BeakerIcon className="h-6 w-6"/>} initialOpen>
                 {encounter.provisionalDiagnoses.length > 0 ? (
                    <div className="space-y-4">
                        {encounter.provisionalDiagnoses.map((dx, index) => (
                           <div key={index} className="relative">
                               <DiagnosisCard diagnosis={dx} index={index} />
                               {!encounter.finalDiagnosis && (
                                   <button onClick={() => setFinalDiagnosis(dx)} className="absolute top-3 right-3 text-xs bg-green-600 text-white font-semibold px-2 py-1 rounded-md hover:bg-green-700">
                                       Set as Final
                                   </button>
                               )}
                           </div>
                        ))}
                    </div>
                ) : <p className="text-slate-500">No provisional diagnoses generated yet. Go to the 'Patient Case' tab to generate them.</p> }
            </ModuleCard>

            <ModuleCard title="Final Diagnosis & Treatment Plan" icon={<PillIcon className="h-6 w-6"/>} initialOpen>
                 {encounter.finalDiagnosis ? (
                    <div className="p-10 bg-brand-50 border border-brand-100 rounded-[2.5rem] mb-10 shadow-sm relative overflow-hidden group/final">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/5 rounded-full -mr-20 -mt-20 blur-3xl transition-all group-hover/final:scale-150"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-2 h-2 bg-brand-500 rounded-full shadow-[0_0_8px_rgba(14,145,233,0.6)]"></div>
                                    <span className="text-[10px] font-bold text-brand-600 uppercase tracking-[0.3em]">Confirmed Diagnosis</span>
                                </div>
                                <h4 className="font-black text-3xl text-brand-950 font-display tracking-tight">{encounter.finalDiagnosis.diagnosisName}</h4>
                                <div className="flex items-center gap-4 mt-4">
                                    <span className="px-4 py-1.5 bg-primary-100 text-brand-600 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-brand-100 shadow-sm">ICD: {encounter.finalDiagnosis.icdCode}</span>
                                    <span className="text-brand-200 text-[10px]">•</span>
                                    <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">Confidence: {encounter.finalDiagnosis.probability}%</span>
                                </div>
                            </div>
                            <button 
                                onClick={handleSuggestMedications} 
                                disabled={isSuggestingMeds}
                                className="flex items-center gap-3 bg-brand-600 text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 disabled:bg-slate-400 transition-all active:scale-95 group/btn text-xs uppercase tracking-widest"
                            >
                                <SparklesIcon className="h-5 w-5 group-hover/btn:animate-pulse"/>
                                {isSuggestingMeds ? 'Analyzing Protocols...' : 'AI Medication Strategy'}
                            </button>
                        </div>
                    </div>
                 ) : (
                    <div className="p-10 bg-slate-50 border border-slate-100 rounded-[2.5rem] mb-10 text-center border-dashed">
                        <p className="text-slate-400 text-sm font-bold italic">No final diagnosis has been confirmed yet.</p>
                        <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-2">Select a provisional diagnosis above to finalize the plan</p>
                    </div>
                 )}
                 
                {isSuggestingMeds && (
                    <div className="text-center p-8">
                        <ArrowPathIcon className="h-8 w-8 text-brand-600 mx-auto animate-spin" />
                    </div>
                )}
                {suggestionError && <p className="text-rose-600 text-sm font-bold mb-4">{suggestionError}</p>}
                {medicationSuggestions.length > 0 && (
                    <div className="mb-8 space-y-4">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">AI Medication Suggestions</h4>
                        {medicationSuggestions.map((sugg, index) => (
                            <div key={index} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex justify-between items-start group hover:shadow-lg hover:shadow-slate-100 transition-all">
                                <div>
                                    <p className="font-bold text-slate-900">{sugg.drugName} <span className="font-medium text-slate-500 text-sm ml-2">{sugg.dosage}</span></p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">{sugg.line}</span>
                                        <span className="text-slate-200 text-[10px]">•</span>
                                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{sugg.guideline}</span>
                                    </div>
                                    <p className="text-sm mt-3 text-slate-600 leading-relaxed"><strong>Rationale:</strong> {sugg.rationale}</p>
                                </div>
                                <button onClick={() => openAddTreatment(sugg)} className="text-[10px] bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 ml-4 flex-shrink-0 transition-all active:scale-90 uppercase tracking-widest">
                                    Add to Plan
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                 <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Current Treatments</h4>
                 <div className="space-y-4">
                     {encounter.treatments.map(tx => (
                        <div key={tx.id} className={`p-6 rounded-2xl border transition-all ${tx.isActive ? 'bg-primary-100 border-slate-100 shadow-sm hover:shadow-md' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                             <div className="flex justify-between items-start">
                                <div className="cursor-pointer flex-1" onClick={() => openEditTreatment(tx)}>
                                    <p className="font-bold text-slate-900">{tx.drugName} <span className="font-medium text-slate-500 text-sm ml-2">{tx.dosage}</span></p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tx.line}</span>
                                        <span className="text-slate-200 text-[10px]">•</span>
                                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{tx.duration}</span>
                                    </div>
                                    <p className="text-sm mt-3 text-slate-600 leading-relaxed"><strong>Rationale:</strong> {tx.rationale}</p>
                                    {!tx.guidelineFollowed && tx.deviationReason && (
                                        <div className="mt-3 p-3 bg-accent-50 rounded-xl border border-accent-100">
                                            <p className="text-[10px] text-accent-700 font-bold uppercase tracking-widest mb-1">Reason for Deviation</p>
                                            <p className="text-xs text-accent-600 italic leading-relaxed">{tx.deviationReason}</p>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => toggleTreatmentStatus(tx.id)} className={`px-4 py-2 text-[10px] font-bold rounded-xl transition-all active:scale-90 uppercase tracking-widest ml-4 ${tx.isActive ? 'bg-accent-100 text-accent-700 hover:bg-accent-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                                    {tx.isActive ? 'Deactivate' : 'Reactivate'}
                                </button>
                             </div>
                        </div>
                    ))}
                 </div>
                 <div className="mt-8 pt-8 border-t border-slate-50">
                    <button onClick={() => openAddTreatment()} className="flex items-center text-xs bg-slate-900 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-widest">
                        <PlusCircleIcon className="h-5 w-5 mr-3"/> Add New Treatment
                    </button>
                 </div>
            </ModuleCard>
            {isTreatmentModalOpen && (
                <TreatmentModal 
                    onClose={() => setIsTreatmentModalOpen(false)} 
                    onSave={handleSaveTreatment} 
                    suggestion={selectedSuggestion}
                    initialTreatment={editingTreatment}
                />
            )}

            <div className="mt-10">
                <OngoingTreatmentManager 
                    encounter={encounter} 
                    onUpdateEncounter={(updated) => setEncounter(updated)} 
                />
            </div>

            <NextStepButton onClick={onNext} label="Next: Next Recommendations AI" />

        </div>
    );
};

// --- 3. Progress Monitoring Tab ---
interface ProgressMonitoringTabProps {
    encounter: Encounter;
    setEncounter: React.Dispatch<React.SetStateAction<Encounter>>;
    isLimitedRole?: boolean;
    onNext: () => void;
}

// Simple Line Chart Component
const LineChart: React.FC<{ data: { value: number; label: string }[], color: string }> = ({ data, color }) => {
    if (data.length < 2) return <div className="text-center text-sm text-slate-400 h-[100px] flex items-center justify-center">Not enough data for a trend line.</div>;
    const width = 300, height = 100, padding = 20;
    const values = data.map(d => d.value);
    const min = Math.min(...values) * 0.95;
    const max = Math.max(...values) * 1.05;

    const points = data.map((point, i) => {
        const x = (width - padding * 2) / (data.length - 1) * i + padding;
        const y = height - padding - ((point.value - min) / (max - min)) * (height - padding * 2);
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
            {data.map((point, i) => {
                 const x = (width - padding * 2) / (data.length - 1) * i + padding;
                 const y = height - padding - ((point.value - min) / (max - min)) * (height - padding * 2);
                 return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
            })}
        </svg>
    );
};

const ProgressMonitoringTab: React.FC<ProgressMonitoringTabProps> = ({ encounter, setEncounter, isLimitedRole, onNext }) => {
    const BLANK_VITALS: Vitals = { temp: '', hr: '', rr: '', bp: '', spo2: '' };
    const [newNote, setNewNote] = useState('');
    const [newVitals, setNewVitals] = useState<Vitals>(BLANK_VITALS);
    const [newSymptomScore, setNewSymptomScore] = useState<number>(5);
    const [summary, setSummary] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);

    const handleVitalsChange = (name: string, value: string) => {
        setNewVitals(prev => ({ ...prev, [name]: value }));
    };

    const handleAddVitalsRecord = () => {
        const hasAtLeastOneValue = Object.values(newVitals).some(v => typeof v === 'string' && v.trim() !== '');
        if (!hasAtLeastOneValue) {
            toast.error("Please enter at least one vital sign value.");
            return;
        }
        const vitalsRecord: VitalsRecord = { ...newVitals, timestamp: Date.now() };
        setEncounter(prev => ({
            ...prev,
            vitalsHistory: [vitalsRecord, ...prev.vitalsHistory]
        }));
        setNewVitals(BLANK_VITALS);
        toast.success("Vitals recorded successfully.");
    };

    const addProgressNote = () => {
        if (!newNote.trim()) return;
        const note: ProgressNote = { 
            id: `note-${Date.now()}`, 
            timestamp: Date.now(), 
            note: newNote,
            symptomScore: newSymptomScore
        };
        setEncounter(prev => ({...prev, progressNotes: [note, ...prev.progressNotes]}));
        setNewNote('');
        toast.success("Progress note added.");
    };
    
    const handleGenerateSummary = async () => {
        setIsSummarizing(true);
        try {
            const result = await generateProgressSummary(encounter.progressNotes, encounter.vitalsHistory);
            setSummary(result);
        } catch (error) {
            toast.error("Failed to generate summary.");
        } finally {
            setIsSummarizing(false);
        }
    };

    const bpData = encounter.vitalsHistory.map(v => ({ value: parseInt(v.bp.split('/')[0]) || 0, label: new Date(v.timestamp).toLocaleTimeString() })).reverse();
    const hrData = encounter.vitalsHistory.map(v => ({ value: parseInt(v.hr) || 0, label: new Date(v.timestamp).toLocaleTimeString() })).reverse();
    const symptomScoreData = encounter.progressNotes.filter(n => n.symptomScore !== undefined).map(n => ({ value: n.symptomScore!, label: new Date(n.timestamp).toLocaleTimeString() })).reverse();
    
    return (
        <div className="space-y-8">
            <ModuleCard title="Daily Progress Notes & Symptom Tracker" icon={<PencilSquareIcon className="h-6 w-6"/>} initialOpen>
                {!isLimitedRole ? (
                    <div className="space-y-6">
                        <div className="group">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Clinical Observations</label>
                            <textarea 
                                value={newNote} 
                                onChange={e => setNewNote(e.target.value)} 
                                rows={4} 
                                className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-brand-500/10 outline-none transition-all font-medium text-slate-600 resize-none placeholder:text-slate-300" 
                                placeholder="Enter today's progress, new complaints, or observations..."
                            />
                        </div>
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                                <label htmlFor="symptomScore" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Symptom Severity</label>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${newSymptomScore > 7 ? 'bg-rose-100 text-rose-700' : newSymptomScore > 4 ? 'bg-accent-100 text-accent-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    Score: {newSymptomScore}/10
                                </span>
                            </div>
                            <input 
                                type="range" 
                                id="symptomScore" 
                                min="1" 
                                max="10" 
                                value={newSymptomScore} 
                                onChange={e => setNewSymptomScore(parseInt(e.target.value))} 
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                            />
                            <div className="flex justify-between mt-2 px-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Mild</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Severe</span>
                            </div>
                        </div>
                        <button onClick={addProgressNote} className="flex items-center text-xs bg-brand-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl shadow-brand-200 hover:bg-brand-700 transition-all active:scale-95 uppercase tracking-widest">
                            <PlusCircleIcon className="h-5 w-5 mr-3"/> Add Progress Note
                        </button>
                    </div>
                ) : (
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 text-sm font-medium italic flex items-center gap-3">
                        <ExclamationCircleIcon className="h-5 w-5 text-slate-400" />
                        Progress notes can only be added by clinicians.
                    </div>
                )}
                <div className="mt-8 pt-8 border-t border-slate-50 max-h-[500px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {encounter.progressNotes.length === 0 ? (
                        <p className="text-center py-8 text-slate-400 text-sm font-medium italic">No progress notes recorded yet.</p>
                    ) : (
                        encounter.progressNotes.map(note => (
                            <div key={note.id} className="bg-primary-100 p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                 <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(note.timestamp).toLocaleString()}</p>
                                    </div>
                                    {note.symptomScore && (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${note.symptomScore > 7 ? 'bg-rose-50 text-rose-600' : note.symptomScore > 4 ? 'bg-accent-50 text-accent-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            Severity: {note.symptomScore}
                                        </span>
                                    )}
                                 </div>
                                 <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">{note.note}</p>
                            </div>
                        ))
                    )}
                </div>
            </ModuleCard>

            <ModuleCard title="Vital Signs Monitoring" icon={<HeartPulseIcon className="h-6 w-6"/>} initialOpen>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-10">
                    <VitalInput label="Temp" name="temp" value={newVitals.temp} onChange={handleVitalsChange} unit="°C" min={30} max={45} step={0.1} />
                    <VitalInput label="HR" name="hr" value={newVitals.hr} onChange={handleVitalsChange} unit="bpm" min={20} max={250} />
                    <VitalInput label="RR" name="rr" value={newVitals.rr} onChange={handleVitalsChange} unit="br/m" min={4} max={60} />
                    <VitalInput label="SpO2" name="spo2" value={newVitals.spo2} onChange={handleVitalsChange} unit="%" min={50} max={100} />
                    <div className="col-span-2 md:col-span-1 group">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">BP (mmHg)</label>
                        <input 
                            name="bp" 
                            value={newVitals.bp} 
                            onChange={(e) => handleVitalsChange('bp', e.target.value)} 
                            placeholder="120/80" 
                            className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xl font-black text-slate-900 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all text-center placeholder:text-slate-300 shadow-sm" 
                        />
                    </div>
                </div>
                <button onClick={handleAddVitalsRecord} className="flex items-center text-xs bg-brand-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-xl shadow-brand-200 hover:bg-brand-700 transition-all active:scale-95 uppercase tracking-widest">
                    <PlusCircleIcon className="h-5 w-5 mr-3"/> Record Vitals
                </button>
                
                <div className="mt-12">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Vitals History</h4>
                    <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 font-bold tracking-widest">Timestamp</th>
                                        <th className="px-6 py-4 font-bold tracking-widest">BP</th>
                                        <th className="px-6 py-4 font-bold tracking-widest">HR</th>
                                        <th className="px-6 py-4 font-bold tracking-widest">RR</th>
                                        <th className="px-6 py-4 font-bold tracking-widest">SpO2</th>
                                        <th className="px-6 py-4 font-bold tracking-widest">Temp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {encounter.vitalsHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic bg-primary-100">No vitals recorded yet.</td>
                                        </tr>
                                    ) : (
                                        encounter.vitalsHistory.map(v => (
                                            <tr key={v.timestamp} className="bg-primary-100 hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-900">{new Date(v.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                <td className="px-6 py-4 font-medium text-slate-600">{v.bp || '-'}</td>
                                                <td className="px-6 py-4 font-medium text-slate-600">{v.hr || '-'}</td>
                                                <td className="px-6 py-4 font-medium text-slate-600">{v.rr || '-'}</td>
                                                <td className="px-6 py-4">
                                                    {v.spo2 ? (
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${parseInt(v.spo2) < 94 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                            {v.spo2}%
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-600">{v.temp ? `${v.temp}°C` : '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </ModuleCard>

            <ModuleCard title="Clinical Trends & Insights" icon={<ChartPieIcon className="h-6 w-6"/>}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                Systolic BP Trend (mmHg)
                            </h5>
                            <LineChart data={bpData} color="#f43f5e" />
                        </div>
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                                Heart Rate Trend (bpm)
                            </h5>
                            <LineChart data={hrData} color="#6366f1" />
                        </div>
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                Symptom Severity Trend
                            </h5>
                            <LineChart data={symptomScoreData} color="#10b981" />
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="p-8 bg-brand-900 rounded-[2.5rem] text-white shadow-2xl shadow-brand-200 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-brand-500/20 transition-all"></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-brand-500/20 rounded-2xl">
                                        <SparklesIcon className="h-6 w-6 text-brand-300" />
                                    </div>
                                    <h4 className="text-xl font-bold font-display">AI Progress Summary</h4>
                                </div>
                                
                                <p className="text-sm text-brand-100/80 mb-8 leading-relaxed font-medium">
                                    Generate an intelligent summary of the patient's progress based on clinical notes and vital sign trends.
                                </p>
                                
                                <button 
                                    onClick={handleGenerateSummary} 
                                    disabled={isSummarizing || encounter.progressNotes.length === 0} 
                                    className="w-full flex items-center justify-center bg-primary-100 text-brand-900 font-bold py-4 px-6 rounded-2xl shadow-xl hover:bg-brand-50 disabled:bg-brand-800 disabled:text-brand-400 transition-all active:scale-95 uppercase tracking-widest text-xs"
                                >
                                   {isSummarizing ? (
                                       <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                   ) : (
                                       <>Generate AI Summary <SparklesIcon className="h-4 w-4 ml-2" /></>
                                   )}
                                </button>
                                
                                {summary && (
                                    <div className="mt-8 p-6 bg-primary-100/10 backdrop-blur-md rounded-2xl border border-white/10 animate-fade-in">
                                        <p className="text-sm text-brand-50 leading-relaxed font-medium italic">"{summary}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </ModuleCard>
            <NextStepButton onClick={onNext} label={isLimitedRole ? "Back to Patient Case" : "Next: AI Analysis"} />
        </div>
    );
};

// --- 4. AI Analysis Tab ---
interface AIAnalysisTabProps {
    encounter: Encounter;
    setEncounter: React.Dispatch<React.SetStateAction<Encounter>>;
    onNext: () => void;
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

const AIAnalysisTab: React.FC<AIAnalysisTabProps> = ({ encounter, setEncounter, onNext }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { 
            role: 'model', 
            text: `Hello, I am your Telemedicine AI assistant. I've analyzed the case for **${encounter.patientData.name || 'this patient'}**. \n\nHow can I help you today? We can discuss the differential diagnoses, rule out specific conditions, or suggest further investigations.`, 
            timestamp: Date.now() 
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await chatWithAI(encounter, [...messages, userMsg].map(m => ({ role: m.role, text: m.text })));
            const modelMsg: ChatMessage = { role: 'model', text: response, timestamp: Date.now() };
            setMessages(prev => [...prev, modelMsg]);
        } catch (error) {
            toast.error("AI Chat failed. Please try again.");
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="insta-card h-[750px] flex flex-col bg-primary-100 overflow-hidden border border-slate-100 shadow-2xl shadow-slate-200/40 rounded-[3.5rem] relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 via-brand-600 to-brand-400"></div>
                <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-primary-100/80 backdrop-blur-xl sticky top-0 z-10">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-brand-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse"></div>
                            <div className="relative p-5 bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-2xl shadow-xl shadow-brand-200 transition-transform group-hover:scale-110">
                                <CpuChipIcon className="h-7 w-7" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full shadow-sm"></div>
                        </div>
                        <div>
                            <h3 className="font-black text-slate-950 tracking-tight font-display text-2xl">Clinical AI Assistant</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-[0.2em]">Active Protocol</span>
                                </div>
                                <span className="text-slate-200 text-[10px]">•</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Neural Engine 4.0</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setMessages([messages[0]])} 
                        className="px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-95 border border-transparent hover:border-rose-100"
                    >
                        Reset Session
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-12 space-y-12 bg-gradient-to-b from-slate-50/30 to-white custom-scrollbar">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                            <div className={`max-w-[85%] flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg transition-transform hover:scale-110 ${msg.role === 'user' ? 'bg-brand-600 text-white shadow-brand-500/20' : 'bg-primary-100 border border-slate-100 text-brand-600 shadow-slate-200/50'}`}>
                                    {msg.role === 'user' ? <UserIcon className="h-7 w-7" /> : <CpuChipIcon className="h-7 w-7" />}
                                </div>
                                <div className={`p-8 rounded-[2.5rem] shadow-sm text-sm leading-relaxed relative ${
                                    msg.role === 'user' 
                                        ? 'bg-brand-600 text-white rounded-tr-none shadow-xl shadow-brand-500/10' 
                                        : 'bg-primary-100 border border-slate-100 text-slate-700 rounded-tl-none'
                                }`}>
                                    <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'prose-slate'}`}>
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    </div>
                                    <div className={`flex items-center gap-2 mt-6 opacity-40 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <span className="text-[9px] font-bold uppercase tracking-[0.2em]">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {msg.role === 'model' && <div className="w-1 h-1 bg-brand-400 rounded-full"></div>}
                                        {msg.role === 'model' && <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Verified</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start animate-pulse">
                            <div className="bg-primary-100 border border-slate-100 p-8 rounded-[2.5rem] rounded-tl-none shadow-sm flex gap-3 items-center">
                                <div className="w-3 h-3 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-3 h-3 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-3 h-3 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-10 bg-primary-100 border-t border-slate-50">
                    <form onSubmit={handleSendMessage} className="flex gap-6 items-center bg-slate-50 p-4 rounded-[3rem] border border-slate-100 focus-within:ring-[12px] focus-within:ring-brand-500/5 focus-within:border-brand-500/20 transition-all">
                        <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Discuss clinical findings, rule out diagnoses, or ask for protocol advice..."
                            className="flex-1 bg-transparent border-none rounded-2xl px-6 py-4 text-base font-medium text-slate-800 focus:outline-none placeholder:text-slate-400"
                        />
                        <button 
                            type="submit"
                            disabled={!input.trim() || isTyping}
                            className="bg-brand-600 text-white w-16 h-16 flex items-center justify-center rounded-full shadow-2xl shadow-brand-500/30 hover:bg-brand-700 disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-90 group"
                        >
                            <PaperAirplaneIcon className="h-7 w-7 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </form>
                </div>
            </div>
            
            <div className="flex justify-between items-center px-4">
                <div className="flex items-center gap-3 text-slate-400">
                    <ExclamationCircleIcon className="h-5 w-5" />
                    <p className="text-xs font-medium italic">AI suggestions are for decision support only.</p>
                </div>
                <NextStepButton onClick={onNext} label="Next: Reports" />
            </div>
        </div>
    );
};

// --- 5. Reports Tab ---
interface ReportsTabProps {
    encounter: Encounter;
    setEncounter: React.Dispatch<React.SetStateAction<Encounter>>;
    doctorDetails: DoctorDetails;
    onNext: () => void;
}
const ReportsTab: React.FC<ReportsTabProps> = ({ encounter, setEncounter, doctorDetails, onNext }) => {
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
    const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
    const [isLamaModalOpen, setIsLamaModalOpen] = useState(false);
    const [isAnalyzingReport, setIsAnalyzingReport] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGenerateComprehensiveReport = (details: DoctorDetails, modules: ReportModules) => {
        generateComprehensivePdf(encounter.patientData, encounter.provisionalDiagnoses, details, modules);
    };

    const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzingReport(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                const analysis = await extractTextFromImage(base64Data, file.type, "a medical report (ECG, MRI, X-ray, or Lab results). Provide a summary and key findings.");
                
                const newReport: MedicalReport = {
                    id: `rep-${Date.now()}`,
                    type: file.type.includes('image') ? 'Imaging' : 'Lab',
                    fileName: file.name,
                    url: URL.createObjectURL(file), // Placeholder for real storage
                    timestamp: Date.now(),
                    analysis: analysis
                };

                setEncounter(prev => ({
                    ...prev,
                    medicalReports: [...(prev.medicalReports || []), newReport]
                }));
                toast.success("Report analyzed and added.");
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Report analysis failed:", error);
            toast.error("Failed to analyze report.");
        } finally {
            setIsAnalyzingReport(false);
        }
    };

    return (
        <div className="space-y-8">
            <ModuleCard title="Medical Reports Analyzer" icon={<BeakerIcon className="h-6 w-6"/>} initialOpen>
                <p className="text-slate-500 mb-8 text-sm font-medium leading-relaxed">Upload ECG, MRI, X-ray, or Lab reports for AI-powered analysis and storage.</p>
                <div className="flex items-center gap-4 mb-10">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAnalyzingReport}
                        className="flex items-center bg-brand-600 text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-brand-200 hover:bg-brand-700 disabled:bg-slate-400 transition-all active:scale-95 uppercase tracking-widest text-xs"
                    >
                        {isAnalyzingReport ? (
                            <span className="flex items-center">
                                <ArrowPathIcon className="h-5 w-5 mr-3 animate-spin" />
                                Analyzing Report...
                            </span>
                        ) : (
                            <>
                                <ArrowUpOnSquareIcon className="h-5 w-5 mr-3"/>
                                Upload & Analyze Report
                            </>
                        )}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleReportUpload} className="hidden" accept="image/*,application/pdf" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {encounter.medicalReports?.length === 0 ? (
                        <div className="col-span-2 py-12 text-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                            <p className="text-sm text-slate-400 font-bold">No reports uploaded yet.</p>
                        </div>
                    ) : (
                        encounter.medicalReports?.map(report => (
                            <div key={report.id} className="p-6 bg-primary-100 border border-slate-100 rounded-3xl shadow-sm hover:shadow-lg transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <h5 className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{report.fileName}</h5>
                                    <span className="text-[10px] bg-brand-50 text-brand-700 px-3 py-1 rounded-full font-bold uppercase tracking-widest">{report.type}</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{new Date(report.timestamp).toLocaleString()}</p>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm text-slate-600 max-h-48 overflow-y-auto leading-relaxed custom-scrollbar">
                                    <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-2">AI Analysis Findings</p>
                                    {report.analysis}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ModuleCard>

            <ModuleCard title="Generate & Download Reports" icon={<DocumentTextIcon className="h-6 w-6"/>} initialOpen>
                <p className="text-slate-500 mb-10 text-sm font-medium leading-relaxed max-w-2xl">Generate standardized medical documents for this encounter. All documents are editable before final PDF generation.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    <button onClick={() => setIsReportModalOpen(true)} className="group flex flex-col items-center justify-center p-10 bg-brand-50 text-brand-800 rounded-[3rem] border border-brand-100 hover:bg-brand-100 transition-all active:scale-95 shadow-sm hover:shadow-xl hover:-translate-y-1">
                        <div className="p-5 bg-primary-100 rounded-2xl shadow-sm mb-6 group-hover:scale-110 transition-transform group-hover:rotate-3">
                            <DocumentTextIcon className="h-10 w-10 text-brand-600"/>
                        </div>
                        <span className="font-black uppercase tracking-[0.2em] text-[10px]">Comprehensive Report</span>
                    </button>
                    <button onClick={() => setIsReferralModalOpen(true)} className="group flex flex-col items-center justify-center p-10 bg-indigo-50 text-indigo-800 rounded-[3rem] border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-95 shadow-sm hover:shadow-xl hover:-translate-y-1">
                        <div className="p-5 bg-primary-100 rounded-2xl shadow-sm mb-6 group-hover:scale-110 transition-transform group-hover:-rotate-3">
                            <ArrowUpOnSquareIcon className="h-10 w-10 text-indigo-600"/>
                        </div>
                        <span className="font-black uppercase tracking-[0.2em] text-[10px]">Referral Letter</span>
                    </button>
                    <button onClick={() => setIsDischargeModalOpen(true)} className="group flex flex-col items-center justify-center p-10 bg-emerald-50 text-emerald-800 rounded-[3rem] border border-emerald-100 hover:bg-emerald-100 transition-all active:scale-95 shadow-sm hover:shadow-xl hover:-translate-y-1">
                        <div className="p-5 bg-primary-100 rounded-2xl shadow-sm mb-6 group-hover:scale-110 transition-transform group-hover:rotate-3">
                            <ClipboardDocumentListIcon className="h-10 w-10 text-emerald-600"/>
                        </div>
                        <span className="font-black uppercase tracking-[0.2em] text-[10px]">Discharge Summary</span>
                    </button>
                    <button onClick={() => setIsLamaModalOpen(true)} className="group flex flex-col items-center justify-center p-10 bg-rose-50 text-rose-800 rounded-[3rem] border border-rose-100 hover:bg-rose-100 transition-all active:scale-95 shadow-sm hover:shadow-xl hover:-translate-y-1">
                        <div className="p-5 bg-primary-100 rounded-2xl shadow-sm mb-6 group-hover:scale-110 transition-transform group-hover:-rotate-3">
                            <ExclamationCircleIcon className="h-10 w-10 text-rose-600"/>
                        </div>
                        <span className="font-black uppercase tracking-[0.2em] text-[10px]">LAMA Form</span>
                    </button>
                </div>
            </ModuleCard>

            {/* Modals */}
            {isReportModalOpen && <GenerateReportModal onClose={() => setIsReportModalOpen(false)} onGenerate={handleGenerateComprehensiveReport} patientData={encounter.patientData} diagnoses={encounter.provisionalDiagnoses} initialDoctorDetails={doctorDetails} />}
            {isDischargeModalOpen && <DischargeSummaryModal onClose={() => setIsDischargeModalOpen(false)} patientData={encounter.patientData} finalDiagnosis={encounter.finalDiagnosis} doctorDetails={doctorDetails} />}
            {isReferralModalOpen && <ReferralLetterModal onClose={() => setIsReferralModalOpen(false)} patientData={encounter.patientData} diagnoses={encounter.provisionalDiagnoses} doctorDetails={doctorDetails} />}
            {isLamaModalOpen && <LamaModal onClose={() => setIsLamaModalOpen(false)} patientData={encounter.patientData} doctorDetails={doctorDetails} />}
            <NextStepButton onClick={onNext} label="Next: Sharing" />
        </div>
    );
};

// --- 6. Sharing Tab ---
interface SharingTabProps {
    encounter: Encounter;
    onShare: (encounterId: string, doctorEmail: string, message?: string) => Promise<void>;
}
const SharingTab: React.FC<SharingTabProps> = ({ encounter, onShare }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSharing(true);
        setSuccess(false);
        try {
            await onShare(encounter.id, email, message);
            setSuccess(true);
            setEmail('');
            setMessage('');
            toast.success("Case shared successfully.");
        } catch (error) {
            toast.error("Failed to share case. Please check the email address.");
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            <ModuleCard title="Share Case with Colleague" icon={<UserGroupIcon className="h-6 w-6"/>} initialOpen>
                <div className="p-10 bg-brand-50 rounded-[3rem] border border-brand-100 mb-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-200/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="flex items-start gap-8 relative z-10">
                        <div className="p-5 bg-primary-100 rounded-2xl shadow-xl shadow-brand-200/50">
                            <UserGroupIcon className="h-8 w-8 text-brand-600" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-brand-950 tracking-tight font-display">Collaborative Care Network</h4>
                            <p className="text-sm text-brand-800 mt-3 leading-relaxed font-medium opacity-80">
                                Securely collaborate with other medical professionals by sharing this case. They will be granted real-time access to view all clinical data and contribute progress notes.
                            </p>
                        </div>
                    </div>
                </div>
                
                <form onSubmit={handleShare} className="space-y-10">
                    <div className="grid grid-cols-1 gap-10">
                        <div className="group">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Colleague's Email Address</label>
                            <div className="relative">
                                <input 
                                    type="email" 
                                    required 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="colleague@hospital.com"
                                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-[12px] focus:ring-brand-500/5 focus:border-brand-500/20 outline-none transition-all font-bold text-slate-900 placeholder:text-slate-300 text-lg"
                                />
                            </div>
                        </div>
                        
                        <div className="group">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Message (Optional)</label>
                            <textarea 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Add a note about why you're sharing this case..."
                                rows={4}
                                className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-[2rem] focus:ring-[12px] focus:ring-brand-500/5 focus:border-brand-500/20 outline-none transition-all font-medium text-slate-600 resize-none placeholder:text-slate-300 text-lg"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSharing || !email}
                        className="w-full flex items-center justify-center bg-brand-600 text-white font-black py-6 px-10 rounded-[2rem] shadow-2xl shadow-brand-500/30 hover:bg-brand-700 disabled:bg-slate-300 transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-sm"
                    >
                        {isSharing ? (
                            <ArrowPathIcon className="h-6 w-6 animate-spin" />
                        ) : (
                            <>Share Patient Case <PaperAirplaneIcon className="h-6 w-6 ml-4" /></>
                        )}
                    </button>
                </form>

                {success && (
                    <div className="mt-10 p-8 bg-emerald-50 border border-emerald-100 rounded-[2rem] flex items-center gap-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="p-3 bg-primary-100 rounded-xl shadow-sm">
                            <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-lg font-black text-emerald-900 tracking-tight">Case Shared Successfully</p>
                            <p className="text-sm text-emerald-700 font-medium mt-1">Invitation sent to {email}</p>
                        </div>
                    </div>
                )}
            </ModuleCard>

            <div className="px-4">
                <div className="flex items-center justify-between mb-8">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Currently Shared With</h4>
                    <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {encounter.sharedWith?.length || 0} Collaborators
                    </span>
                </div>
                <div className="grid grid-cols-1 gap-6">
                    {encounter.sharedWith && encounter.sharedWith.length > 0 ? (
                        encounter.sharedWith.map(uid => (
                            <div key={uid} className="bg-primary-100 p-8 rounded-[2.5rem] border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                                <div className="flex items-center gap-6">
                                    <div className="bg-slate-50 p-5 rounded-2xl group-hover:bg-brand-50 transition-colors">
                                        <UserGroupIcon className="h-8 w-8 text-slate-400 group-hover:text-brand-600 transition-colors"/>
                                    </div>
                                    <div>
                                        <p className="text-lg font-black text-slate-900 tracking-tight">Doctor ID: {uid}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Access: Read & Note</span>
                                            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Full History</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center bg-slate-50/50 rounded-[3rem] border-4 border-dashed border-slate-100">
                            <div className="w-20 h-20 bg-primary-100 rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6">
                                <UserGroupIcon className="h-10 w-10 text-slate-200" />
                            </div>
                            <p className="text-lg text-slate-400 font-black tracking-tight">No active collaborators</p>
                            <p className="text-sm text-slate-300 font-medium mt-2">Share this case to start collaborating with your team.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


export default EncounterView;
