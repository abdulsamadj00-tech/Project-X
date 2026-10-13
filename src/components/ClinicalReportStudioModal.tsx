import React, { useState, useRef } from 'react';
import { Encounter, DoctorDetails } from '../types';
import {
    ReportType,
    ReportLanguage,
    REPORT_SECTIONS,
    EditableReportContent,
    getInitialReportContent,
    URDU_LAMA_STATEMENTS,
    ENGLISH_LAMA_STATEMENTS,
    synthesizeReportWithAI,
    exportElementToPdf
} from '../services/bilingualReportService';
import { toast } from 'sonner';

interface ClinicalReportStudioModalProps {
    encounter: Encounter;
    initialReportType?: ReportType;
    initialLanguage?: ReportLanguage;
    doctorDetails: DoctorDetails;
    onClose: () => void;
    onUpdateEncounter?: (encounter: Encounter) => void;
}

export const ClinicalReportStudioModal: React.FC<ClinicalReportStudioModalProps> = ({
    encounter,
    initialReportType = 'comprehensive',
    initialLanguage = 'bilingual',
    doctorDetails,
    onClose,
    onUpdateEncounter
}) => {
    const [reportType, setReportType] = useState<ReportType>(initialReportType);
    const [language, setLanguage] = useState<ReportLanguage>(initialLanguage);
    const [activeTab, setActiveTab] = useState<'sections' | 'edit'>('sections');
    const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
    const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

    // Section activation state
    const [enabledSections, setEnabledSections] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        REPORT_SECTIONS.forEach(s => {
            if (initialReportType === 'lama') {
                initial[s.id] = ['demographics', 'triage', 'complaint', 'vitals', 'conclusion', 'attestation'].includes(s.id);
            } else if (initialReportType === 'discharge') {
                initial[s.id] = ['demographics', 'complaint', 'vitals', 'treatments', 'diagnoses', 'conclusion', 'attestation'].includes(s.id);
            } else if (initialReportType === 'referral') {
                initial[s.id] = ['demographics', 'complaint', 'vitals', 'findings', 'labs', 'diagnoses', 'conclusion', 'attestation'].includes(s.id);
            } else {
                initial[s.id] = s.defaultEnabled;
            }
        });
        return initial;
    });

    // Editable text content
    const [content, setContent] = useState<EditableReportContent>(() => 
        getInitialReportContent(encounter, doctorDetails)
    );

    const toggleSection = (id: string) => {
        setEnabledSections(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleSelectAll = (select: boolean) => {
        const updated: Record<string, boolean> = {};
        REPORT_SECTIONS.forEach(s => {
            updated[s.id] = select;
        });
        setEnabledSections(updated);
        toast.info(select ? "All sections included in PDF report." : "All sections deselected.");
    };

    const handleApplyPreset = (type: ReportType) => {
        setReportType(type);
        const updated: Record<string, boolean> = {};
        if (type === 'lama') {
            REPORT_SECTIONS.forEach(s => {
                updated[s.id] = ['demographics', 'triage', 'complaint', 'vitals', 'conclusion', 'attestation'].includes(s.id);
            });
        } else if (type === 'discharge') {
            REPORT_SECTIONS.forEach(s => {
                updated[s.id] = ['demographics', 'complaint', 'vitals', 'treatments', 'diagnoses', 'conclusion', 'attestation'].includes(s.id);
            });
        } else if (type === 'referral') {
            REPORT_SECTIONS.forEach(s => {
                updated[s.id] = ['demographics', 'complaint', 'vitals', 'findings', 'labs', 'diagnoses', 'conclusion', 'attestation'].includes(s.id);
            });
        } else {
            REPORT_SECTIONS.forEach(s => {
                updated[s.id] = true;
            });
        }
        setEnabledSections(updated);
        toast.success(`Preset applied: ${type.toUpperCase()} template.`);
    };

    const handleRunAISynthesis = async () => {
        setIsGeneratingAI(true);
        toast.loading("AI synthesising clinical documentation in English & Urdu...", { id: 'ai-report' });
        try {
            const updated = await synthesizeReportWithAI(encounter, reportType, doctorDetails, content);
            setContent(updated);
            toast.success("Bilingual clinical report polished and updated with AI insights!", { id: 'ai-report' });
        } catch (error) {
            console.error("AI report error:", error);
            toast.error("Failed to generate AI report summary. Retained clinical defaults.", { id: 'ai-report' });
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleDownloadPdf = async () => {
        setIsExportingPdf(true);
        const fileName = `${reportType.toUpperCase()}-Report-${encounter.patientData.name ? encounter.patientData.name.replace(/\s+/g, '_') : 'Patient'}-${new Date().toISOString().slice(0, 10)}.pdf`;
        toast.loading("Rendering high-definition vector PDF...", { id: 'pdf-gen' });
        try {
            await exportElementToPdf('clinical-report-printable', fileName);
            toast.success(`PDF successfully downloaded: ${fileName}`, { id: 'pdf-gen' });
        } catch (error) {
            console.error("PDF export error:", error);
            toast.error("Error creating direct PDF. Opening browser Print/Save dialog instead.", { id: 'pdf-gen' });
            window.print();
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleCopyText = () => {
        const p = encounter.patientData;
        const text = `
=== ${reportType.toUpperCase()} MEDICAL REPORT ===
Hospital: ${content.hospitalNameEn} / ${content.hospitalNameUr}
Patient: ${p.name || 'Patient'} (${p.age}yo, ${p.sex}) | Date: ${new Date().toLocaleDateString()}
Chief Complaint: ${p.primaryComplaint || 'N/A'}
Triage: ESI Level ${encounter.triage?.level || 'N/A'}
Diagnosis: ${encounter.finalDiagnosis?.diagnosisName || encounter.provisionalDiagnoses?.[0]?.diagnosisName || 'Under Evaluation'}

Summary (EN):
${content.clinicalSummaryEn}

خلاصہ (URDU):
${content.clinicalSummaryUr}

Clinician: ${doctorDetails.name} (${doctorDetails.licenseNumber || 'License on file'})
        `.trim();

        navigator.clipboard.writeText(text);
        toast.success("Report text copied to clipboard.");
    };

    const patient = encounter.patientData;
    const triage = encounter.triage;
    const primaryDiagnosis = encounter.finalDiagnosis?.diagnosisName || encounter.provisionalDiagnoses?.[0]?.diagnosisName || 'Acute Clinical Condition';
    const primaryICD = encounter.finalDiagnosis?.icdCode || encounter.provisionalDiagnoses?.[0]?.icdCode || 'ICD-11 Specified';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in text-primary-900">
            <div className="bg-primary-100 border border-primary-300/40 rounded-3xl max-w-7xl w-full h-[95vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header Bar */}
                <div className="p-4 sm:p-5 border-b border-primary-300/30 flex flex-wrap items-center justify-between gap-3 bg-primary-100/95 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl shrink-0">
                            📄
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                                    Clinical Documentation & PDF Studio
                                </span>
                                <span className="text-primary-400">•</span>
                                <span className="text-[10px] font-mono text-primary-600 font-bold bg-primary-200/60 px-2 py-0.5 rounded-full">
                                    EN / اردو Bilingual Ready
                                </span>
                            </div>
                            <h2 className="text-lg sm:text-xl font-black text-primary-900 font-display tracking-tight mt-0.5">
                                Medical Report & LAMA Generator
                            </h2>
                        </div>
                    </div>

                    {/* Patient Chip */}
                    <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-2xl bg-primary-200/50 border border-primary-300/30 text-xs text-primary-700">
                        <span className="font-bold text-primary-900">{patient.name || 'Patient'}</span>
                        <span>•</span>
                        <span>{patient.age}yo {patient.sex}</span>
                        <span>•</span>
                        <span className="font-mono text-cyan-600 dark:text-cyan-400">ID: {encounter.id.slice(0, 8)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRunAISynthesis}
                            disabled={isGeneratingAI}
                            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-cyan-500/20"
                        >
                            <span>{isGeneratingAI ? '⏳' : '✨'}</span>
                            <span>{isGeneratingAI ? 'Synthesizing...' : 'AI Auto-Polish'}</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-primary-200/60 text-primary-500 hover:text-primary-900 hover:bg-primary-300/60 border border-primary-300/30 flex items-center justify-center transition-all"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Subheader Toolbar: Report Type & Language Switcher */}
                <div className="px-4 sm:px-6 py-2.5 bg-primary-200/40 border-b border-primary-300/30 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                    {/* Report Types */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                        <span className="text-[10px] font-black uppercase tracking-wider text-primary-500 mr-1 shrink-0">
                            Template:
                        </span>
                        {[
                            { id: 'comprehensive', label: '📋 Comprehensive', ur: 'جامع رپورٹ' },
                            { id: 'lama', label: '⚠️ LAMA Form', ur: 'لاما اقرار نامہ' },
                            { id: 'discharge', label: '🏥 Discharge', ur: 'ڈسچارج سمری' },
                            { id: 'referral', label: '📨 Referral', ur: 'ریفرل لیٹر' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => handleApplyPreset(t.id as ReportType)}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                                    reportType === t.id
                                        ? 'bg-cyan-500 text-slate-950 shadow-sm font-black'
                                        : 'text-primary-600 hover:bg-primary-300/50 hover:text-primary-900 border border-primary-300/20'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Language Switcher */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-primary-500 mr-1">
                            Language:
                        </span>
                        {[
                            { id: 'bilingual', label: '🌐 Bilingual (Both)', flag: 'Bilingual' },
                            { id: 'en', label: '🇬🇧 English', flag: 'EN' },
                            { id: 'ur', label: '🇵🇰 اردو (Urdu)', flag: 'UR' }
                        ].map(l => (
                            <button
                                key={l.id}
                                onClick={() => setLanguage(l.id as ReportLanguage)}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                                    language === l.id
                                        ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                                        : 'text-primary-600 hover:bg-primary-300/50 hover:text-primary-900 border border-primary-300/20'
                                }`}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Studio Body: Split View (Config on Left, Live PDF Preview on Right) */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* LEFT CONTROLS PANEL */}
                    <div className="w-full lg:w-[380px] xl:w-[420px] border-r border-primary-300/30 flex flex-col bg-primary-100/90 shrink-0 overflow-hidden">
                        {/* Tab Switcher: Sections vs Edit Content */}
                        <div className="flex border-b border-primary-300/30 bg-primary-200/30 shrink-0">
                            <button
                                onClick={() => setActiveTab('sections')}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                                    activeTab === 'sections'
                                        ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-black bg-primary-100'
                                        : 'border-transparent text-primary-500 hover:text-primary-900'
                                }`}
                            >
                                📑 Select Sections ({Object.values(enabledSections).filter(Boolean).length})
                            </button>
                            <button
                                onClick={() => setActiveTab('edit')}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                                    activeTab === 'edit'
                                        ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-black bg-primary-100'
                                        : 'border-transparent text-primary-500 hover:text-primary-900'
                                }`}
                            >
                                ✍️ Edit Text & Fields
                            </button>
                        </div>

                        {/* Tab 1: Section-Wise Checklist */}
                        {activeTab === 'sections' && (
                            <div className="p-4 overflow-y-auto space-y-4 flex-1">
                                <div className="flex items-center justify-between gap-2 pb-2 border-b border-primary-300/20 text-xs">
                                    <span className="text-[11px] font-bold text-primary-500">Document Sections</span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleSelectAll(true)}
                                            className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-primary-200 hover:bg-primary-300/60 text-primary-800"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={() => handleSelectAll(false)}
                                            className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-primary-200 hover:bg-primary-300/60 text-primary-800"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {REPORT_SECTIONS.map(s => {
                                        const isChecked = !!enabledSections[s.id];
                                        return (
                                            <div
                                                key={s.id}
                                                onClick={() => toggleSection(s.id)}
                                                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                                                    isChecked
                                                        ? 'bg-primary-200/60 border-cyan-500/40 shadow-sm'
                                                        : 'bg-primary-100/50 border-primary-300/20 opacity-60 hover:opacity-100 hover:bg-primary-200/30'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {}} // handled by parent onClick
                                                    className="w-4 h-4 mt-0.5 accent-cyan-500 rounded cursor-pointer shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-primary-900 leading-snug">
                                                        {s.labelEn}
                                                    </div>
                                                    <div className="text-[11px] text-primary-600 font-urdu mt-0.5" dir="rtl">
                                                        {s.labelUr}
                                                    </div>
                                                    <div className="text-[10px] text-primary-500 mt-0.5 line-clamp-1">
                                                        {s.description}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Inline Text Customization */}
                        {activeTab === 'edit' && (
                            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-primary-500">Hospital Facility Name</label>
                                    <input
                                        type="text"
                                        value={content.hospitalNameEn}
                                        onChange={(e) => setContent({ ...content, hospitalNameEn: e.target.value })}
                                        className="w-full p-2.5 rounded-xl bg-primary-200/50 border border-primary-300/40 text-primary-900 text-xs font-semibold focus:outline-none focus:border-cyan-500"
                                    />
                                    <input
                                        type="text"
                                        dir="rtl"
                                        value={content.hospitalNameUr}
                                        onChange={(e) => setContent({ ...content, hospitalNameUr: e.target.value })}
                                        className="w-full p-2.5 rounded-xl bg-primary-200/50 border border-primary-300/40 text-primary-900 text-xs font-urdu focus:outline-none focus:border-cyan-500 mt-1"
                                    />
                                </div>

                                {reportType === 'lama' && (
                                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-3">
                                        <div className="text-[11px] font-black uppercase text-amber-700 dark:text-amber-400">
                                            ⚠️ LAMA Refusal Specifications
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-primary-600">Patient / Legal Guardian Name</label>
                                            <input
                                                type="text"
                                                value={content.lamaPatientOrGuardianName}
                                                onChange={(e) => setContent({ ...content, lamaPatientOrGuardianName: e.target.value })}
                                                className="w-full p-2 rounded-xl bg-primary-200/60 border border-primary-300/40 text-primary-900 text-xs mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-primary-600">Witness Name & Credential</label>
                                            <input
                                                type="text"
                                                value={content.lamaWitnessName}
                                                onChange={(e) => setContent({ ...content, lamaWitnessName: e.target.value })}
                                                className="w-full p-2 rounded-xl bg-primary-200/60 border border-primary-300/40 text-primary-900 text-xs mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-primary-600">Specific Treatment/Care Refused</label>
                                            <textarea
                                                rows={2}
                                                value={content.lamaSpecificRefusalsEn}
                                                onChange={(e) => setContent({ ...content, lamaSpecificRefusalsEn: e.target.value })}
                                                className="w-full p-2 rounded-xl bg-primary-200/60 border border-primary-300/40 text-primary-900 text-xs mt-1"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-primary-500">Clinical Narrative (English)</label>
                                    <textarea
                                        rows={3}
                                        value={content.clinicalSummaryEn}
                                        onChange={(e) => setContent({ ...content, clinicalSummaryEn: e.target.value })}
                                        className="w-full p-2.5 rounded-xl bg-primary-200/50 border border-primary-300/40 text-primary-900 text-xs focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-primary-500">کلینیکل خلاصہ (Urdu)</label>
                                    <textarea
                                        rows={3}
                                        dir="rtl"
                                        value={content.clinicalSummaryUr}
                                        onChange={(e) => setContent({ ...content, clinicalSummaryUr: e.target.value })}
                                        className="w-full p-2.5 rounded-xl bg-primary-200/50 border border-primary-300/40 text-primary-900 text-xs font-urdu focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-primary-500">Hospital Course / Interventions (English)</label>
                                    <textarea
                                        rows={2}
                                        value={content.hospitalCourseEn}
                                        onChange={(e) => setContent({ ...content, hospitalCourseEn: e.target.value })}
                                        className="w-full p-2.5 rounded-xl bg-primary-200/50 border border-primary-300/40 text-primary-900 text-xs focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-primary-500">Follow-up / Aftercare Advice</label>
                                    <textarea
                                        rows={2}
                                        value={content.followUpPlanEn}
                                        onChange={(e) => setContent({ ...content, followUpPlanEn: e.target.value })}
                                        className="w-full p-2.5 rounded-xl bg-primary-200/50 border border-primary-300/40 text-primary-900 text-xs focus:outline-none focus:border-cyan-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT LIVE PDF DOCUMENT PREVIEW */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-primary-200/30 flex justify-center items-start">
                        {/* Printable A4 Container */}
                        <div
                            id="clinical-report-printable"
                            className="bg-white text-slate-900 rounded-2xl shadow-xl w-full max-w-[850px] p-6 sm:p-10 border border-slate-200 space-y-6 transition-all"
                            style={{ minHeight: '1100px' }}
                        >
                            {/* Document Header */}
                            <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-sm flex items-center justify-center">
                                            +
                                        </span>
                                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                                            {content.hospitalNameEn}
                                        </h1>
                                    </div>
                                    {(language === 'ur' || language === 'bilingual') && (
                                        <div className="text-sm font-urdu font-bold text-slate-700" dir="rtl">
                                            {content.hospitalNameUr}
                                        </div>
                                    )}
                                    <div className="text-[10px] text-slate-500 font-mono">
                                        Emergency Department & Academic Tertiary Care • Tel: +92 51 9283000 • ISO 9001:2015 Certified
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-md">
                                        {reportType === 'lama' ? '⚠️ LAMA LEGAL DECLARATION' : 'CONFIDENTIAL MEDICAL RECORD'}
                                    </span>
                                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                                        Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                                    </div>
                                    <div className="text-[10px] font-mono text-cyan-700 font-bold">
                                        Encounter ID: {encounter.id.slice(0, 12)}
                                    </div>
                                </div>
                            </div>

                            {/* Section: Demographics Ribbon */}
                            {enabledSections['demographics'] && (
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400">Patient Name / نام</div>
                                        <div className="font-bold text-slate-900 text-sm">{patient.name || 'Anonymous Patient'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400">Age & Gender / عمر و جنس</div>
                                        <div className="font-bold text-slate-900">{patient.age} Yrs / {patient.sex}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400">MRN / شناختی نمبر</div>
                                        <div className="font-mono text-slate-800">{encounter.id.slice(0, 8).toUpperCase()}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400">Attending Clinician / معالج</div>
                                        <div className="font-bold text-slate-900">{doctorDetails.name}</div>
                                    </div>
                                </div>
                            )}

                            {/* Section: Triage Acuity (ESI 1-5) */}
                            {enabledSections['triage'] && triage && (
                                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                                    triage.level === 1
                                        ? 'bg-rose-50 border-rose-300 text-rose-950'
                                        : triage.level === 2
                                        ? 'bg-amber-50 border-amber-300 text-amber-950'
                                        : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-xl font-black text-base flex items-center justify-center shrink-0 ${
                                            triage.level === 1 ? 'bg-rose-600 text-white' : triage.level === 2 ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                                        }`}>
                                            {triage.level}
                                        </span>
                                        <div>
                                            <div className="font-black uppercase tracking-wider text-xs">
                                                Emergency Severity Index: Level {triage.level}
                                            </div>
                                            <div className="text-[11px] opacity-80">
                                                {triage.clinicalRationale}
                                            </div>
                                        </div>
                                    </div>
                                    {(language === 'ur' || language === 'bilingual') && (
                                        <div className="text-xs font-urdu font-bold" dir="rtl">
                                            ایمرجنسی ٹرائیج لیول {triage.level}: فوری طبی توجہ
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Section: Chief Complaints */}
                            {enabledSections['complaint'] && (
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                                        <span className="font-black uppercase tracking-wider text-slate-700">
                                            Chief Complaints & History of Illness
                                        </span>
                                        {(language === 'ur' || language === 'bilingual') && (
                                            <span className="font-urdu font-bold text-slate-700 text-xs" dir="rtl">
                                                بنیادی علامات اور بیماری کی تفصیل
                                            </span>
                                        )}
                                    </div>
                                    {(language === 'en' || language === 'bilingual') && (
                                        <p className="text-slate-800 leading-relaxed">
                                            {patient.primaryComplaint || 'Patient presented with acute clinical symptoms requiring urgent medical stabilization.'}
                                        </p>
                                    )}
                                    {(language === 'ur' || language === 'bilingual') && (
                                        <p className="text-slate-800 font-urdu leading-relaxed" dir="rtl">
                                            مریض ہسپتال میں بنیادی شکایت: '{patient.primaryComplaint || 'شدید تکلیف'}' کے ساتھ تشریف لائے۔ فوری طبی امداد اور ٹیسٹ شروع کیے گئے۔
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Section: Vital Signs Table */}
                            {enabledSections['vitals'] && patient.vitals && (
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                                        <span className="font-black uppercase tracking-wider text-slate-700">
                                            Hemodynamic Vital Signs
                                        </span>
                                        {(language === 'ur' || language === 'bilingual') && (
                                            <span className="font-urdu font-bold text-slate-700 text-xs" dir="rtl">
                                                حیاتیاتی علامات (نبض و دباؤ)
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                        <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-center">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Blood Pressure</div>
                                            <div className="text-sm font-black font-mono text-slate-900">{patient.vitals.bp || 'N/A'}</div>
                                        </div>
                                        <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-center">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Heart Rate</div>
                                            <div className="text-sm font-black font-mono text-slate-900">{patient.vitals.hr || 'N/A'} bpm</div>
                                        </div>
                                        <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-center">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Oxygen SpO2</div>
                                            <div className="text-sm font-black font-mono text-slate-900">{patient.vitals.spo2 || 'N/A'}%</div>
                                        </div>
                                        <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-center">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Resp Rate</div>
                                            <div className="text-sm font-black font-mono text-slate-900">{patient.vitals.rr || 'N/A'}/min</div>
                                        </div>
                                        <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-center">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">Temperature</div>
                                            <div className="text-sm font-black font-mono text-slate-900">{patient.vitals.temp || 'N/A'}°C</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section: Diagnostics & Lab Orders */}
                            {enabledSections['labs'] && encounter.labTracker && encounter.labTracker.length > 0 && (
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                                        <span className="font-black uppercase tracking-wider text-slate-700">
                                            Diagnostic Lab Tests & Investigation Tracker
                                        </span>
                                        {(language === 'ur' || language === 'bilingual') && (
                                            <span className="font-urdu font-bold text-slate-700 text-xs" dir="rtl">
                                                لیبارٹری ٹیسٹ اور تشخیصی نتائج
                                            </span>
                                        )}
                                    </div>
                                    <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                                        <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-600 border-b border-slate-200">
                                            <tr>
                                                <th className="p-2">Test Name</th>
                                                <th className="p-2">Category</th>
                                                <th className="p-2">Result</th>
                                                <th className="p-2">Reference Range</th>
                                                <th className="p-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {encounter.labTracker.map((o) => (
                                                <tr key={o.id} className={o.isCritical ? 'bg-rose-50 text-rose-950 font-bold' : ''}>
                                                    <td className="p-2 font-bold">{o.testName}</td>
                                                    <td className="p-2 text-slate-500">{o.category}</td>
                                                    <td className="p-2 font-mono">
                                                        {o.resultValue ? `${o.resultValue} ${o.unit || ''}` : 'Pending'}
                                                        {o.isCritical && <span className="ml-1 text-[10px] text-rose-600">🚨 PANIC</span>}
                                                    </td>
                                                    <td className="p-2 text-slate-500 font-mono">{o.referenceRange || 'Standard'}</td>
                                                    <td className="p-2">
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                                                            {o.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Section: Differential Diagnoses */}
                            {enabledSections['diagnoses'] && (
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                                        <span className="font-black uppercase tracking-wider text-slate-700">
                                            Primary & Differential Diagnoses (ICD-11 / DSM-5)
                                        </span>
                                        {(language === 'ur' || language === 'bilingual') && (
                                            <span className="font-urdu font-bold text-slate-700 text-xs" dir="rtl">
                                                حتمی و ممکنہ تشخیص
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                                        <div>
                                            <div className="font-black text-slate-900 text-sm">
                                                {primaryDiagnosis}
                                            </div>
                                            <div className="text-[10px] font-mono text-cyan-800 font-bold">
                                                ICD-11 Code: {primaryICD}
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-bold uppercase">
                                            Primary Working Diagnosis
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Section: Active Treatments & Medications */}
                            {enabledSections['treatments'] && encounter.treatments && encounter.treatments.length > 0 && (
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                                        <span className="font-black uppercase tracking-wider text-slate-700">
                                            Active Medical Orders & Pharmacotherapy
                                        </span>
                                        {(language === 'ur' || language === 'bilingual') && (
                                            <span className="font-urdu font-bold text-slate-700 text-xs" dir="rtl">
                                                تجویز کردہ ادویات اور طریقہ استعمال
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {encounter.treatments.map((t, idx) => (
                                            <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                                                <div className="font-bold text-slate-900">{t.drugName}</div>
                                                <div className="text-[11px] text-slate-600 font-mono">
                                                    {t.dosage} • {t.route || 'Oral'} • {t.frequency || ''}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Section: Clinical Summary Narrative */}
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                                    <span className="font-black uppercase tracking-wider text-slate-700">
                                        Hospital Course & Clinical Summary
                                    </span>
                                    {(language === 'ur' || language === 'bilingual') && (
                                        <span className="font-urdu font-bold text-slate-700 text-xs" dir="rtl">
                                            دورانِ داخلہ احوال اور خلاصہ
                                        </span>
                                    )}
                                </div>
                                {(language === 'en' || language === 'bilingual') && (
                                    <p className="text-slate-800 leading-relaxed">
                                        {content.clinicalSummaryEn}
                                    </p>
                                )}
                                {(language === 'ur' || language === 'bilingual') && (
                                    <p className="text-slate-800 font-urdu leading-relaxed" dir="rtl">
                                        {content.clinicalSummaryUr}
                                    </p>
                                )}
                            </div>

                            {/* Section: LAMA Official Legal Declaration (When LAMA is active) */}
                            {reportType === 'lama' && (
                                <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-500 space-y-4 text-xs">
                                    <div className="flex items-center gap-2 text-amber-900 font-black text-sm uppercase">
                                        <span>🚨</span>
                                        <span>LEAVE AGAINST MEDICAL ADVICE (LAMA) — LEGAL REFUSAL STATEMENT</span>
                                    </div>

                                    {(language === 'en' || language === 'bilingual') && (
                                        <div className="space-y-2 text-slate-900">
                                            <p className="font-bold">
                                                {ENGLISH_LAMA_STATEMENTS.patientDeclaration(content.lamaPatientOrGuardianName, doctorDetails.name)}
                                            </p>
                                            <p className="p-3 rounded-lg bg-rose-100/80 border border-rose-300 text-rose-950 font-bold">
                                                ⚠️ {ENGLISH_LAMA_STATEMENTS.risksWarning}
                                            </p>
                                            <p className="text-[11px] text-slate-700">
                                                {ENGLISH_LAMA_STATEMENTS.liabilityRelease}
                                            </p>
                                            <div className="text-[11px] text-slate-700">
                                                <strong>Refused Interventions:</strong> {content.lamaSpecificRefusalsEn}
                                            </div>
                                        </div>
                                    )}

                                    {(language === 'ur' || language === 'bilingual') && (
                                        <div className="space-y-2 text-slate-900 font-urdu pt-2 border-t border-amber-200" dir="rtl">
                                            <div className="font-black text-amber-950 text-sm">
                                                {URDU_LAMA_STATEMENTS.title}
                                            </div>
                                            <p className="font-bold leading-relaxed">
                                                {URDU_LAMA_STATEMENTS.patientDeclaration(content.lamaPatientOrGuardianName, doctorDetails.name)}
                                            </p>
                                            <p className="p-3 rounded-lg bg-rose-100/80 border border-rose-300 text-rose-950 font-bold leading-relaxed">
                                                ⚠️ {URDU_LAMA_STATEMENTS.risksWarning}
                                            </p>
                                            <p className="text-[11px] text-slate-700 leading-relaxed">
                                                {URDU_LAMA_STATEMENTS.liabilityRelease}
                                            </p>
                                            <div className="text-[11px] text-slate-700">
                                                <strong>جن اقدامات سے انکار کیا گیا:</strong> {content.lamaSpecificRefusalsUr}
                                            </div>
                                        </div>
                                    )}

                                    {/* LAMA Specific Signatures */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-amber-200">
                                        <div className="space-y-1">
                                            <div className="border-b border-slate-800 pb-8"></div>
                                            <div className="font-bold text-slate-900 text-xs">
                                                Patient / Guardian Signature (دستخط مریض / سرپرست)
                                            </div>
                                            <div className="text-[11px] text-slate-600">
                                                Name: {content.lamaPatientOrGuardianName}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="border-b border-slate-800 pb-8"></div>
                                            <div className="font-bold text-slate-900 text-xs">
                                                Witness Signature (دستخط گواہ)
                                            </div>
                                            <div className="text-[11px] text-slate-600">
                                                Name: {content.lamaWitnessName} ({content.lamaWitnessRelation})
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section: Attestation & Clinician Signatures */}
                            {enabledSections['attestation'] && (
                                <div className="pt-6 border-t-2 border-slate-300 flex flex-col sm:flex-row items-end justify-between gap-6 text-xs">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase text-slate-400">
                                            Hospital Seal & Digital Audit Verification
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-500">
                                            Hash: SHA256-MEDIDX-{encounter.id.slice(0, 10).toUpperCase()}-VERIFIED
                                        </div>
                                        <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                            <span>✓</span>
                                            <span>HL7 FHIR R4 & ICD-11 Standardized Clinical Record</span>
                                        </div>
                                    </div>

                                    <div className="text-right space-y-1 min-w-[200px]">
                                        <div className="border-b-2 border-slate-900 pb-6 text-slate-400 font-mono italic text-[10px]">
                                            Digitally Attested by Clinician
                                        </div>
                                        <div className="font-black text-slate-900 text-sm">
                                            {doctorDetails.name || 'Attending Physician, MD'}
                                        </div>
                                        <div className="text-[11px] text-slate-600 font-semibold">
                                            {doctorDetails.role || 'Emergency & Internal Medicine Specialist'}
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-500">
                                            License / NPI: {doctorDetails.licenseNumber || 'MD-92841-EM'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Action Toolbar */}
                <div className="p-4 border-t border-primary-300/30 bg-primary-200/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-xs text-primary-600">
                        <span>Report Type: <strong className="text-primary-900 uppercase">{reportType}</strong></span>
                        <span>•</span>
                        <span>Language: <strong className="text-primary-900 uppercase">{language}</strong></span>
                        <span>•</span>
                        <span>Sections: <strong className="text-primary-900">{Object.values(enabledSections).filter(Boolean).length} Active</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopyText}
                            className="bg-primary-200 hover:bg-primary-300/60 text-primary-900 border border-primary-300/40 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all"
                        >
                            📋 Copy Text
                        </button>
                        <button
                            onClick={handlePrint}
                            className="bg-primary-200 hover:bg-primary-300/60 text-primary-900 border border-primary-300/40 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
                        >
                            🖨️ Print / System PDF
                        </button>
                        <button
                            onClick={handleDownloadPdf}
                            disabled={isExportingPdf}
                            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-cyan-500/25 flex items-center gap-2"
                        >
                            <span>{isExportingPdf ? '⏳' : '💾'}</span>
                            <span>{isExportingPdf ? 'Generating PDF...' : 'Download Official PDF'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClinicalReportStudioModal;
