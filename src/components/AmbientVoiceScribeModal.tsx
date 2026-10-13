import React, { useState, useEffect, useRef } from 'react';
import { Encounter } from '../types';
import { parseAmbientVoiceTranscript } from '../services/geminiService';
import { toast } from 'sonner';

interface AmbientVoiceScribeModalProps {
    encounter: Encounter;
    onUpdateEncounter: (encounter: Encounter) => void;
    onClose: () => void;
}

const SAMPLE_DICTATIONS = [
    "54-year-old male presenting with acute retrosternal chest pressure and dyspnea for 3 hours. Started while walking uphill. Radiating to left shoulder. Diaphoretic. Blood pressure is 150 over 90, pulse 94, oxygen saturation 96 percent. History of hypertension on Amlodipine. Allergic to Penicillin.",
    "68-year-old female with 4 days of productive cough, high fever, and right-sided pleuritic chest pain. Temperature is 38.8, respiratory rate 26 breaths per minute, heart rate 108, oxygen saturation 91 percent on room air. Crackles on right lower base. History of COPD.",
    "42-year-old male with sudden onset severe epigastric pain radiating through to the back, associated with persistent nausea and vomiting. Blood pressure 138 over 88, pulse 102. History of alcohol use."
];

export const AmbientVoiceScribeModal: React.FC<AmbientVoiceScribeModalProps> = ({
    encounter,
    onUpdateEncounter,
    onClose
}) => {
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [transcript, setTranscript] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                let current = '';
                for (let i = 0; i < event.results.length; i++) {
                    current += event.results[i][0].transcript + ' ';
                }
                setTranscript(current.trim());
            };

            recognition.onerror = (event: any) => {
                console.warn("Speech recognition notice:", event.error);
                setIsRecording(false);
            };

            recognition.onend = () => {
                setIsRecording(false);
            };

            recognitionRef.current = recognition;
        }
    }, []);

    const toggleRecording = () => {
        if (!recognitionRef.current) {
            toast.error("Speech Recognition is not supported by your current browser. You can type or paste dictation below.");
            return;
        }

        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
            toast.info("Dictation paused.");
        } else {
            try {
                recognitionRef.current.start();
                setIsRecording(true);
                toast.success("Microphone active — speaking to ambient scribe...");
            } catch (err) {
                console.warn(err);
            }
        }
    };

    const handleApplyDictation = async () => {
        if (!transcript.trim()) {
            toast.error("Please record or enter a clinical dictation first.");
            return;
        }

        setIsProcessing(true);
        try {
            const extracted = await parseAmbientVoiceTranscript(transcript);

            const updatedPatient = {
                ...encounter.patientData,
                primaryComplaint: extracted.primaryComplaint || encounter.patientData.primaryComplaint,
                hopi: extracted.hopi ? `${encounter.patientData.hopi ? encounter.patientData.hopi + '\n\n' : ''}${extracted.hopi}` : encounter.patientData.hopi,
                findings: extracted.findings ? `${encounter.patientData.findings ? encounter.patientData.findings + '\n\n' : ''}${extracted.findings}` : encounter.patientData.findings,
                age: extracted.age || encounter.patientData.age,
                sex: extracted.sex || encounter.patientData.sex,
                allergies: extracted.allergies || encounter.patientData.allergies,
                pmh: extracted.pmh || encounter.patientData.pmh,
                vitals: {
                    ...encounter.patientData.vitals,
                    ...(extracted.vitals || {})
                }
            };

            onUpdateEncounter({
                ...encounter,
                patientData: updatedPatient
            });

            toast.success("Ambient scribe successfully extracted clinical data into patient case!");
            onClose();
        } catch (e) {
            toast.error("Failed to parse dictation.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                                Ambient Clinical AI Scribe
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight mt-0.5">
                            Bedside Voice Dictation
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                    >
                        ✕
                    </button>
                </div>

                {/* Microphone Recording Center */}
                <div className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                    <button
                        type="button"
                        onClick={toggleRecording}
                        className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all shadow-2xl active:scale-95 ${
                            isRecording
                                ? 'bg-rose-500 text-white shadow-rose-500/50 animate-pulse ring-8 ring-rose-500/20'
                                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/30'
                        }`}
                    >
                        {isRecording ? '⏹' : '🎙️'}
                    </button>

                    <div className="text-center">
                        <div className="text-sm font-bold text-white">
                            {isRecording ? 'Listening and transcribing bedside encounter...' : 'Click microphone to begin dictating'}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            Speak naturally: mention patient complaint, onset, vitals, history, and examination findings.
                        </p>
                    </div>
                </div>

                {/* Transcript Live Box */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <span>Live Clinical Transcript</span>
                        {transcript && (
                            <button
                                onClick={() => setTranscript('')}
                                className="text-[10px] text-slate-500 hover:text-rose-400"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <textarea
                        rows={4}
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        placeholder="Transcribed dictation appears here... or type directly."
                        className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs sm:text-sm text-white placeholder-slate-500 leading-relaxed focus:outline-none focus:border-cyan-400"
                    />
                </div>

                {/* Fast Sample Dictations Chips */}
                <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        ⚡ Or try a simulated clinician dictation:
                    </span>
                    <div className="flex flex-col gap-1.5">
                        {SAMPLE_DICTATIONS.map((sample, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setTranscript(sample)}
                                className="text-left p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:bg-slate-800/60 text-xs text-slate-400 hover:text-slate-200 transition-colors line-clamp-1"
                            >
                                💬 "{sample.slice(0, 95)}..."
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleApplyDictation}
                        disabled={isProcessing || !transcript.trim()}
                        className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                    >
                        {isProcessing ? 'Extracting with AI...' : '✨ Populate Dossier'}
                    </button>
                </div>
            </div>
        </div>
    );
};
