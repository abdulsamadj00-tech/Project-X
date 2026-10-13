
import React, { useState } from 'react';
import { DoctorProfile, DoctorRole } from '../types';
import { XMarkIcon } from './icons';

interface UserProfileModalProps {
    onClose: () => void;
    onSave: (details: Partial<DoctorProfile>) => void;
    initialDetails: DoctorProfile;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose, onSave, initialDetails }) => {
    const [details, setDetails] = useState<DoctorProfile>(initialDetails);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onSave(details);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <div className="bg-primary-100 rounded-2xl md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 md:p-8 border-b border-slate-100 shrink-0">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-display">Clinician Details</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-50 rounded-xl">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 md:p-8 space-y-5 md:space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-1.5 md:space-y-2">
                        <label htmlFor="name" className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input type="text" name="name" id="name" value={details.name} onChange={handleChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl py-3 md:py-3.5 px-4 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-slate-900 text-sm md:text-base" placeholder="e.g., Dr. Jane Doe" />
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                        <label htmlFor="role" className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                        <select name="role" id="role" value={details.role} onChange={handleChange} disabled={details.role === 'Owner'} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl py-3 md:py-3.5 px-4 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-slate-900 appearance-none text-sm md:text-base disabled:opacity-60">
                            <option value="Clinician">Clinician</option>
                            <option value="Nurse">Nurse</option>
                            <option value="MT">MT</option>
                            <option value="WardBoy">Ward Boy</option>
                            <option value="Admin">Admin</option>
                            <option value="Owner">Owner</option>
                        </select>
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                        <label htmlFor="position" className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Position / Year of Study</label>
                        <input type="text" name="position" id="position" value={details.position} onChange={handleChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl py-3 md:py-3.5 px-4 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-slate-900 text-sm md:text-base" placeholder="e.g. Senior Resident" />
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                        <label htmlFor="institution" className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Hospital / Medical College</label>
                        <input type="text" name="institution" id="institution" value={details.institution} onChange={handleChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl py-3 md:py-3.5 px-4 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-slate-900 text-sm md:text-base" placeholder="e.g. City Hospital" />
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                        <label htmlFor="specialty" className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Specialty</label>
                        <input type="text" name="specialty" id="specialty" value={details.specialty} onChange={handleChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl py-3 md:py-3.5 px-4 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-slate-900 text-sm md:text-base" placeholder="e.g. Cardiology" />
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                        <label htmlFor="licenseNumber" className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-1">License / ID Number (Optional)</label>
                        <input type="text" name="licenseNumber" id="licenseNumber" value={details.licenseNumber} onChange={handleChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl py-3 md:py-3.5 px-4 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-bold text-slate-900 text-sm md:text-base" placeholder="e.g., GMC #1234567" />
                    </div>
                </div>
                <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50 shrink-0">
                    <button onClick={handleSave} className="w-full bg-brand-600 text-white font-bold py-3.5 md:py-4 px-6 rounded-xl md:rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition-all active:scale-95 text-sm md:text-base uppercase tracking-widest">
                        Save Details
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;

