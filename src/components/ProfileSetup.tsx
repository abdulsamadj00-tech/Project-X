import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { DoctorRole } from '../types';
import { motion } from 'framer-motion';
import { 
    User, 
    Building2, 
    GraduationCap, 
    Award,
    Briefcase,
    Stethoscope,
    ArrowRight
} from 'lucide-react';

export const ProfileSetup: React.FC = () => {
    const { profile, updateProfile, logout } = useAuth();
    const [name, setName] = useState(profile?.name || '');
    const [role, setRole] = useState<DoctorRole>(profile?.role || 'Clinician');
    const [position, setPosition] = useState('');
    const [institution, setInstitution] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !position || !institution) {
            alert("Please fill in all required fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            await updateProfile({
                name,
                role,
                position,
                institution,
                specialty,
                licenseNumber,
                hospital: institution, // Sync hospital with institution for backward compatibility
                isProfileComplete: true
            });
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClasses = "w-full bg-primary-200/50 border border-primary-300/50 rounded-xl md:rounded-2xl py-3 md:py-3.5 pl-10 md:pl-12 pr-4 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all font-bold text-white text-sm md:text-base placeholder:text-white0 backdrop-blur-md";
    const iconClasses = "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-white0";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary-50/90 backdrop-blur-xl p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-primary-100/80 backdrop-blur-2xl w-full max-w-lg rounded-2xl md:rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden border border-primary-300/30 max-h-[95vh] flex flex-col"
            >
                <div className="bg-gradient-to-r from-brand-700 to-brand-500 p-6 md:p-8 text-white shrink-0 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-100/10 rounded-full blur-2xl"></div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight relative z-10">Complete Your Profile</h2>
                    <p className="text-brand-100/80 mt-1 md:mt-2 font-medium text-sm md:text-base relative z-10">Welcome to MediDx! Please provide your professional details to continue.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 md:space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-5 md:gap-6">
                        {/* Name */}
                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[10px] md:text-xs font-black text-white0 uppercase tracking-widest ml-1">Full Name *</label>
                            <div className="relative">
                                <User className={iconClasses} />
                                <input 
                                    type="text" 
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={inputClasses}
                                    placeholder="Dr. John Doe"
                                />
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[10px] md:text-xs font-black text-white0 uppercase tracking-widest ml-1">Your Role *</label>
                            <div className="relative">
                                <Briefcase className={iconClasses} />
                                <select 
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as DoctorRole)}
                                    className={inputClasses + " appearance-none cursor-pointer"}
                                >
                                    <option value="Clinician">Clinician / Doctor</option>
                                    <option value="Nurse">Nurse</option>
                                    <option value="MT">Medical Technician (MT)</option>
                                    <option value="WardBoy">Ward Boy</option>
                                </select>
                            </div>
                        </div>

                        {/* Position / Year of Study */}
                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[10px] md:text-xs font-black text-white0 uppercase tracking-widest ml-1">Position / Year of Study *</label>
                            <div className="relative">
                                <GraduationCap className={iconClasses} />
                                <input 
                                    type="text" 
                                    required
                                    value={position}
                                    onChange={(e) => setPosition(e.target.value)}
                                    className={inputClasses}
                                    placeholder="e.g. Senior Resident, 3rd Year MBBS"
                                />
                            </div>
                        </div>

                        {/* Hospital / Medical College */}
                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[10px] md:text-xs font-black text-white0 uppercase tracking-widest ml-1">Hospital / Medical College *</label>
                            <div className="relative">
                                <Building2 className={iconClasses} />
                                <input 
                                    type="text" 
                                    required
                                    value={institution}
                                    onChange={(e) => setInstitution(e.target.value)}
                                    className={inputClasses}
                                    placeholder="e.g. City General Hospital"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                            {/* Specialty */}
                            <div className="space-y-1.5 md:space-y-2">
                                <label className="text-[10px] md:text-xs font-black text-white0 uppercase tracking-widest ml-1">Specialty</label>
                                <input 
                                    type="text" 
                                    value={specialty}
                                    onChange={(e) => setSpecialty(e.target.value)}
                                    className="w-full bg-primary-200/50 border border-primary-300/50 rounded-xl md:rounded-2xl py-3 md:py-3.5 px-4 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all font-bold text-white text-sm md:text-base placeholder:text-white0 backdrop-blur-md"
                                    placeholder="e.g. Cardiology"
                                />
                            </div>
                            {/* License Number */}
                            <div className="space-y-1.5 md:space-y-2">
                                <label className="text-[10px] md:text-xs font-black text-white0 uppercase tracking-widest ml-1">License No.</label>
                                <div className="relative">
                                    <Award className={iconClasses} />
                                    <input 
                                        type="text" 
                                        value={licenseNumber}
                                        onChange={(e) => setLicenseNumber(e.target.value)}
                                        className={inputClasses}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 pt-4 shrink-0">
                        <button 
                            type="button"
                            onClick={logout}
                            className="w-full sm:flex-1 py-3.5 md:py-4 px-6 rounded-xl md:rounded-2xl font-bold text-primary-600 hover:bg-primary-200/50 transition-all active:scale-95 text-sm md:text-base border border-primary-300/30"
                        >
                            Logout
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:flex-[2] bg-brand-500 text-white py-3.5 md:py-4 px-6 rounded-xl md:rounded-2xl font-bold shadow-[0_0_30px_rgba(0,213,255,0.3)] hover:shadow-[0_0_50px_rgba(0,213,255,0.5)] hover:bg-brand-400 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 text-sm md:text-base"
                        >
                            {isSubmitting ? 'Saving...' : 'Start Using MediDx'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

