'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    effectiveTheme: 'light' | 'dark';
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>('system');
    const [mounted, setMounted] = useState(false);
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

    // Handle system preference changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            setSystemTheme(e.matches ? 'dark' : 'light');
        };

        // Set initial system theme
        setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // Initialize state from local storage
    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem('aetherswarm-theme') as Theme | null;
        if (stored) {
            setTheme(stored);
        }
    }, []);

    const effectiveTheme = theme === 'system' ? systemTheme : theme;

    useEffect(() => {
        if (mounted) {
            document.documentElement.setAttribute('data-theme', effectiveTheme);
            localStorage.setItem('aetherswarm-theme', theme);
        }
    }, [theme, effectiveTheme, mounted]);

    const toggleTheme = () => {
        setTheme((prev) => {
            if (prev === 'light') return 'dark';
            if (prev === 'dark') return 'system';
            return 'light';
        });
    };

    if (!mounted) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{ theme, effectiveTheme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
