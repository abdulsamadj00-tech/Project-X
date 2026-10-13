
import React from 'react';
import { XMarkIcon, ChartBarIcon, ErrorIcon } from './icons';

interface InsightsModalProps {
    onClose: () => void;
    isLoading: boolean;
    report: string | null;
    error: string | null;
}

const InsightsModal: React.FC<InsightsModalProps> = ({ onClose, isLoading, report, error }) => {
    
    // A simple markdown-to-HTML converter for basic formatting
    const renderMarkdown = (text: string) => {
        const html = text
            .replace(/### (.*)/g, '<h3 class="text-lg font-semibold text-slate-800 mt-4 mb-2">$1</h3>')
            .replace(/\* (.*)/g, '<li class="ml-5 list-disc">$1</li>')
            .replace(/\n/g, '<br />');
        
        return <div dangerouslySetInnerHTML={{ __html: html }} />;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-primary-100 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-semibold flex items-center"><ChartBarIcon className="h-6 w-6 mr-2 text-blue-600"/>My Practice Insights</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {isLoading && (
                        <div className="text-center p-8">
                            <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-slate-600 mt-3">Generating your personalized report...</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center text-center p-6 bg-red-50 border border-red-200 rounded-md">
                            <ErrorIcon className="h-10 w-10 text-red-500 mb-3"/>
                            <h3 className="font-semibold text-red-800 mb-1">Could Not Generate Report</h3>
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    {report && !isLoading && (
                        <div className="prose prose-slate max-w-none">
                           {renderMarkdown(report)}
                           <div className="mt-6 p-3 bg-slate-100 rounded-md text-xs text-slate-500">
                                <p><strong>Note:</strong> This report is generated based on anonymized data from your last 50 sessions stored locally on this device. Clearing your browser data will reset your history.</p>
                           </div>
                        </div>
                    )}
                </div>
                 <div className="flex justify-end p-4 border-t bg-slate-50 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="bg-slate-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InsightsModal;

