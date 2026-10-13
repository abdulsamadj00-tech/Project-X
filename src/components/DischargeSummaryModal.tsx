
import React, { useState } from 'react';
import { PatientData, Diagnosis, DoctorDetails, DischargeData } from '../types';
import { XMarkIcon, DownloadIcon } from './icons';
import { generateDischargeSummaryPdf } from '../utils/reportGenerator';

interface DischargeSummaryModalProps {
    onClose: () => void;
    patientData: PatientData;
    finalDiagnosis: Diagnosis | null;
    doctorDetails: DoctorDetails;
}

const DischargeSummaryModal: React.FC<DischargeSummaryModalProps> = ({ onClose, patientData, finalDiagnosis, doctorDetails }) => {
    const [dischargeData, setDischargeData] = useState<DischargeData>({
        finalDiagnosis: finalDiagnosis?.diagnosisName || '',
        hospitalCourse: '',
        dischargeMedications: '',
        followUpPlan: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setDischargeData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerate = () => {
        generateDischargeSummaryPdf(patientData, dischargeData, doctorDetails);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-primary-100 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
                <div className="bg-emerald-600 p-8 flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black text-white tracking-tight font-display">
                            Discharge Summary
                        </h3>
                        <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 opacity-80">
                            Final Clinical Conclusion & Follow-up
                        </p>
                    </div>
                    <button onClick={onClose} className="bg-primary-100/10 hover:bg-primary-100/20 p-2 rounded-xl text-white transition-all active:scale-90 relative z-10">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-10 overflow-y-auto space-y-8 custom-scrollbar">
                    <div>
                        <label htmlFor="finalDiagnosis" className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Final Diagnosis</label>
                        <input type="text" name="finalDiagnosis" id="finalDiagnosis" value={dischargeData.finalDiagnosis} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-slate-900 transition-all" />
                    </div>
                     <div>
                        <label htmlFor="hospitalCourse" className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Hospital Course Summary</label>
                        <textarea name="hospitalCourse" id="hospitalCourse" rows={4} value={dischargeData.hospitalCourse} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-medium text-slate-600 transition-all resize-none" placeholder="Summarize key events, treatments, and patient progress..."/>
                    </div>
                     <div>
                        <label htmlFor="dischargeMedications" className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Discharge Medications</label>
                        <textarea name="dischargeMedications" id="dischargeMedications" rows={3} value={dischargeData.dischargeMedications} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-medium text-slate-600 transition-all resize-none" placeholder="List all medications, dosages, and frequencies..."/>
                    </div>
                    <div>
                        <label htmlFor="followUpPlan" className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Follow-up Plan</label>
                        <textarea name="followUpPlan" id="followUpPlan" rows={2} value={dischargeData.followUpPlan} onChange={handleChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-medium text-slate-600 transition-all resize-none" placeholder="e.g., Follow up with PCP in 2 weeks..."/>
                    </div>
                </div>

                <div className="p-10 border-t border-slate-100 bg-slate-50 shrink-0">
                    <button onClick={handleGenerate} className="w-full flex items-center justify-center gap-4 bg-emerald-600 text-white font-black py-6 px-8 rounded-3xl shadow-2xl shadow-emerald-500/30 hover:bg-emerald-700 transition-all active:scale-[0.98] text-sm uppercase tracking-[0.2em]">
                        <DownloadIcon className="h-6 w-6"/>
                        Generate & Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DischargeSummaryModal;
