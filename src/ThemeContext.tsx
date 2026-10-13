
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeName = 'midnight' | 'ivory' | 'sunset';

interface ThemeConfig {
    name: ThemeName;
    label: string;
    description: string;
    preview: { bg: string; accent: string; text: string };
}

export const THEMES: ThemeConfig[] = [
    {
        name: 'midnight',
        label: 'Midnight Cyan',
        description: 'Dark mode with neon cyan accents',
        preview: { bg: '#0f1219', accent: '#00d5ff', text: '#e6ebf5' },
    },
    {
        name: 'ivory',
        label: 'Ivory Light',
        description: 'Clean bright theme with deep navy text',
        preview: { bg: '#f8f9fc', accent: '#2563eb', text: '#1e293b' },
    },
    {
        name: 'sunset',
        label: 'Sunset Warm',
        description: 'Warm dark tones with amber glow',
        preview: { bg: '#1a1410', accent: '#f59e0b', text: '#fef3c7' },
    },
];

interface ThemeContextType {
    theme: ThemeName;
    setTheme: (theme: ThemeName) => void;
    themeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'midnight',
    setTheme: () => {},
    themeConfig: THEMES[0],
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<ThemeName>(() => {
        const saved = localStorage.getItem('medidx-theme');
        return (saved as ThemeName) || 'midnight';
    });

    const setTheme = useCallback((t: ThemeName) => {
        setThemeState(t);
        localStorage.setItem('medidx-theme', t);
    }, []);

    useEffect(() => {
        // Apply the theme class to html element
        const html = document.documentElement;
        html.removeAttribute('data-theme');
        html.setAttribute('data-theme', theme);
    }, [theme]);

    const themeConfig = THEMES.find(t => t.name === theme) || THEMES[0];

    return (
        <ThemeContext.Provider value={{ theme, setTheme, themeConfig }}>
            {children}
        </ThemeContext.Provider>
    );
};

