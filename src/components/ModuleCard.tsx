
import React, { useState } from 'react';
import { ChevronDownIcon } from './icons';

interface ModuleCardProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    initialOpen?: boolean;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ title, icon, children, initialOpen = false }) => {
    const [isOpen, setIsOpen] = useState(initialOpen);

    return (
        <div className={`bg-primary-100/60 backdrop-blur-xl rounded-[2.5rem] border border-primary-300/30 shadow-[0_8px_30px_rgb(0,0,0,0.3)] overflow-hidden transition-all duration-500 mb-8 ${isOpen ? 'shadow-[0_12px_40px_rgba(0,213,255,0.1)] ring-1 ring-brand-500/10' : 'hover:shadow-[0_12px_35px_rgb(0,0,0,0.35)] hover:border-primary-300/40'}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-8 text-left focus:outline-none transition-all duration-500 ${isOpen ? 'bg-primary-200/20' : 'hover:bg-primary-200/10'}`}
                aria-expanded={isOpen}
            >
                <div className="flex items-center">
                    <div className={`p-4 rounded-2xl mr-6 transition-all duration-700 ${isOpen ? 'bg-brand-500 text-white shadow-[0_0_25px_rgba(0,213,255,0.3)] scale-110 rotate-3' : 'bg-primary-200/50 text-primary-400 group-hover:scale-105'}`}>
                        {React.cloneElement(icon as React.ReactElement<any>, { className: "h-6 w-6" })}
                    </div>
                    <div>
                        <h3 className={`text-xl font-bold tracking-tight font-display transition-colors duration-500 ${isOpen ? 'text-white' : 'text-primary-700'}`}>{title}</h3>
                        {isOpen && <div className="h-1 w-8 bg-brand-500 rounded-full mt-2 shadow-[0_0_8px_rgba(0,213,255,0.5)]"></div>}
                    </div>
                </div>
                <div className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all duration-500 ${isOpen ? 'bg-brand-500/10 border-brand-500/20 rotate-180' : 'bg-primary-200/50 border-primary-300/30'}`}>
                    <ChevronDownIcon className={`h-5 w-5 transition-colors duration-500 ${isOpen ? 'text-brand-400' : 'text-primary-400'}`} />
                </div>
            </button>
            <div className={`transition-all duration-700 ease-in-out ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="px-10 pb-10 pt-4 border-t border-primary-300/20">
                    <div className="mt-4 animate-fade-in">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModuleCard;
