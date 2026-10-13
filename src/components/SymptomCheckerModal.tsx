
import React, { useState } from 'react';
import { analyzeSymptoms } from '../services/geminiService';
import { XMarkIcon, SparklesIcon, ErrorIcon } from './icons';

interface SymptomCheckerModalProps {
    onClose: () => void;
    onPopulate: (symptomText: string, conditions: string[]) => void;
}

const SymptomCheckerModal: React.FC<SymptomCheckerModalProps> = ({ onClose, onPopulate }) => {
    const [symptomText, setSymptomText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [conditions, setConditions] = useState<string[]>([]);

    const handleAnalyze = async () => {
        if (!symptomText.trim()) return;
        setIsLoading(true);
        setError(null);
        setConditions([]);
        try {
            const result = await analyzeSymptoms(symptomText);
            setConditions(result);
        } catch (err) {
            setError('Failed to analyze symptoms. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePopulate = () => {
        onPopulate(symptomText, conditions);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-primary-100 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-semibold flex items-center"><SparklesIcon className="h-6 w-6 mr-2 text-primary-600"/>AI Symptom Checker</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <p className="text-sm text-slate-600 mb-4">
                        Describe the patient's symptoms in plain language. The AI will suggest potential conditions to help start your analysis.
                    </p>
                    <textarea
                        value={symptomText}
                        onChange={(e) => setSymptomText(e.target.value)}
                        placeholder="e.g., 'A 45-year-old male presents with sharp chest pain that radiates to his left arm, accompanied by shortness of breath and sweating.'"
                        className="w-full h-40 p-3 bg-slate-50 border rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                    
                    {isLoading && (
                        <div className="text-center p-4">
                            <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-slate-500 mt-2 text-sm">Analyzing...</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center text-center p-4 mt-4 bg-red-50 border border-red-200 rounded-md">
                            <ErrorIcon className="h-6 w-6 text-red-500 mr-3 flex-shrink-0"/>
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    {conditions.length > 0 && !isLoading && (
                        <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                            <h3 className="font-semibold text-slate-700 mb-2">Potential Conditions Identified:</h3>
                            <ul className="list-disc list-inside space-y-1">
                                {conditions.map((condition, index) => (
                                    <li key={index} className="text-slate-600">{condition}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center p-4 border-t bg-slate-50 rounded-b-lg">
                    <button
                        onClick={handleAnalyze}
                        disabled={!symptomText.trim() || isLoading}
                        className="flex items-center bg-primary-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm hover:bg-primary-700 disabled:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        {isLoading ? 'Analyzing...' : 'Analyze Symptoms'}
                    </button>
                    {conditions.length > 0 && (
                         <button
                            onClick={handlePopulate}
                            className="bg-green-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            Populate Form with this Info
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SymptomCheckerModal;
