
import React, { useState } from 'react';
import { PatientData, Diagnosis, DoctorDetails, ReferralData } from '../types';
import { XMarkIcon, ArrowUpOnSquareIcon } from './icons';
import { generateReferralPdf } from '../utils/reportGenerator';

interface ReferralLetterModalProps {
    onClose: () => void;
    patientData: PatientData;
    diagnoses: Diagnosis[];
    doctorDetails: DoctorDetails;
}

// FIX: Updated to use correct PatientData properties
const generateSummary = (patientData: PatientData, diagnoses: Diagnosis[]): string => {
    const investigationsText = Object.entries(patientData.investigations).map(([key, value]) => `${key}:\n${value}`).join('\n\n');
    return `
This ${patientData.age}-year-old ${patientData.sex.toLowerCase()} presents with a chief complaint of: ${patientData.primaryComplaint}.

Key examination findings include: ${patientData.findings || 'Not specified'}.

Relevant investigations show:
${investigationsText || 'Not specified'}

The AI-assisted differential diagnosis includes: ${diagnoses.map(d => `${d.diagnosisName} (${d.probability}%)`).join(', ')}.

Thank you for seeing this patient.
    `.trim();
};


const ReferralLetterModal: React.FC<ReferralLetterModalProps> = ({ onClose, patientData, diagnoses, doctorDetails }) => {
    const [referralData, setReferralData] = useState<ReferralData>({
        receivingDoctor: '',
        reasonForReferral: '',
        clinicalSummary: generateSummary(patientData, diagnoses),
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setReferralData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerate = () => {
        generateReferralPdf(patientData, referralData, doctorDetails);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-primary-100 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
                <div className="bg-indigo-600 p-8 flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black text-white tracking-tight font-display">
                            Referral Letter
                        </h3>
                        <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 opacity-80">
                            Professional Clinical Handover
                        </p>
                    </div>
                    <button onClick={onClose} className="bg-primary-100/10 hover:bg-primary-100/20 p-2 rounded-xl text-white transition-all active:scale-90 relative z-10">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-10 overflow-y-auto space-y-8 custom-scrollbar">
                    <div>
                        <label htmlFor="receivingDoctor" className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">To (Receiving Clinician/Department)</label>
                        <input type="text" name="receivingDoctor" id="receivingDoctor" value={referralData.receivingDoctor} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-900 transition-all" placeholder="e.g., Dr. Smith, Cardiology" />
                    </div>
                     <div>
                        <label htmlFor="reasonForReferral" className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Reason for Referral</label>
                        <textarea name="reasonForReferral" id="reasonForReferral" rows={2} value={referralData.reasonForReferral} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-medium text-slate-600 transition-all resize-none" placeholder="e.g., For evaluation of persistent chest pain."/>
                    </div>
                     <div>
                        <label htmlFor="clinicalSummary" className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Clinical Summary (Editable)</label>
                        <textarea name="clinicalSummary" id="clinicalSummary" rows={8} value={referralData.clinicalSummary} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-medium text-slate-600 transition-all resize-none bg-slate-50"/>
                    </div>
                </div>

                <div className="p-10 border-t border-slate-100 bg-slate-50 shrink-0">
                    <button onClick={handleGenerate} className="w-full flex items-center justify-center gap-4 bg-indigo-600 text-white font-black py-6 px-8 rounded-3xl shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-[0.98] text-sm uppercase tracking-[0.2em]">
                        <ArrowUpOnSquareIcon className="h-6 w-6"/>
                        Generate & Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReferralLetterModal;

