import React, { useEffect, useState } from 'react';
import { db, collection, getDocs, doc, updateDoc } from '../firebase';
import { DoctorProfile, DoctorRole } from '../types';
import { useAuth } from '../AuthContext';
import { 
    Users as UsersIcon, 
    CheckCircle as CheckCircleIcon, 
    XCircle as XCircleIcon, 
    ShieldCheck as ShieldCheckIcon,
    Mail as EnvelopeIcon,
    IdCard as IdentificationIcon,
    Building2 as BuildingOfficeIcon,
    Clock as ClockIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ClinicianManagement: React.FC = () => {
    const { profile } = useAuth();
    const [clinicians, setClinicians] = useState<DoctorProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'All' | 'Active' | 'Pending' | 'Suspended'>('All');

    const isOwner = profile?.role === 'Owner';
    const isAdmin = profile?.role === 'Admin' || isOwner;
    const isClinician = profile?.role === 'Clinician';

    useEffect(() => {
        fetchClinicians();
    }, []);

    const fetchClinicians = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'doctors'));
            const docs = querySnapshot.docs.map(doc => doc.data() as DoctorProfile);
            setClinicians(docs.sort((a, b) => b.createdAt - a.createdAt));
        } catch (error) {
            console.error("Error fetching clinicians:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (uid: string, newStatus: DoctorProfile['status']) => {
        try {
            await updateDoc(doc(db, 'doctors', uid), { status: newStatus });
            setClinicians(prev => prev.map(c => c.uid === uid ? { ...c, status: newStatus } : c));
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleRoleChange = async (uid: string, newRole: DoctorRole) => {
        try {
            await updateDoc(doc(db, 'doctors', uid), { role: newRole });
            setClinicians(prev => prev.map(c => c.uid === uid ? { ...c, role: newRole } : c));
        } catch (error) {
            console.error("Error updating role:", error);
        }
    };

    const filteredClinicians = clinicians.filter(c => filter === 'All' || c.status === filter);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center tracking-tight font-display">
                        <UsersIcon className="h-7 w-7 md:h-8 md:w-8 mr-3 text-brand-600" />
                        Clinician Directory
                    </h2>
                    <p className="text-slate-500 text-xs md:text-sm mt-1 font-medium">Manage access and roles for all medical staff</p>
                </div>
                <div className="flex bg-slate-100/50 p-1 rounded-xl self-start overflow-x-auto max-w-full scrollbar-hide">
                    {(['All', 'Active', 'Pending', 'Suspended'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`whitespace-nowrap px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${
                                filter === f 
                                ? 'bg-primary-100 text-brand-600 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 md:gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredClinicians.map((clinician) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            key={clinician.uid}
                            className="bg-primary-100 border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex flex-col sm:flex-row items-start justify-between mb-6 gap-4">
                                <div className="flex items-center space-x-4">
                                    <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-xl md:text-2xl border border-brand-100 shadow-sm">
                                        {clinician.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-900 text-lg md:text-xl tracking-tight font-display truncate">{clinician.name}</h3>
                                        <div className="flex items-center text-slate-400 text-[10px] md:text-xs font-medium mt-0.5 truncate">
                                            <EnvelopeIcon className="h-3.5 w-3.5 mr-1.5" />
                                            {clinician.email}
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest ${
                                    clinician.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                    clinician.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                    'bg-rose-50 text-rose-600 border border-rose-100'
                                }`}>
                                    {clinician.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm mb-8">
                                <div className="flex items-center text-slate-600 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                                    <IdentificationIcon className="h-4 w-4 mr-3 text-slate-400" />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">License</span>
                                        <span className="font-bold text-slate-700 text-xs">{clinician.licenseNumber || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center text-slate-600 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                                    <ShieldCheckIcon className="h-4 w-4 mr-3 text-slate-400" />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Role</span>
                                        <span className="font-bold text-slate-700 text-xs">{clinician.role}</span>
                                    </div>
                                </div>
                                <div className="flex items-center text-slate-600 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                                    <BuildingOfficeIcon className="h-4 w-4 mr-3 text-slate-400" />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Hospital</span>
                                        <span className="font-bold text-slate-700 text-xs truncate max-w-[120px]">{clinician.hospital || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center text-slate-600 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                                    <ClockIcon className="h-4 w-4 mr-3 text-slate-400" />
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Joined</span>
                                        <span className="font-bold text-slate-700 text-xs">{new Date(clinician.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="flex space-x-2">
                                    {clinician.status !== 'Active' && (
                                        <button 
                                            onClick={() => handleStatusChange(clinician.uid, 'Active')}
                                            className="flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                                            Activate
                                        </button>
                                    )}
                                    {clinician.status !== 'Suspended' && isAdmin && (
                                        <button 
                                            onClick={() => handleStatusChange(clinician.uid, 'Suspended')}
                                            className="flex items-center px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
                                        >
                                            <XCircleIcon className="h-4 w-4 mr-1" />
                                            Suspend
                                        </button>
                                    )}
                                </div>
                                
                                {isOwner ? (
                                    <select 
                                        value={clinician.role}
                                        onChange={(e) => handleRoleChange(clinician.uid, e.target.value as DoctorRole)}
                                        className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="Clinician">Clinician</option>
                                        <option value="Nurse">Nurse</option>
                                        <option value="MT">MT</option>
                                        <option value="WardBoy">Ward Boy</option>
                                        <option value="Admin">Admin</option>
                                        <option value="Owner">Owner</option>
                                    </select>
                                ) : (
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{clinician.role}</span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

