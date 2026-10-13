import React, { useState, useEffect, useRef } from 'react';
import { Encounter, ConsultationMessage } from '../types';
import { consultNextRecommendationsAI } from '../services/geminiService';
import { toast } from 'sonner';

interface NextRecommendationsAIConsultationProps {
    encounter: Encounter;
    onUpdateEncounter: (encounter: Encounter) => void;
    onNext?: () => void;
}

const QUICK_INQUIRIES = [
    "Differentiate Acute Coronary Syndrome (ICD-11 BA80) vs DSM-5 Panic Attack (300.01)",
    "Formulate Next 24-Hour Clinical Monitoring & Biomarker Kinetics Protocol",
    "Screen for Sepsis-Associated Encephalopathy / Acute Delirium (DSM-5 Criteria)",
    "Review Nephrotoxicity & Contrast-Induced AKI Prevention per KDIGO 2023",
    "Define Guideline-Directed Transfer and Secondary Prevention Discharge Pathway"
];

const NextRecommendationsAIConsultation: React.FC<NextRecommendationsAIConsultationProps> = ({
    encounter,
    onUpdateEncounter,
    onNext
}) => {
    const [messages, setMessages] = useState<ConsultationMessage[]>(encounter.consultationMessages || []);
    const [queryInput, setQueryInput] = useState<string>('');
    const [isConsulting, setIsConsulting] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!encounter.consultationMessages || encounter.consultationMessages.length === 0) {
            handleInitialConsultation();
        }
    }, [encounter.patientData, encounter.provisionalDiagnoses]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleInitialConsultation = async () => {
        setIsConsulting(true);
        try {
            const initialQuery = `Initial Multidisciplinary Case Conference: Review working differentials, ICD-11 coding, DSM-5 psychiatric/somatic screening, and authentic guideline recommendations for this patient presentation.`;
            const reply = await consultNextRecommendationsAI(encounter, initialQuery, []);
            const updated = [reply];
            setMessages(updated);
            onUpdateEncounter({ ...encounter, consultationMessages: updated });
        } catch (e) {
            console.warn("Initial consultation error:", e);
        } finally {
            setIsConsulting(false);
        }
    };

    const handleSendMessage = async (textToSend?: string) => {
        const query = (textToSend || queryInput).trim();
        if (!query || isConsulting) return;

        const userMsg: ConsultationMessage = {
            id: `msg-${Date.now()}-user`,
            sender: 'Clinician',
            text: query,
            timestamp: Date.now()
        };

        const currentHistory = [...messages, userMsg];
        setMessages(currentHistory);
        setQueryInput('');
        setIsConsulting(true);

        try {
            const aiResponse = await consultNextRecommendationsAI(encounter, query, currentHistory);
            const fullHistory = [...currentHistory, aiResponse];
            setMessages(fullHistory);
            onUpdateEncounter({ ...encounter, consultationMessages: fullHistory });
        } catch (e) {
            toast.error("Failed to generate AI consultation response.");
        } finally {
            setIsConsulting(false);
        }
    };

    // Extract latest structured recommendations from latest AI message
    const latestAiMessage = [...messages].reverse().find(m => m.sender === 'MediDx AI Panel');

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-cyan-400 font-mono text-[11px] uppercase tracking-widest font-black">
                                Multidisciplinary AI Case Conference
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 text-xs">WHO ICD-11 & DSM-5 Multi-Guideline Engine</span>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-white font-display tracking-tight">
                            Next Recommendations & Clinical Consultation
                        </h2>
                        <p className="text-xs md:text-sm text-slate-400 mt-1">
                            Interactive evidence-based clinical reasoning combining official ICD-11 diagnostic classifications, DSM-5 neuropsychiatric screening, and authentic medical guidelines.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                            ICD-11 + DSM-5 Aligned
                        </span>
                    </div>
                </div>
            </div>

            {/* Structured Next Action Dashboard (24h, 48h, Specialty, DSM-5) */}
            {latestAiMessage?.recommendedActions && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Immediate Next 24 Hours */}
                    <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/40 shadow-xl space-y-3">
                        <div className="flex items-center gap-2 text-cyan-400 font-black text-xs uppercase tracking-wider">
                            <span>⏱️</span>
                            <span>Immediate 24-Hour Protocol</span>
                        </div>
                        <ul className="space-y-2 text-xs text-slate-300">
                            {latestAiMessage.recommendedActions.immediate24h.map((act, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-cyan-400 font-bold shrink-0">▶</span>
                                    <span>{act}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 2. 48–72 Hour Re-evaluation Milestones */}
                    <div className="p-5 rounded-2xl bg-slate-900/80 border border-indigo-500/40 shadow-xl space-y-3">
                        <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-wider">
                            <span>📅</span>
                            <span>48–72h Re-Evaluation</span>
                        </div>
                        <ul className="space-y-2 text-xs text-slate-300">
                            {latestAiMessage.recommendedActions.milestones48h.map((mile, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-indigo-400 font-bold shrink-0">◆</span>
                                    <span>{mile}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 3. Specialty Consultations */}
                    <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/40 shadow-xl space-y-3">
                        <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                            <span>🩺</span>
                            <span>Specialty Consultations</span>
                        </div>
                        <ul className="space-y-2 text-xs text-slate-300">
                            {latestAiMessage.recommendedActions.specialtyConsults.map((spec, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="text-amber-400 font-bold shrink-0">✓</span>
                                    <span>{spec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 4. DSM-5 Neuropsychiatric Notes */}
                    <div className="p-5 rounded-2xl bg-slate-900/80 border border-purple-500/40 shadow-xl space-y-3">
                        <div className="flex items-center gap-2 text-purple-400 font-black text-xs uppercase tracking-wider">
                            <span>🧠</span>
                            <span>DSM-5 Psychiatric Screening</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed italic">
                            {latestAiMessage.recommendedActions.dsm5PsychiatricNotes || "Screen for autonomic hyperarousal, acute panic attacks (300.01), or acute delirium in high-stress clinical presentations."}
                        </p>
                    </div>
                </div>
            )}

            {/* Cited Guidelines & ICD-11 / DSM-5 Reference Pill Matrix */}
            {latestAiMessage && (
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Active Guideline & Diagnostic Citations:
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(latestAiMessage.icd11References || []).map((ref, idx) => (
                            <span key={idx} className="bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 text-[11px] font-mono px-3 py-1 rounded-xl">
                                {ref}
                            </span>
                        ))}
                        {(latestAiMessage.dsm5References || []).map((ref, idx) => (
                            <span key={idx} className="bg-purple-950/80 text-purple-300 border border-purple-800/60 text-[11px] font-mono px-3 py-1 rounded-xl">
                                {ref}
                            </span>
                        ))}
                        {(latestAiMessage.guidelineCitations || []).map((ref, idx) => (
                            <span key={idx} className="bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold px-3 py-1 rounded-xl">
                                📜 {ref}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Clinical Inquiry Chips */}
            <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    💡 Quick Case Conference Questions:
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {QUICK_INQUIRIES.map((q, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSendMessage(q)}
                            disabled={isConsulting}
                            className="whitespace-nowrap bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
                        >
                            💬 {q}
                        </button>
                    ))}
                </div>
            </div>

            {/* Interactive Discussion Chat Feed */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                    {messages.map((msg) => {
                        const isAi = msg.sender === 'MediDx AI Panel';
                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                                        isAi ? 'text-cyan-400' : 'text-slate-400'
                                    }`}>
                                        {isAi ? '🤖 MediDx Academic AI Panel' : '👨‍⚕️ Clinician'}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div
                                    className={`max-w-3xl rounded-2xl p-4 md:p-5 text-xs md:text-sm leading-relaxed border ${
                                        isAi
                                            ? 'bg-slate-950/80 border-slate-800 text-slate-200'
                                            : 'bg-cyan-600 text-white border-cyan-500 font-medium'
                                    }`}
                                >
                                    <div className="whitespace-pre-line">
                                        {msg.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {isConsulting && (
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-cyan-400 text-xs">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent"></div>
                            <span>Synthesizing ICD-11, DSM-5 criteria and academic clinical guidelines...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Question Input Form */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                    }}
                    className="flex items-center gap-3 pt-4 border-t border-slate-800"
                >
                    <input
                        type="text"
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
                        placeholder="Ask the AI panel about differential reasoning, ICD-11 coding, DSM-5 comorbidity, or guidelines..."
                        disabled={isConsulting}
                        className="flex-1 bg-slate-800/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs md:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                        type="submit"
                        disabled={isConsulting || !queryInput.trim()}
                        className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all active:scale-95 shrink-0 shadow-lg shadow-cyan-500/20"
                    >
                        Send Inquiry
                    </button>
                </form>
            </div>

            {onNext && (
                <div className="flex justify-end pt-4">
                    <button
                        onClick={onNext}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-8 py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center gap-2"
                    >
                        Proceed to Daily Progress & Monitoring ➔
                    </button>
                </div>
            )}
        </div>
    );
};

export default NextRecommendationsAIConsultation;
