
import React, { useState } from 'react';
import { StethoscopeIcon, ChartBarIcon, UserCircleIcon, FolderOpenIcon, PlusCircleIcon, SparklesIcon, UsersIcon, ChartPieIcon, Bars3Icon, XMarkIcon } from './icons';
import ThemeSwitcher from './ThemeSwitcher';

interface HeaderProps {
    onOpenInsights: () => void;
    onOpenProfile: () => void;
    onNavigate: (view: 'records' | 'encounter' | 'clinicians' | 'dashboard') => void;
    onNewEncounter: () => void;
    onOpenPricing: () => void;
    onLogout: () => void;
    onSwitchAccount: () => void;
    onOpenAudit: () => void;
    isSaving: boolean;
    isPro: boolean;
    role?: string;
}

const Header: React.FC<HeaderProps> = ({ onOpenInsights, onOpenProfile, onNavigate, onNewEncounter, onOpenPricing, onLogout, onSwitchAccount, onOpenAudit, isSaving, isPro, role }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const isAdmin = role === 'Owner' || role === 'Admin';

    const handleNavigate = (view: 'records' | 'encounter' | 'clinicians' | 'dashboard') => {
        onNavigate(view);
        setIsMobileMenuOpen(false);
    };

    return (
        <header className="sticky top-0 z-50 bg-primary-100/70 backdrop-blur-2xl border-b border-primary-300/40 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                <div className="flex items-center cursor-pointer group" onClick={() => handleNavigate('dashboard')}>
                    <div className="bg-gradient-to-br from-brand-500 to-brand-700 p-2.5 rounded-xl mr-3.5 shadow-[0_0_20px_rgba(0,213,255,0.3)] flex items-center justify-center w-11 h-11 transition-all group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(0,213,255,0.5)]">
                        <StethoscopeIcon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-black text-white tracking-tight leading-none">
                            MediDx
                        </h1>
                        <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(0,213,255,0.6)]"></div>
                            <span className="text-[9px] font-black text-white0 uppercase tracking-widest">Clinical CDS</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <nav className="hidden lg:flex items-center bg-primary-200/60 p-1 rounded-xl mr-4 border border-primary-300/30">
                        <button
                            onClick={() => handleNavigate('dashboard')}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all hover:bg-primary-300/50 hover:text-brand-400 text-primary-600"
                        >
                            <ChartPieIcon className="h-3.5 w-3.5" />
                            Dashboard
                        </button>
                        <button
                            onClick={() => handleNavigate('records')}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all hover:bg-primary-300/50 hover:text-brand-400 text-primary-600"
                        >
                            <FolderOpenIcon className="h-3.5 w-3.5" />
                            Records
                        </button>
                        <button
                            onClick={() => handleNavigate('clinicians')}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all hover:bg-primary-300/50 hover:text-brand-400 text-primary-600"
                        >
                            <UsersIcon className="h-3.5 w-3.5" />
                            Clinicians
                        </button>
                    </nav>

                    <div className="flex items-center gap-3">
                        {!isPro && (
                            <button
                                onClick={onOpenPricing}
                                className="hidden sm:flex items-center text-[9px] bg-gradient-to-r from-amber-500 to-amber-400 text-white font-black py-2 px-4 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all uppercase tracking-widest"
                            >
                                <SparklesIcon className="h-3.5 w-3.5 mr-1.5" />
                                Pro
                            </button>
                        )}
                        
                        <button
                            onClick={onNewEncounter}
                            className="bg-brand-500 text-white font-black py-2.5 px-5 rounded-xl shadow-[0_0_20px_rgba(0,213,255,0.25)] hover:shadow-[0_0_30px_rgba(0,213,255,0.5)] hover:scale-[1.02] transition-all flex items-center gap-2 text-xs tracking-tight"
                            title="Create a New Patient Case"
                        >
                            <PlusCircleIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">New Case</span>
                        </button>

                        <div className="h-8 w-px bg-primary-400/30 mx-1 hidden md:block"></div>

                        <div className="flex items-center gap-2 ml-1 pl-3 border-l border-primary-400/30">
                            <ThemeSwitcher />
                            <button
                                onClick={onOpenProfile}
                                className="w-10 h-10 rounded-xl bg-primary-200/50 flex items-center justify-center hover:bg-primary-300/50 transition-all border border-primary-300/40 shadow-sm overflow-hidden group"
                            >
                                <UserCircleIcon className="h-6 w-6 text-brand-400 group-hover:scale-110 transition-transform" />
                            </button>
                            <div className="hidden xl:flex flex-col">
                                <span className="text-[9px] font-black text-primary-800 uppercase tracking-widest">
                                    Clinician
                                </span>
                                <span className="text-[9px] font-bold text-white0 uppercase tracking-widest mt-0.5">
                                    Verified
                                </span>
                            </div>
                            
                            {/* Mobile Menu Toggle */}
                            <button 
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="lg:hidden p-2 text-primary-600 hover:text-brand-400 transition-colors"
                            >
                                {isMobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
                <div className="lg:hidden bg-primary-100/95 backdrop-blur-2xl border-t border-primary-300/30 animate-slide-up">
                    <nav className="flex flex-col p-4 space-y-2">
                        <button
                            onClick={() => handleNavigate('dashboard')}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-primary-700 hover:bg-primary-200/50 hover:text-brand-400 transition-all"
                        >
                            <ChartPieIcon className="h-5 w-5" />
                            Dashboard
                        </button>
                        <button
                            onClick={() => handleNavigate('records')}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-primary-700 hover:bg-primary-200/50 hover:text-brand-400 transition-all"
                        >
                            <FolderOpenIcon className="h-5 w-5" />
                            Records
                        </button>
                        <button
                            onClick={() => handleNavigate('clinicians')}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-primary-700 hover:bg-primary-200/50 hover:text-brand-400 transition-all"
                        >
                            <UsersIcon className="h-5 w-5" />
                            Clinicians
                        </button>
                        <div className="pt-4 mt-2 border-t border-primary-300/30 flex flex-col space-y-2">
                            <button 
                                onClick={() => { onOpenInsights(); setIsMobileMenuOpen(false); }}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-primary-700 hover:bg-primary-200/50 transition-all"
                            >
                                <SparklesIcon className="h-5 w-5 text-amber-400" />
                                AI Insights
                            </button>
                            <button 
                                onClick={() => { onOpenAudit(); setIsMobileMenuOpen(false); }}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-primary-700 hover:bg-primary-200/50 transition-all"
                            >
                                <ChartBarIcon className="h-5 w-5 text-brand-400" />
                                System Audit
                            </button>
                            <button 
                                onClick={onLogout}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-rose-400 hover:bg-rose-500/10 transition-all"
                            >
                                Logout
                            </button>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Header;

