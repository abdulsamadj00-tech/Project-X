
import React, { forwardRef } from 'react';
import { Diagnosis } from '../types';
import DiagnosisCard from './DiagnosisCard';
import { EmptyStateIcon, ErrorIcon, SparklesIcon } from './icons';

interface ResultsDisplayProps {
    diagnoses: Diagnosis[];
    isLoading: boolean;
    error: string | null;
}

const ResultsDisplay = forwardRef<HTMLDivElement, ResultsDisplayProps>(({ diagnoses, isLoading, error }, ref) => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 bg-primary-100 rounded-[3rem] border border-slate-100 shadow-sm h-full min-h-[400px] animate-pulse">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-brand-500/20 rounded-full blur-2xl animate-pulse"></div>
                    <svg className="animate-spin h-16 w-16 text-brand-600 relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight font-display">Analyzing Patient Data...</h3>
                <p className="text-slate-500 mt-4 max-w-md mx-auto leading-relaxed">Our advanced AI is processing the clinical information to generate high-precision differential diagnoses. This may take a moment.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 bg-rose-50/50 border border-rose-100 rounded-[3rem] shadow-sm h-full min-h-[400px]">
                <div className="p-6 bg-rose-100 text-rose-600 rounded-[2rem] mb-8 shadow-sm">
                    <ErrorIcon className="h-10 w-10"/>
                </div>
                <h3 className="text-2xl font-bold text-rose-900 tracking-tight font-display">Analysis Interrupted</h3>
                <p className="text-rose-600/80 mt-4 max-w-md mx-auto leading-relaxed font-medium">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-8 px-8 py-3 bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all active:scale-95"
                >
                    Retry Analysis
                </button>
            </div>
        );
    }

    if (diagnoses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 bg-primary-100 rounded-[3rem] border border-slate-100 shadow-sm h-full min-h-[400px] group">
                <div className="p-8 bg-slate-50 text-slate-300 rounded-[2.5rem] mb-8 border border-slate-100 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-brand-50 group-hover:text-brand-400 group-hover:border-brand-100">
                    <EmptyStateIcon className="h-20 w-20"/>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight font-display">Awaiting Patient Data</h3>
                <p className="text-slate-500 mt-4 max-w-md mx-auto leading-relaxed">Complete the patient intake form on the left to generate a comprehensive AI-powered diagnostic report.</p>
                <div className="mt-10 flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Ready for Analysis</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20" ref={ref}>
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter font-display">Differential Diagnosis Report</h2>
                    <p className="text-slate-500 mt-1 font-medium">AI-generated clinical insights and therapeutic strategies</p>
                </div>
                <div className="hidden sm:flex items-center gap-4 px-6 py-3 bg-brand-50 rounded-2xl border border-brand-100">
                    <div className="p-2 bg-brand-600 rounded-lg text-white">
                        <SparklesIcon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold text-brand-600 uppercase tracking-[0.2em]">AI Precision Mode</span>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
                {diagnoses.map((diagnosis, index) => (
                    <DiagnosisCard key={index} diagnosis={diagnosis} index={index} />
                ))}
            </div>
        </div>
    );
});

export default ResultsDisplay;

