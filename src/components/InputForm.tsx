import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { PatientData } from '../types';
import { AnalyzeIcon, SparklesIcon, ChevronDownIcon, CameraIcon, UsersIcon } from './icons';

interface InputFormProps {
    patientData: PatientData;
    setPatientData: React.Dispatch<React.SetStateAction<PatientData>>;
    onSubmit: () => void;
    isLoading: boolean;
    onOpenSymptomChecker: () => void;
    tempUnit: 'C' | 'F';
    setTempUnit: (unit: 'C' | 'F') => void;
    onAnalyzeLabImage: (base64Data: string, mimeType: string) => void;
    onAnalyzeExamImage: (base64Data: string, mimeType: string) => void;
    onAnalyzeImagingImage: (base64Data: string, mimeType: string) => void;
    isProcessingLabs: boolean;
    isProcessingFindings: boolean;
    isProcessingImaging: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ 
    patientData, setPatientData, onSubmit, isLoading, onOpenSymptomChecker,
    tempUnit, setTempUnit,
    onAnalyzeLabImage, onAnalyzeExamImage, onAnalyzeImagingImage,
    isProcessingLabs, isProcessingFindings, isProcessingImaging
}) => {
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadTarget, setUploadTarget] = useState<'labs' | 'findings' | 'imaging' | null>(null);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setPatientData(prev => ({ ...prev, [name]: value }));
    };

    const handleVitalsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPatientData(prev => ({
            ...prev,
            vitals: {
                ...prev.vitals,
                [name]: value,
            }
        }));
    };
    
    // Fix: Add a handler for investigation fields which are stored in an object.
    const handleInvestigationChange = (key: string, value: string) => {
        setPatientData(prev => ({
            ...prev,
            investigations: {
                ...prev.investigations,
                [key]: value,
            },
        }));
    };

    const triggerFileUpload = (target: 'labs' | 'findings' | 'imaging') => {
        setUploadTarget(target);
        fileInputRef.current?.click();
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadTarget) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            if (reader.result) {
                const base64String = (reader.result as string).split(',')[1];
                if (uploadTarget === 'labs') {
                    onAnalyzeLabImage(base64String, file.type);
                } else if (uploadTarget === 'findings') {
                    onAnalyzeExamImage(base64String, file.type);
                } else if (uploadTarget === 'imaging') {
                    onAnalyzeImagingImage(base64String, file.type);
                }
            }
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // Reset file input
    };

    // Fix: Validate against 'primaryComplaint' instead of non-existent 'symptoms'.
    const isFormValid = patientData.age && patientData.primaryComplaint;

    return (
        <div className="bg-primary-100 p-6 md:p-10 rounded-2xl md:rounded-[3rem] border border-slate-100 shadow-sm sticky top-8 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700 group">
            <div className="flex items-center justify-between mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-display flex items-center">
                    <div className="w-1 md:w-1.5 h-6 md:h-8 bg-brand-600 rounded-full mr-3 md:mr-4"></div>
                    Patient Intake
                </h2>
                <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl md:rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 shadow-inner group-hover:scale-110 transition-transform duration-500">
                    <UsersIcon className="h-4 w-4 md:h-5 md:w-5" />
                </div>
            </div>
            
            <div className="mb-6 md:mb-8">
                <button
                    type="button"
                    onClick={onOpenSymptomChecker}
                    className="w-full flex items-center justify-center text-[10px] md:text-xs bg-brand-50 text-brand-700 font-bold py-3.5 md:py-4 px-4 md:px-6 rounded-xl md:rounded-2xl shadow-sm border border-brand-100 hover:bg-brand-100 hover:shadow-xl hover:shadow-brand-500/20 transition-all duration-300 uppercase tracking-widest"
                >
                    <SparklesIcon className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3 text-brand-500" />
                    AI Symptom Checker
                </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-5 md:space-y-6">
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div>
                        <label htmlFor="age" className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5 md:mb-2 ml-1">Age</label>
                        <input type="number" name="age" id="age" value={patientData.age} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3.5 md:py-4 px-4 md:px-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium text-sm md:text-base" placeholder="e.g., 28" required />
                    </div>
                    <div>
                        <label htmlFor="sex" className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5 md:mb-2 ml-1">Sex</label>
                        <select name="sex" id="sex" value={patientData.sex} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3.5 md:py-4 px-4 md:px-6 text-slate-900 appearance-none cursor-pointer focus:ring-2 focus:ring-brand-500/20 transition-all font-bold text-[10px] md:text-xs uppercase tracking-widest">
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="symptoms" className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5 md:mb-2 ml-1">Symptoms & Chief Complaint</label>
                    <textarea name="primaryComplaint" id="symptoms" rows={4} value={patientData.primaryComplaint} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl md:rounded-3xl py-4 md:py-5 px-4 md:px-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium resize-none text-sm md:text-base" placeholder="e.g., Fever, joint pain, rash on cheeks..." required />
                </div>

                <div>
                     <div className="flex justify-between items-center mb-1.5 md:mb-2 ml-1">
                        <label htmlFor="findings" className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Examination Findings</label>
                        <button type="button" onClick={() => triggerFileUpload('findings')} disabled={isProcessingFindings} className="flex items-center text-[9px] md:text-[10px] text-brand-600 font-bold uppercase tracking-widest hover:underline disabled:text-slate-300 disabled:no-underline transition-all">
                           <CameraIcon className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2"/> {isProcessingFindings ? 'Analyzing...' : 'Upload Photo'}
                        </button>
                    </div>
                    <textarea name="findings" id="findings" rows={3} value={patientData.findings} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-2xl md:rounded-3xl py-4 md:py-5 px-4 md:px-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium resize-none text-sm md:text-base" placeholder="e.g., Malar rash, non-erosive arthritis..." />
                </div>

                <div className="pt-1 md:pt-2">
                    <button type="button" onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="w-full flex justify-between items-center text-left font-bold text-slate-700 py-3.5 md:py-4 px-4 md:px-6 bg-slate-50 rounded-xl md:rounded-2xl hover:bg-slate-100 transition-all group/btn">
                        <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em]">Past History & Allergies</span>
                        <ChevronDownIcon className={`h-4 w-4 md:h-5 md:w-5 text-slate-400 transform transition-transform duration-500 ${isHistoryOpen ? 'rotate-180' : ''} group-hover/btn:text-brand-600`} />
                    </button>
                    {isHistoryOpen && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-5 md:space-y-6 mt-5 md:mt-6 px-1 md:px-2"
                        >
                            <div><label htmlFor="pmh" className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5 md:mb-2 ml-1">Past Medical History</label><textarea name="pmh" id="pmh" rows={2} value={patientData.pmh} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3.5 md:py-4 px-4 md:px-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium resize-none text-sm md:text-base" placeholder="e.g., Hypertension, Type 2 Diabetes" /></div>
                            <div><label htmlFor="psh" className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5 md:mb-2 ml-1">Past Surgical History</label><textarea name="psh" id="psh" rows={2} value={patientData.psh} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3.5 md:py-4 px-4 md:px-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium resize-none text-sm md:text-base" placeholder="e.g., Appendectomy (2005)" /></div>
                            <div><label htmlFor="socialHistory" className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5 md:mb-2 ml-1">Personal/Social History</label><textarea name="socialHistory" id="socialHistory" rows={2} value={patientData.socialHistory} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3.5 md:py-4 px-4 md:px-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium resize-none text-sm md:text-base" placeholder="e.g., Smoking: 10 pack-years" /></div>
                            <div><label htmlFor="allergies" className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5 md:mb-2 ml-1">Allergies</label><textarea name="allergies" id="allergies" rows={2} value={patientData.allergies} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3.5 md:py-4 px-4 md:px-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium resize-none text-sm md:text-base" placeholder="e.g., Penicillin (rash)" /></div>
                        </motion.div>
                    )}
                </div>

                <div className="pt-3 md:pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-5 md:mb-6">
                        <h3 className="text-base md:text-lg font-bold text-slate-900 tracking-tight font-display">Vital Signs</h3>
                        <div className="flex bg-slate-50 p-1 rounded-lg md:rounded-xl border border-slate-100">
                            <button type="button" onClick={() => setTempUnit('C')} className={`px-3 md:px-4 py-1.5 text-[9px] md:text-[10px] font-bold rounded-md md:rounded-lg transition-all ${tempUnit === 'C' ? 'bg-primary-100 text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>°C</button>
                            <button type="button" onClick={() => setTempUnit('F')} className={`px-3 md:px-4 py-1.5 text-[9px] md:text-[10px] font-bold rounded-md md:rounded-lg transition-all ${tempUnit === 'F' ? 'bg-primary-100 text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>°F</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 md:gap-x-6 gap-y-3 md:gap-y-4">
                        <div><label htmlFor="temp" className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5 md:mb-2 ml-1">Temp ({`°${tempUnit}`})</label><input type="text" name="temp" id="temp" value={patientData.vitals.temp} onChange={handleVitalsChange} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3.5 md:py-4 px-4 md:px-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium text-sm md:text-base" placeholder={tempUnit === 'C' ? '38.5' : '101.3'} /></div>
                        <div><label htmlFor="hr" className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5 md:mb-2 ml-1">HR (bpm)</label><input type="text" name="hr" id="hr" value={patientData.vitals.hr} onChange={handleVitalsChange} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3.5 md:py-4 px-4 md:px-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium text-sm md:text-base" placeholder="e.g., 95" /></div>
                        <div><label htmlFor="rr" className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5 md:mb-2 ml-1">RR (bpm)</label><input type="text" name="rr" id="rr" value={patientData.vitals.rr} onChange={handleVitalsChange} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3.5 md:py-4 px-4 md:px-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium text-sm md:text-base" placeholder="e.g., 18" /></div>
                        <div><label htmlFor="bp" className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5 md:mb-2 ml-1">BP (mmHg)</label><input type="text" name="bp" id="bp" value={patientData.vitals.bp} onChange={handleVitalsChange} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3.5 md:py-4 px-4 md:px-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium text-sm md:text-base" placeholder="e.g., 120/80" /></div>
                        <div className="col-span-2"><label htmlFor="spo2" className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5 md:mb-2 ml-1">SpO2 (%)</label><input type="text" name="spo2" id="spo2" value={patientData.vitals.spo2} onChange={handleVitalsChange} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3.5 md:py-4 px-4 md:px-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium text-sm md:text-base" placeholder="e.g., 98" /></div>
                    </div>
                </div>

                <div className="pt-3 md:pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-1.5 md:mb-2 ml-1">
                        <label htmlFor="labs" className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Lab Results</label>
                        <button type="button" onClick={() => triggerFileUpload('labs')} disabled={isProcessingLabs} className="flex items-center text-[9px] md:text-[10px] text-brand-600 font-bold uppercase tracking-widest hover:underline disabled:text-slate-300 disabled:no-underline transition-all">
                           <CameraIcon className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2"/> {isProcessingLabs ? 'Analyzing...' : 'Upload Photo'}
                        </button>
                    </div>
                    <textarea name="labs" id="labs" rows={3} value={patientData.investigations['Labs'] || ''} onChange={(e) => handleInvestigationChange('Labs', e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl md:rounded-3xl py-4 md:py-5 px-4 md:px-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium resize-none text-sm md:text-base" placeholder="e.g., ANA positive, ESR 50 mm/hr, or upload a photo of the report." />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1.5 md:mb-2 ml-1">
                        <label htmlFor="imaging" className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Imaging Results</label>
                         <button type="button" onClick={() => triggerFileUpload('imaging')} disabled={isProcessingImaging} className="flex items-center text-[9px] md:text-[10px] text-brand-600 font-bold uppercase tracking-widest hover:underline disabled:text-slate-300 disabled:no-underline transition-all">
                           <CameraIcon className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2"/> {isProcessingImaging ? 'Analyzing...' : 'Upload Photo'}
                        </button>
                    </div>
                    <textarea name="imaging" id="imaging" rows={3} value={patientData.investigations['Imaging'] || ''} onChange={(e) => handleInvestigationChange('Imaging', e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl md:rounded-3xl py-4 md:py-5 px-4 md:px-6 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium resize-none text-sm md:text-base" placeholder="e.g., Chest X-ray clear, MRI brain shows..." />
                </div>
                
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" capture="environment" className="hidden" />

                <button type="submit" disabled={!isFormValid || isLoading} className="w-full flex items-center justify-center bg-brand-600 text-white font-bold py-4 md:py-5 px-6 md:px-8 rounded-xl md:rounded-[2rem] shadow-xl shadow-brand-500/30 hover:bg-brand-700 hover:scale-[1.02] active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:scale-100 transition-all duration-300 focus:outline-none uppercase tracking-[0.2em] text-[10px] md:text-xs">
                    {isLoading ? (
                        <div className="flex items-center">
                            <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Analyzing...
                        </div>
                    ) : (
                        <div className="flex items-center">
                            <AnalyzeIcon className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
                            Generate Diagnosis
                        </div>
                    )}
                </button>
            </form>
        </div>
    );
};

export default InputForm;

