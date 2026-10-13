
import React, { useState, useCallback, useEffect } from 'react';

import { PatientData, Diagnosis, Encounter, DoctorDetails, ReportModules, Treatment, ProgressNote, VitalsRecord, AIRecommendation } from './types';
import Header from './components/Header';
import DisclaimerFooter from './components/DisclaimerFooter';
import { generateComprehensivePdf, generateDischargeSummaryPdf, generateLamaPdf, generateReferralPdf } from './utils/reportGenerator';
import InsightsModal from './components/InsightsModal';
import { generateDiagnoses, generatePersonalizedInsights, generateAIRecommendations, generateProgressSummary } from './services/geminiService';
import UserProfileModal from './components/UserProfileModal';
import PatientRecordsView from './components/PatientRecordsView';
import EncounterView from './components/EncounterDashboard';
import PricingModal from './components/PricingModal';
import { ClinicianManagement } from './components/ClinicianManagement';
import { Dashboard } from './components/Dashboard';
import { ProfileSetup } from './components/ProfileSetup';
import { AuthProvider, useAuth } from './AuthContext';
import { CaseProvider, useCases } from './CaseContext';
import { ThemeProvider } from './ThemeContext';
import { StethoscopeIcon } from './components/icons';
import { Toaster, toast } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import SystemAudit from './components/SystemAudit';

const BLANK_PATIENT_DATA: PatientData = {
    name: '',
    age: '',
    sex: 'Male',
    primaryComplaint: '',
    hopi: '',
    findings: '',
    vitals: { temp: '', hr: '', rr: '', bp: '', spo2: '' },
    pmh: '',
    psh: '',
    socialHistory: '',
    allergies: '',
    investigations: {},
};

const AppContent: React.FC = () => {
    const { user, profile, signIn, signInAsGuest, logout, updateProfile, loading: authLoading } = useAuth();
    const { encounters, loading: casesLoading, createEncounter, addRandomCase, updateEncounter, deleteEncounter } = useCases();
    
    const [activeView, setActiveView] = useState<'records' | 'encounter' | 'clinicians' | 'dashboard'>('dashboard');
    const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
    const [isInsightsModalOpen, setIsInsightsModalOpen] = useState<boolean>(false);
    const [insightsReport, setInsightsReport] = useState<string | null>(null);
    const [isGeneratingInsights, setIsGeneratingInsights] = useState<boolean>(false);
    const [insightsError, setInsightsError] = useState<string | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
    const [isPricingModalOpen, setIsPricingModalOpen] = useState<boolean>(false);
    const [isPro, setIsPro] = useState<boolean>(false);
    const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const activeEncounter = encounters.find(e => e.id === selectedEncounterId) || null;

    useEffect(() => {
        const proStatus = localStorage.getItem('medDxProStatus');
        if (proStatus === 'true') setIsPro(true);

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === 'true') {
            setIsPro(true);
            localStorage.setItem('medDxProStatus', 'true');
            window.history.replaceState({}, document.title, "/");
        }
    }, []);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-mesh">
                <div className="relative">
                    <div className="animate-spin rounded-full h-14 w-14 border-2 border-primary-300/30 border-t-brand-500"></div>
                    <div className="absolute inset-0 rounded-full shadow-[0_0_40px_rgba(0,213,255,0.3)]"></div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-mesh p-4 md:p-6 relative overflow-hidden">
                {/* Ambient glow orbs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-float"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-500/8 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
                
                <div className="max-w-md w-full bg-primary-100/60 backdrop-blur-2xl rounded-2xl md:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-8 md:p-10 text-center animate-slide-up border border-primary-300/30 relative">
                    <div className="bg-gradient-to-br from-brand-500 to-brand-700 w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-[0_0_40px_rgba(0,213,255,0.4)]">
                        <StethoscopeIcon className="h-10 w-10 md:h-12 md:w-12 text-white" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-white mb-3 md:mb-4 tracking-tight font-display">MediDx</h1>
                    <p className="text-sm md:text-base text-primary-600 mb-8 md:mb-10 font-medium">Professional Clinical Decision Support System for Modern Healthcare.</p>
                    <button 
                        onClick={signIn}
                        className="w-full bg-brand-500 text-white font-bold py-3.5 md:py-4 rounded-xl shadow-[0_0_30px_rgba(0,213,255,0.3)] hover:shadow-[0_0_50px_rgba(0,213,255,0.5)] hover:bg-brand-400 transition-all active:scale-95 flex items-center justify-center gap-3 text-sm md:text-base mb-3"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 md:w-6 md:h-6" alt="Google" />
                        Sign in with Google
                    </button>
                    <button 
                        onClick={signInAsGuest}
                        className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 md:py-3.5 rounded-xl border border-white/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-xs md:text-sm"
                    >
                        <span>⚡</span>
                        Continue as Demo Clinician (Instant Access)
                    </button>
                    <p className="mt-6 md:mt-8 text-[10px] md:text-xs text-white/50 uppercase tracking-widest font-bold">Secure Medical Decision Support</p>
                </div>
            </div>
        );
    }

    const handleNewEncounter = async () => {
        try {
            const newEncounter: Partial<Encounter> = {
                patientData: { ...BLANK_PATIENT_DATA },
                provisionalDiagnoses: [],
                finalDiagnosis: null,
                treatments: [],
                progressNotes: [],
                vitalsHistory: [],
                aiRecommendations: [],
                medicalReports: [],
                tags: [],
                sharedWith: []
            };
            const id = await createEncounter(newEncounter);
            if (id) {
                setSelectedEncounterId(id);
                setActiveView('encounter');
                toast.success("New patient case created successfully.");
            } else {
                toast.error("Failed to create a new case. Please check your connection and permissions.");
            }
        } catch (error) {
            console.error("Error creating new encounter:", error);
            toast.error("An unexpected error occurred while creating the case.");
        }
    };

    const handleAddRandomCase = async (presetIndex?: number) => {
        try {
            const id = await addRandomCase(presetIndex);
            if (id) {
                setSelectedEncounterId(id);
                setActiveView('encounter');
                toast.success("Random clinical case loaded with complete history, triage & care pathway.");
            } else {
                toast.error("Failed to load random case.");
            }
        } catch (error) {
            console.error("Error creating random encounter:", error);
            toast.error("An unexpected error occurred while loading random case.");
        }
    };

    const handleUpdateEncounter = async (updatedEncounter: Encounter) => {
        setIsSaving(true);
        try {
            await updateEncounter(updatedEncounter.id, updatedEncounter);
        } catch (error) {
            toast.error("Failed to save changes. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEncounter = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this case?")) {
            try {
                await deleteEncounter(id);
                toast.success("Case deleted successfully.");
                if (selectedEncounterId === id) {
                    setActiveView('records');
                    setSelectedEncounterId(null);
                }
            } catch (error) {
                toast.error("Failed to delete the case.");
            }
        }
    };

    const handleOpenInsightsModal = async () => {
        setIsInsightsModalOpen(true);
        setIsGeneratingInsights(true);
        setInsightsError(null);
        try {
            const report = await generatePersonalizedInsights(encounters);
            setInsightsReport(report);
        } catch (error) {
            setInsightsError("Failed to generate insights. Please try again.");
        } finally {
            setIsGeneratingInsights(false);
        }
    };

    const navigateTo = (view: 'records' | 'encounter' | 'clinicians' | 'dashboard') => {
        setActiveView(view);
        if (view === 'records' || view === 'clinicians' || view === 'dashboard') setSelectedEncounterId(null);
    };

    const handleSwitchAccount = async () => {
        try {
            await logout();
            await signIn();
        } catch (error) {
            toast.error("Failed to switch account.");
        }
    };

    if (user && profile && !profile.isProfileComplete) {
        return <ProfileSetup />;
    }

    return (
        <div className="min-h-screen bg-mesh font-sans selection:bg-primary-100 selection:text-primary-900">
            <Toaster position="top-right" richColors />
            <Header
                onOpenInsights={handleOpenInsightsModal}
                onOpenProfile={() => setIsProfileModalOpen(true)}
                onNavigate={navigateTo}
                onNewEncounter={handleNewEncounter}
                onAddRandomCase={handleAddRandomCase}
                onOpenPricing={() => setIsPricingModalOpen(true)}
                onLogout={logout}
                onSwitchAccount={handleSwitchAccount}
                onOpenAudit={() => setIsAuditOpen(true)}
                isSaving={isSaving}
                isPro={isPro}
                role={profile?.role}
            />
            <main className="container mx-auto p-4 lg:p-8 animate-slide-up">
                {isAuditOpen && <SystemAudit encounters={encounters} onClose={() => setIsAuditOpen(false)} />}
                <ErrorBoundary>
                    {activeView === 'dashboard' ? (
                        <Dashboard 
                            encounters={encounters} 
                            onSelectEncounter={(id) => {
                                setSelectedEncounterId(id);
                                setActiveView('encounter');
                            }}
                            onAddRandomCase={handleAddRandomCase}
                        />
                    ) : activeView === 'records' ? (
                        <PatientRecordsView 
                            encounters={encounters} 
                            onSelectEncounter={(id) => {
                                setSelectedEncounterId(id);
                                setActiveView('encounter');
                            }}
                            onDeleteEncounter={handleDeleteEncounter}
                            onAddRandomCase={handleAddRandomCase}
                        />
                    ) : activeView === 'clinicians' ? (
                        <ClinicianManagement />
                    ) : (
                        activeEncounter && (
                            <EncounterView 
                                encounter={activeEncounter} 
                                onUpdateEncounter={handleUpdateEncounter}
                                onBack={() => navigateTo('records')}
                            />
                        )
                    )}
                </ErrorBoundary>
            </main>
            <DisclaimerFooter />
            {isInsightsModalOpen && <InsightsModal onClose={() => setIsInsightsModalOpen(false)} isLoading={isGeneratingInsights} report={insightsReport} error={insightsError} />}
            {isProfileModalOpen && profile && (
                <UserProfileModal 
                    onClose={() => setIsProfileModalOpen(false)} 
                    onSave={updateProfile} 
                    initialDetails={profile} 
                />
            )}
            {isPricingModalOpen && <PricingModal onClose={() => setIsPricingModalOpen(false)} />}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <AuthProvider>
                <CaseProvider>
                    <AppContent />
                </CaseProvider>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;

