
import React, { useState, useMemo } from 'react';
import { Encounter } from '../types';
import { MagnifyingGlassIcon, TagIcon, TrashIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';

interface PatientRecordsViewProps {
    encounters: Encounter[];
    onSelectEncounter: (id: string) => void;
    onDeleteEncounter: (id: string) => void;
}

const PatientRecordsView: React.FC<PatientRecordsViewProps> = ({ encounters, onSelectEncounter, onDeleteEncounter }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | Encounter['status']>('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        encounters.forEach(e => {
            e.tags?.forEach(t => tags.add(t));
        });
        return Array.from(tags).sort();
    }, [encounters]);

    const handleTagClick = (tag: string) => {
        setSelectedTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const filteredEncounters = useMemo(() => {
        const now = Date.now();
        let days = 0;
        if (dateFilter === 'week') days = 7;
        if (dateFilter === 'month') days = 30;
        if (dateFilter === 'year') days = 365;
        const dateCutoff = days > 0 ? now - (days * 24 * 60 * 60 * 1000) : 0;

        return encounters
            .filter(e => {
                if (statusFilter !== 'all' && e.status !== statusFilter) return false;
                if (dateFilter !== 'all' && e.timestamp < dateCutoff) return false;
                if (selectedTags.length > 0 && !selectedTags.every(tag => e.tags?.includes(tag))) return false;
                
                if (searchTerm.trim() === '') return true;
                const lowerSearch = searchTerm.toLowerCase();
                const nameMatch = e.patientData.name?.toLowerCase().includes(lowerSearch);
                const diagnosisMatch = e.provisionalDiagnoses.some(d => d.diagnosisName.toLowerCase().includes(lowerSearch)) || e.finalDiagnosis?.diagnosisName.toLowerCase().includes(lowerSearch);
                const tagMatch = e.tags?.some(t => t.toLowerCase().includes(lowerSearch));
                const idMatch = e.id.toLowerCase().includes(lowerSearch);
                return nameMatch || diagnosisMatch || tagMatch || idMatch;
            })
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [encounters, searchTerm, statusFilter, dateFilter, selectedTags]);

    const selectClasses = "w-full bg-primary-200/60 border border-primary-300/30 rounded-xl md:rounded-2xl py-3.5 md:py-4 px-4 md:px-6 text-white appearance-none cursor-pointer focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-all font-bold text-[10px] md:text-xs uppercase tracking-widest backdrop-blur-md";
    
    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-slide-up">
            <div className="text-center px-4">
                <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tighter mb-3 md:mb-4 font-display">Patient Case Records</h2>
                <p className="text-primary-600 font-medium text-base md:text-lg max-w-2xl mx-auto">Search, filter, and manage all patient encounters with precision and ease.</p>
            </div>
            
            <div className="bg-primary-100/60 backdrop-blur-2xl p-6 md:p-8 rounded-2xl md:rounded-[3rem] border border-primary-300/30 shadow-[0_8px_30px_rgb(0,0,0,0.3)] sticky top-[70px] md:top-[81px] z-10 mx-4 md:mx-0">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-6 items-center">
                    <div className="relative md:col-span-3">
                        <MagnifyingGlassIcon className="h-5 w-5 md:h-6 md:w-6 text-white0 absolute top-1/2 left-4 md:left-5 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search name, diagnosis, tag, ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-primary-200/60 border border-primary-300/30 rounded-xl md:rounded-2xl py-3.5 md:py-4 pl-12 md:pl-14 pr-4 md:pr-6 text-white placeholder:text-white0 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-all font-medium text-sm md:text-base backdrop-blur-md outline-none"
                        />
                    </div>
                     <div className="md:col-span-1">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className={selectClasses}
                        >
                            <option value="all">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Discharged">Discharged</option>
                            <option value="Referred">Referred</option>
                            <option value="LAMA">LAMA</option>
                        </select>
                    </div>
                     <div className="md:col-span-2">
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className={selectClasses}
                        >
                            <option value="all">All Time</option>
                            <option value="week">Last 7 Days</option>
                            <option value="month">Last 30 Days</option>
                            <option value="year">Last Year</option>
                        </select>
                    </div>
                </div>
                {allTags.length > 0 && (
                    <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-primary-300/20">
                         <h4 className="text-[9px] md:text-[10px] font-bold text-white0 uppercase tracking-[0.3em] mb-3 md:mb-4 ml-1">Filter by Tags</h4>
                         <div className="flex flex-wrap gap-2 md:gap-3">
                            {allTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => handleTagClick(tag)}
                                    className={`px-4 md:px-5 py-1.5 md:py-2 text-[9px] md:text-[10px] font-bold uppercase tracking-widest rounded-lg md:rounded-xl transition-all duration-300 ${
                                        selectedTags.includes(tag)
                                            ? 'bg-brand-500 text-white shadow-[0_0_20px_rgba(0,213,255,0.3)] scale-105'
                                            : 'bg-primary-200/50 text-primary-600 hover:bg-primary-300/50 border border-primary-300/30'
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                         </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:gap-6 px-4 md:px-0">
                <AnimatePresence mode="popLayout">
                    {filteredEncounters.length > 0 ? (
                        filteredEncounters.map(encounter => (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={encounter.id} 
                                className="bg-primary-100/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-primary-300/30 shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex items-start lg:items-center justify-between flex-col lg:flex-row gap-6 md:gap-8 hover:shadow-[0_12px_40px_rgba(0,213,255,0.1)] hover:border-brand-500/20 transition-all duration-500 group relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1 md:w-1.5 h-full bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_10px_rgba(0,213,255,0.5)]"></div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-8 flex-grow w-full">
                                    <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl md:rounded-3xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-2xl md:text-3xl group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(0,213,255,0.2)] transition-all duration-500 shrink-0">
                                        {encounter.patientData.name.charAt(0)}
                                    </div>
                                    <div className="flex-grow min-w-0 w-full">
                                        <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-1 md:mb-2">
                                            <p className="font-bold text-xl md:text-2xl text-white group-hover:text-brand-400 transition-colors duration-500 font-display truncate max-w-full">{encounter.patientData.name || 'Unnamed Patient'}</p>
                                            <span className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest ${
                                                encounter.status === 'Active' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            }`}>
                                                {encounter.status}
                                            </span>
                                        </div>
                                        <p className="text-[9px] md:text-[10px] text-white0 font-bold uppercase tracking-[0.2em] truncate">
                                            {new Date(encounter.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} | ID: {encounter.id.slice(0, 8)}
                                        </p>
                                        <div className="mt-3 md:mt-4 flex flex-wrap items-center gap-2 md:gap-3">
                                            <div className="px-3 md:px-4 py-1.5 md:py-2 bg-primary-200/50 rounded-lg md:rounded-xl border border-primary-300/30">
                                                <span className="text-white0 font-bold uppercase text-[8px] md:text-[9px] tracking-widest mr-2">Diagnosis</span> 
                                                <span className="text-xs md:text-sm text-primary-800 font-bold">{encounter.finalDiagnosis?.diagnosisName || encounter.provisionalDiagnoses[0]?.diagnosisName || 'Pending Evaluation'}</span>
                                            </div>
                                            {encounter.tags?.map(tag => (
                                                <span key={tag} className="flex items-center bg-primary-200/50 text-primary-600 px-2.5 md:px-3 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest rounded-lg md:rounded-xl border border-primary-300/30">
                                                    <TagIcon className="h-3 w-3 md:h-3.5 md:w-3.5 mr-1 md:mr-1.5 text-white0" /> {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 md:gap-4 w-full lg:w-auto">
                                    <button
                                        onClick={() => onSelectEncounter(encounter.id)}
                                        className="flex-grow lg:flex-grow-0 px-6 md:px-8 py-3.5 md:py-4 bg-brand-500 text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-brand-400 hover:shadow-[0_0_25px_rgba(0,213,255,0.3)] transition-all duration-300"
                                    >
                                        Open Case
                                    </button>
                                    <button
                                        onClick={() => onDeleteEncounter(encounter.id)}
                                        className="p-3.5 md:p-4 text-white0 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl md:rounded-2xl transition-all duration-300 border border-transparent hover:border-rose-500/20"
                                        title="Delete Case"
                                    >
                                        <TrashIcon className="h-5 w-5 md:h-6 md:w-6" />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20 md:py-32 bg-primary-100/60 backdrop-blur-xl rounded-2xl md:rounded-[3rem] border border-primary-300/30 shadow-[0_8px_30px_rgb(0,0,0,0.3)]"
                        >
                            <div className="h-20 w-20 md:h-24 md:w-24 bg-primary-200/50 rounded-2xl md:rounded-[2rem] flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-inner border border-primary-300/30">
                                <MagnifyingGlassIcon className="h-8 w-8 md:h-10 md:w-10 text-white0" />
                            </div>
                            <p className="text-primary-700 font-bold text-lg md:text-xl px-4">{encounters.length === 0 ? "No patient cases have been created yet." : "No encounters match your search criteria."}</p>
                            {encounters.length > 0 && (
                                <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setDateFilter('all'); setSelectedTags([]); }} className="text-[10px] md:text-xs font-bold text-brand-400 hover:text-brand-300 mt-4 md:mt-6 uppercase tracking-[0.2em] hover:underline underline-offset-8">
                                    Clear all filters
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default PatientRecordsView;

