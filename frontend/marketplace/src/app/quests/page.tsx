'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Quest {
    questId: string;
    status: string;
    objectives: string;
    budget: string;
    walletAddress?: string;
    createdAt?: string;
}

export default function QuestsPage() {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        // Simulated quests for demo
        setQuests([
            { questId: 'quest-1766757269355-5e36ce37', status: 'queued', objectives: 'Research latest developments in AI agents', budget: '10.00', walletAddress: '0x117a7a9E81ca218B74BFaa15B31f4fD13dCD8a00', createdAt: new Date().toISOString() },
            { questId: 'quest-1766756275486-8c395680', status: 'completed', objectives: 'Analyze DeFi protocols for security vulnerabilities', budget: '25.00', walletAddress: '0x04944fA721cC9F77Bbf766EE431a404D4d187afd', createdAt: new Date(Date.now() - 86400000).toISOString() },
        ]);
        setIsLoading(false);
    }, []);

    const filteredQuests = quests.filter(q => {
        if (filter === 'all') return true;
        if (filter === 'active') return q.status === 'queued' || q.status === 'processing';
        return q.status === 'completed';
    });

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
                <a href="/" style={{ textDecoration: 'none', color: 'var(--graphite)', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1rem, 4vw, 1.5rem)' }}>
                        AETHER<span style={{ fontStyle: 'italic' }}>SWARM</span>
                    </span>
                </a>
                <nav className="desktop-nav" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <a href="/" className="label" style={{ textDecoration: 'none' }}>Home</a>
                    <a href="/agents" className="label" style={{ textDecoration: 'none' }}>Agents</a>
                    <a href="/quests" className="label" style={{ textDecoration: 'none', color: 'var(--graphite)' }}>Quests</a>
                    <a href="/settings" className="label" style={{ textDecoration: 'none' }}>Settings</a>
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
                                {[{ href: '/', label: 'Home' }, { href: '/agents', label: 'Agents' }, { href: '/quests', label: 'Quests' }].map(link => (
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
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ marginBottom: '24px' }}
                    >
                        <span className="label">Research Missions</span>
                        <h2 style={{ marginTop: '8px' }}>
                            Quest <span style={{ fontStyle: 'italic' }}>History</span>
                        </h2>
                    </motion.div>

                    {/* Filters */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '24px',
                        borderBottom: '1px solid var(--soft-grey)',
                        paddingBottom: '16px',
                    }}>
                        {(['all', 'active', 'completed'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                style={{
                                    padding: '8px 16px',
                                    background: filter === f ? 'var(--graphite)' : 'transparent',
                                    color: filter === f ? 'var(--warm-white)' : 'var(--mid-grey)',
                                    border: filter === f ? 'none' : '1px solid var(--soft-grey)',
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Quest Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: 'var(--space-md)',
                    }}>
                        <AnimatePresence mode="popLayout">
                            {filteredQuests.map((quest, i) => (
                                <motion.div
                                    key={quest.questId}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: i * 0.05 }}
                                    whileHover={{ y: -4 }}
                                    style={{
                                        padding: 'var(--space-md)',
                                        background: 'var(--warm-white)',
                                        border: '1px solid var(--soft-grey)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: '16px',
                                    }}>
                                        <span style={{
                                            fontSize: '10px',
                                            fontFamily: 'monospace',
                                            color: 'var(--mid-grey)',
                                        }}>
                                            {quest.questId.slice(0, 24)}...
                                        </span>
                                        <span style={{
                                            padding: '4px 12px',
                                            background: quest.status === 'completed' ? 'var(--olive-drab)' : 'var(--burnt-clay)',
                                            color: 'var(--warm-white)',
                                            fontSize: '9px',
                                            fontWeight: 500,
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase',
                                        }}>
                                            {quest.status}
                                        </span>
                                    </div>

                                    <h4 style={{
                                        fontFamily: 'var(--font-serif)',
                                        fontSize: '1.25rem',
                                        lineHeight: 1.3,
                                        marginBottom: '16px',
                                    }}>
                                        {quest.objectives?.slice(0, 80)}...
                                    </h4>

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingTop: '16px',
                                        borderTop: '1px solid var(--soft-grey)',
                                    }}>
                                        <div>
                                            <div className="label">Budget</div>
                                            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem' }}>
                                                ${quest.budget}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div className="label">Wallet</div>
                                            <div style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                                                {quest.walletAddress?.slice(0, 8)}...
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {filteredQuests.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                                textAlign: 'center',
                                padding: 'var(--space-2xl)',
                                color: 'var(--mid-grey)',
                            }}
                        >
                            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontStyle: 'italic' }}>
                                No quests found
                            </p>
                            <a href="/" className="btn btn-outline" style={{ marginTop: 'var(--space-md)', display: 'inline-block' }}>
                                Deploy Your First Quest
                            </a>
                        </motion.div>
                    )}
                </div>
            </main>
        </div>
    );
}
