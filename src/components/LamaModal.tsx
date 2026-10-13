
import React, { useState } from 'react';
import { PatientData, DoctorDetails } from '../types';
import { XMarkIcon, DownloadIcon, ExclamationCircleIcon } from './icons';
import { generateLamaPdf } from '../utils/reportGenerator';

interface LamaModalProps {
    onClose: () => void;
    patientData: PatientData;
    doctorDetails: DoctorDetails;
}

const LamaModal: React.FC<LamaModalProps> = ({ onClose, patientData, doctorDetails }) => {
    const [witnessName, setWitnessName] = useState('');

    const handleGenerate = () => {
        generateLamaPdf(patientData, doctorDetails, witnessName);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-primary-100 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
                <div className="bg-amber-600 p-8 flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black text-white tracking-tight font-display flex items-center gap-3">
                            <ExclamationCircleIcon className="h-8 w-8"/>
                            LAMA Declaration
                        </h3>
                        <p className="text-amber-100 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 opacity-80">
                            Leave Against Medical Advice
                        </p>
                    </div>
                    <button onClick={onClose} className="bg-primary-100/10 hover:bg-primary-100/20 p-2 rounded-xl text-white transition-all active:scale-90 relative z-10">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-10 overflow-y-auto space-y-8 custom-scrollbar">
                   <div className="p-8 bg-amber-50 border border-amber-100 rounded-[2.5rem] relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                       <p className="text-sm text-amber-900 leading-relaxed font-medium">
                           I, <strong className="text-amber-700">{patientData.name || '[Patient Name]'}</strong>, hereby declare that I am leaving the facility against the advice of my treating physician, <strong className="text-amber-700">{doctorDetails.name || '[Doctor Name]'}</strong>.
                           I have been informed of the potential risks of my decision, which include but are not limited to: <span className="font-bold">worsening of my condition, permanent disability, or death</span>.
                           Despite understanding these risks, I voluntarily choose to discharge myself. I release the medical staff and the facility from all liability for any adverse events that may result from my decision.
                       </p>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label htmlFor="patientName" className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Patient Name (Confirm)</label>
                            <input type="text" name="patientName" id="patientName" value={patientData.name} readOnly className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-400 outline-none cursor-not-allowed" />
                        </div>
                        <div>
                            <label htmlFor="witnessName" className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Witness Name</label>
                            <input type="text" name="witnessName" id="witnessName" value={witnessName} onChange={(e) => setWitnessName(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none font-bold text-slate-900 transition-all placeholder:text-slate-300" placeholder="e.g., Nurse Name" />
                        </div>
                   </div>
                </div>

                <div className="p-10 border-t border-slate-100 bg-slate-50 shrink-0">
                    <button onClick={handleGenerate} className="w-full flex items-center justify-center gap-4 bg-amber-600 text-white font-black py-6 px-8 rounded-3xl shadow-2xl shadow-amber-500/30 hover:bg-amber-700 transition-all active:scale-[0.98] text-sm uppercase tracking-[0.2em]">
                        <DownloadIcon className="h-6 w-6"/>
                        Generate LAMA PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LamaModal;

