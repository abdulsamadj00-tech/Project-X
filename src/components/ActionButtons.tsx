
import React from 'react';
import { DocumentTextIcon } from './icons';

interface ActionButtonsProps {
    onGenerateReport: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onGenerateReport }) => {
    return (
        <div className="flex flex-wrap gap-2 mb-4">
            <button 
                onClick={onGenerateReport}
                className="flex items-center bg-primary-600 text-white font-semibold py-2 px-4 rounded-md shadow hover:bg-primary-700 transition-colors"
            >
                <DocumentTextIcon className="h-5 w-5 mr-2"/>
                Generate & Download Report
            </button>
        </div>
    );
};

export default ActionButtons;
