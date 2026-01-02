'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/components/ThemeProvider';

interface Settings {
    walletAddress: string;
    apiKey: string;
    defaultBudget: string;
    notifications: {
        questComplete: boolean;
        agentUpdates: boolean;
        weeklyDigest: boolean;
    };
    display: {
        theme: 'light' | 'dark' | 'system';
        compactView: boolean;
    };
}

export default function SettingsPage() {
    const { theme, toggleTheme } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'wallet' | 'api' | 'preferences' | 'display'>('wallet');
    const [saved, setSaved] = useState(false);
    const [settings, setSettings] = useState<Settings>({
        walletAddress: '',
        apiKey: '',
        defaultBudget: '10.00',
        notifications: {
            questComplete: true,
            agentUpdates: false,
            weeklyDigest: true,
        },
        display: {
            theme: 'light',
            compactView: false,
        },
    });

    useEffect(() => {
        // Load settings from localStorage
        const saved = localStorage.getItem('aetherswarm-settings');
        if (saved) {
            setSettings(JSON.parse(saved));
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('aetherswarm-settings', JSON.stringify(settings));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const tabs = [
        { id: 'wallet', label: 'Wallet', icon: '◈' },
        { id: 'api', label: 'API Keys', icon: '⚿' },
        { id: 'preferences', label: 'Quests', icon: '◎' },
        { id: 'display', label: 'Display', icon: '◐' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--alabaster)' }}>
            {/* Header */}
            <header style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--soft-grey)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--header-bg)',
                backdropFilter: 'blur(10px)',
            }}>
                <a href="/" style={{ textDecoration: 'none', color: 'var(--graphite)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    <img
                        src="/AstherS Logo1.svg"
                        alt="AetherSwarm"
                        className="logo-light"
                        style={{ height: 'clamp(28px, 5vw, 40px)', width: 'auto' }}
                    />
                    <img
                        src="/AstherS Logo2.svg"
                        alt="AetherSwarm"
                        className="logo-dark"
                        style={{ height: 'clamp(28px, 5vw, 40px)', width: 'auto' }}
                    />
                </a>
                <nav className="desktop-nav" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <a href="/" className="label" style={{ textDecoration: 'none' }}>Home</a>
                    <a href="/agents" className="label" style={{ textDecoration: 'none' }}>Agents</a>
                    <a href="/quests" className="label" style={{ textDecoration: 'none' }}>Quests</a>
                    <a href="/settings" className="label" style={{ textDecoration: 'none', color: 'var(--graphite)' }}>Settings</a>
                </nav>
                <nav className="mobile-nav" style={{ display: 'none', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        style={{
                            background: 'var(--graphite)',
                            color: 'var(--warm-white)',
                            padding: '8px 12px',
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        Menu
                    </button>
                </nav>
            </header>

            {/* Mobile Menu Drawer */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{
                                position: 'fixed', top: 0, right: 0, bottom: 0, width: '280px',
                                background: 'var(--alabaster)', zIndex: 201, padding: '24px',
                                display: 'flex', flexDirection: 'column',
                            }}
                        >
                            <button onClick={() => setMobileMenuOpen(false)} style={{
                                alignSelf: 'flex-end', background: 'none', border: 'none',
                                fontSize: '24px', cursor: 'pointer', color: 'var(--graphite)', marginBottom: '32px',
                            }}>✕</button>
                            <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {[{ href: '/', label: 'Home' }, { href: '/agents', label: 'Agents' }, { href: '/quests', label: 'Quests' }, { href: '/settings', label: 'Settings' }].map(link => (
                                    <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} style={{
                                        fontFamily: 'var(--font-serif)', fontSize: '1.5rem', textDecoration: 'none',
                                        color: 'var(--graphite)', padding: '12px 0', borderBottom: '1px solid var(--soft-grey)',
                                    }}>{link.label}</a>
                                ))}
                            </nav>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <main style={{ padding: 'var(--space-lg)' }}>
                <div className="container" style={{ maxWidth: '900px' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ marginBottom: '32px' }}
                    >
                        <span className="label">Configuration</span>
                        <h2 style={{ marginTop: '8px' }}>
                            Platform <span style={{ fontStyle: 'italic' }}>Settings</span>
                        </h2>
                    </motion.div>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '32px',
                        borderBottom: '1px solid var(--soft-grey)',
                        paddingBottom: '16px',
                    }}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                style={{
                                    padding: '10px 20px',
                                    background: activeTab === tab.id ? 'var(--graphite)' : 'transparent',
                                    color: activeTab === tab.id ? 'var(--warm-white)' : 'var(--mid-grey)',
                                    border: activeTab === tab.id ? 'none' : '1px solid var(--soft-grey)',
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            background: 'var(--warm-white)',
                            border: '1px solid var(--soft-grey)',
                            padding: '32px',
                        }}
                    >
                        {activeTab === 'wallet' && (
                            <div>
                                <h3 style={{ marginBottom: '24px', fontFamily: 'var(--font-serif)' }}>Wallet Configuration</h3>
                                <div style={{ marginBottom: '24px' }}>
                                    <label className="label" style={{ display: 'block', marginBottom: '8px' }}>
                                        Wallet Address
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.walletAddress}
                                        onChange={(e) => setSettings({ ...settings, walletAddress: e.target.value })}
                                        placeholder="0x..."
                                        className="input"
                                        style={{ width: '100%' }}
                                    />
                                    <p style={{ fontSize: '12px', color: 'var(--mid-grey)', marginTop: '8px' }}>
                                        Your EVM-compatible wallet address for receiving quest rewards and payments.
                                    </p>
                                </div>
                                <div style={{
                                    padding: '16px',
                                    background: 'var(--limestone)',
                                    border: '1px solid var(--soft-grey)',
                                }}>
                                    <div className="label" style={{ marginBottom: '8px' }}>Network Status</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--olive-drab)' }} />
                                        <span style={{ fontFamily: 'var(--font-serif)' }}>Connected to Polygon Amoy</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'api' && (
                            <div>
                                <h3 style={{ marginBottom: '24px', fontFamily: 'var(--font-serif)' }}>API Configuration</h3>
                                <div style={{ marginBottom: '24px' }}>
                                    <label className="label" style={{ display: 'block', marginBottom: '8px' }}>
                                        API Key
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="password"
                                            value={settings.apiKey}
                                            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                                            placeholder="ask_..."
                                            className="input"
                                            style={{ flex: 1 }}
                                        />
                                        <button className="btn btn-outline" style={{ padding: '12px 16px' }}>
                                            Generate
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--mid-grey)', marginTop: '8px' }}>
                                        Use this key to interact with the AetherSwarm API programmatically.
                                    </p>
                                </div>
                                <div style={{
                                    padding: '16px',
                                    background: 'var(--limestone)',
                                    fontFamily: 'monospace',
                                    fontSize: '12px',
                                }}>
                                    <div className="label" style={{ marginBottom: '8px' }}>API Endpoint</div>
                                    <code>https://api.aetherswarm.io/v1</code>
                                </div>
                            </div>
                        )}

                        {activeTab === 'preferences' && (
                            <div>
                                <h3 style={{ marginBottom: '24px', fontFamily: 'var(--font-serif)' }}>Quest Defaults</h3>
                                <div style={{ marginBottom: '24px' }}>
                                    <label className="label" style={{ display: 'block', marginBottom: '8px' }}>
                                        Default Budget (USDC)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={settings.defaultBudget}
                                        onChange={(e) => setSettings({ ...settings, defaultBudget: e.target.value })}
                                        className="input"
                                        style={{ width: '200px' }}
                                    />
                                </div>
                                <div>
                                    <div className="label" style={{ marginBottom: '16px' }}>Notifications</div>
                                    {[
                                        { key: 'questComplete', label: 'Quest Completion', desc: 'Get notified when your quests finish' },
                                        { key: 'agentUpdates', label: 'Agent Activity', desc: 'Real-time updates on agent discoveries' },
                                        { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of platform activity' },
                                    ].map((item) => (
                                        <div key={item.key} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '16px 0',
                                            borderBottom: '1px solid var(--soft-grey)',
                                        }}>
                                            <div>
                                                <div style={{ fontFamily: 'var(--font-serif)' }}>{item.label}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--mid-grey)' }}>{item.desc}</div>
                                            </div>
                                            <button
                                                onClick={() => setSettings({
                                                    ...settings,
                                                    notifications: {
                                                        ...settings.notifications,
                                                        [item.key]: !settings.notifications[item.key as keyof typeof settings.notifications],
                                                    },
                                                })}
                                                style={{
                                                    width: '48px',
                                                    height: '28px',
                                                    borderRadius: '14px',
                                                    background: settings.notifications[item.key as keyof typeof settings.notifications] ? 'var(--olive-drab)' : 'var(--soft-grey)',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    transition: 'background 0.3s',
                                                }}
                                            >
                                                <span style={{
                                                    position: 'absolute',
                                                    top: '4px',
                                                    left: settings.notifications[item.key as keyof typeof settings.notifications] ? '24px' : '4px',
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    background: 'var(--warm-white)',
                                                    transition: 'left 0.3s',
                                                }} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'display' && (
                            <div>
                                <h3 style={{ marginBottom: '24px', fontFamily: 'var(--font-serif)' }}>Display Settings</h3>
                                <div style={{ marginBottom: '24px' }}>
                                    <div className="label" style={{ marginBottom: '16px' }}>Theme</div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        {['light', 'dark'].map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => {
                                                    if (t !== theme) toggleTheme();
                                                }}
                                                style={{
                                                    padding: '16px 32px',
                                                    background: theme === t ? 'var(--graphite)' : 'transparent',
                                                    color: theme === t ? 'var(--warm-white)' : 'var(--graphite)',
                                                    border: '1px solid var(--soft-grey)',
                                                    cursor: 'pointer',
                                                    fontFamily: 'var(--font-serif)',
                                                    fontSize: '1rem',
                                                    textTransform: 'capitalize',
                                                }}
                                            >
                                                {t === 'light' ? '◐' : '◑'} {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Save Button */}
                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '16px', alignItems: 'center' }}>
                        {saved && (
                            <motion.span
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                style={{ color: 'var(--olive-drab)', fontSize: '12px' }}
                            >
                                ✓ Settings saved
                            </motion.span>
                        )}
                        <button onClick={handleSave} className="btn btn-primary" style={{ padding: '16px 40px' }}>
                            Save Changes
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
