
import React, { useState } from 'react';
import { PatientData, Diagnosis, DoctorDetails, ReportModules, ReportModuleKey } from '../types';
import { XMarkIcon, DownloadIcon } from './icons';

interface GenerateReportModalProps {
    onClose: () => void;
    onGenerate: (doctorDetails: DoctorDetails, modules: ReportModules) => void;
    patientData: PatientData;
    diagnoses: Diagnosis[];
    initialDoctorDetails: DoctorDetails;
}

// FIX: Added missing keys to satisfy Record<ReportModuleKey, string>
const moduleLabels: Record<ReportModuleKey, string> = {
    demographics: "Patient Biodata & Presenting Complaint",
    history: "Medical, Surgical, & Social History",
    vitals: "Vital Signs",
    findings: "Systemic Examination Findings",
    investigations: "Investigations Summary",
    diagnoses: "AI-Generated Differential Diagnoses",
    treatmentPlan: "Treatment Plan",
    progressSummary: "Progress Summary",
};


const GenerateReportModal: React.FC<GenerateReportModalProps> = ({ onClose, onGenerate, patientData, diagnoses, initialDoctorDetails }) => {
    const [doctorDetails, setDoctorDetails] = useState<DoctorDetails>(initialDoctorDetails);
    // FIX: Added missing keys to satisfy ReportModules type
    const [modules, setModules] = useState<ReportModules>({
        demographics: true,
        history: true,
        vitals: true,
        findings: true,
        investigations: true,
        diagnoses: true,
        treatmentPlan: true,
        progressSummary: true,
    });

    const handleDoctorDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDoctorDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleModuleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setModules(prev => ({...prev, [name as ReportModuleKey]: checked}));
    };

    const handleGenerate = () => {
        onGenerate(doctorDetails, modules);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-primary-100 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
                <div className="bg-brand-600 p-8 flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black text-white tracking-tight font-display">
                            Generate Patient Report
                        </h3>
                        <p className="text-brand-100 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 opacity-80">
                            Comprehensive Clinical Documentation
                        </p>
                    </div>
                    <button onClick={onClose} className="bg-primary-100/10 hover:bg-primary-100/20 p-2 rounded-xl text-white transition-all active:scale-90 relative z-10">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-10 overflow-y-auto space-y-10 custom-scrollbar">
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1 h-6 bg-brand-500 rounded-full"></div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Clinician Details</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label htmlFor="name" className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Full Name</label>
                                <input type="text" name="name" id="name" value={doctorDetails.name} onChange={handleDoctorDetailsChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-bold text-slate-900 transition-all" />
                            </div>
                            <div>
                                <label htmlFor="role" className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Role / Speciality</label>
                                <input type="text" name="role" id="role" value={doctorDetails.role} onChange={handleDoctorDetailsChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-bold text-slate-900 transition-all" />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="licenseNumber" className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">License / ID Number</label>
                                <input type="text" name="licenseNumber" id="licenseNumber" value={doctorDetails.licenseNumber} onChange={handleDoctorDetailsChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none font-bold text-slate-900 transition-all" />
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1 h-6 bg-brand-500 rounded-full"></div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Report Content</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {(Object.keys(modules) as ReportModuleKey[]).map(key => (
                                <label key={key} className={`flex items-center p-4 rounded-2xl border transition-all cursor-pointer group ${modules[key] ? 'bg-brand-50 border-brand-100' : 'bg-primary-100 border-slate-100 hover:border-brand-200'}`}>
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${modules[key] ? 'bg-brand-600 border-brand-600' : 'bg-primary-100 border-slate-200 group-hover:border-brand-400'}`}>
                                        {modules[key] && <div className="w-2 h-2 bg-primary-100 rounded-full"></div>}
                                    </div>
                                    <input
                                        type="checkbox"
                                        id={key}
                                        name={key}
                                        checked={modules[key]}
                                        onChange={handleModuleChange}
                                        className="hidden"
                                    />
                                    <span className={`ml-4 text-[11px] font-bold uppercase tracking-widest transition-all ${modules[key] ? 'text-brand-700' : 'text-slate-400'}`}>{moduleLabels[key]}</span>
                                </label>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="p-10 border-t border-slate-100 bg-slate-50 shrink-0">
                    <button onClick={handleGenerate} className="w-full flex items-center justify-center gap-4 bg-brand-600 text-white font-black py-6 px-8 rounded-3xl shadow-2xl shadow-brand-500/30 hover:bg-brand-700 transition-all active:scale-[0.98] text-sm uppercase tracking-[0.2em]">
                        <DownloadIcon className="h-6 w-6"/>
                        Generate & Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GenerateReportModal;

