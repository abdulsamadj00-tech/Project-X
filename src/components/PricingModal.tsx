import React, { useState } from 'react';
import { CheckCircleIcon, SparklesIcon, XCircleIcon } from './icons';

interface PricingModalProps {
    onClose: () => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ onClose }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleSubscribe = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert(data.error || "Failed to create checkout session.");
            }
        } catch (error) {
            console.error("Subscription error:", error);
            alert("An error occurred. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-primary-100 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="bg-primary-900 p-8 text-center relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-primary-400 hover:text-white transition-colors">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                    <div className="bg-accent-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <SparklesIcon className="h-10 w-10 text-accent-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Upgrade to MediDx Pro</h2>
                    <p className="text-primary-300 text-sm">Empower your clinical practice with advanced AI tools.</p>
                </div>
                
                <div className="p-8">
                    <div className="mb-8">
                        <div className="flex items-baseline justify-center mb-6">
                            <span className="text-4xl font-black text-slate-900">$29</span>
                            <span className="text-slate-500 ml-2">/ month</span>
                        </div>
                        
                        <ul className="space-y-4">
                            {[
                                "Unlimited AI Diagnoses",
                                "Advanced Differential Analysis",
                                "Unlimited PDF Report Generation",
                                "Priority AI Processing",
                                "Personalized Practice Insights",
                                "Offline Fallback Support"
                            ].map((feature, i) => (
                                <li key={i} className="flex items-center text-slate-700 text-sm font-medium">
                                    <CheckCircleIcon className="h-5 w-5 text-accent-600 mr-3 flex-shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    <button 
                        onClick={handleSubscribe}
                        disabled={isLoading}
                        className="w-full bg-accent-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-accent-700 transition-all active:scale-95 disabled:bg-slate-300 flex items-center justify-center"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : "Subscribe Now"}
                    </button>
                    
                    <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">Secure payment via Stripe</p>
                </div>
            </div>
        </div>
    );
};

export default PricingModal;

