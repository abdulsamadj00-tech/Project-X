
import React, { useState, useRef, useEffect } from 'react';
import { useTheme, THEMES, ThemeName } from '../ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const ThemeSwitcher: React.FC = () => {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-10 h-10 rounded-xl bg-primary-200/50 flex items-center justify-center hover:bg-primary-300/50 transition-all border border-primary-300/40 shadow-sm group"
                title="Switch Theme"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute right-0 top-14 w-72 bg-primary-100/95 backdrop-blur-2xl rounded-2xl border border-primary-300/40 shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-3 z-[100]"
                    >
                        <p className="text-[9px] font-black text-white0 uppercase tracking-[0.3em] px-3 pt-2 pb-3">
                            Select Theme
                        </p>
                        <div className="space-y-1.5">
                            {THEMES.map((t) => (
                                <button
                                    key={t.name}
                                    onClick={() => { setTheme(t.name); setIsOpen(false); }}
                                    className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-300 group ${
                                        theme === t.name
                                            ? 'bg-brand-500/15 border border-brand-500/30 shadow-[0_0_15px_rgba(0,213,255,0.1)]'
                                            : 'hover:bg-primary-200/60 border border-transparent'
                                    }`}
                                >
                                    {/* Color preview dots */}
                                    <div className="flex-shrink-0 flex items-center gap-1">
                                        <div
                                            className="w-5 h-5 rounded-lg border border-primary-300/30 shadow-inner"
                                            style={{ backgroundColor: t.preview.bg }}
                                        />
                                        <div
                                            className="w-5 h-5 rounded-lg border border-primary-300/30 shadow-inner"
                                            style={{ backgroundColor: t.preview.accent }}
                                        />
                                        <div
                                            className="w-5 h-5 rounded-lg border border-primary-300/30 shadow-inner"
                                            style={{ backgroundColor: t.preview.text }}
                                        />
                                    </div>

                                    <div className="text-left flex-1 min-w-0">
                                        <p className={`text-xs font-bold tracking-tight ${
                                            theme === t.name ? 'text-brand-400' : 'text-primary-800'
                                        }`}>
                                            {t.label}
                                        </p>
                                        <p className="text-[10px] text-white0 truncate">
                                            {t.description}
                                        </p>
                                    </div>

                                    {theme === t.name && (
                                        <div className="flex-shrink-0">
                                            <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ThemeSwitcher;

