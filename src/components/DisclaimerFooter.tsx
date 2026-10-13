
import React from 'react';
import { ShieldExclamationIcon } from './icons';

const DisclaimerFooter: React.FC = () => {
    return (
        <footer className="bg-primary-100/60 backdrop-blur-xl border-t border-primary-300/30 mt-12">
            <div className="container mx-auto px-4 lg:px-8 py-6 text-center text-primary-600">
                <div className="flex items-center justify-center mb-2">
                    <ShieldExclamationIcon className="h-6 w-6 mr-2 text-amber-500" />
                    <h3 className="font-semibold text-primary-800">Important Disclaimer</h3>
                </div>
                <p className="text-sm text-white0 max-w-3xl mx-auto leading-relaxed">
                    This tool is for educational and clinical support use only. It is not a substitute for professional medical judgment. 
                    Always consult a qualified physician for diagnosis and treatment. All data is anonymized and private.
                </p>
            </div>
        </footer>
    );
};

export default DisclaimerFooter;

