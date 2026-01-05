'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface QuestWorkflowGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

export function QuestWorkflowGuide({ isOpen, onClose }: QuestWorkflowGuideProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 999,
                            backdropFilter: 'blur(4px)'
                        }}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
                        animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                        exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            background: 'var(--alabaster)',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '700px',
                            width: '90%',
                            maxHeight: '85vh',
                            overflow: 'auto',
                            zIndex: 1000,
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--soft-grey)'
                        }}
                    >
                        {/* Header */}
                        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
                                The Quest Lifecycle
                            </h2>
                            <p style={{ margin: '8px 0 0 0', fontSize: '16px', opacity: 0.7 }}>
                                How AetherSwarm turns questions into verified knowledge.
                            </p>
                        </div>

                        {/* Workflow Steps Horizontal */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', position: 'relative' }}>
                            {/* Connecting Line */}
                            <div style={{ position: 'absolute', top: '24px', left: '40px', right: '40px', height: '2px', background: '#e0e0e0', zIndex: 0 }}></div>

                            {/* Step 1: Scout */}
                            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '30%' }}>
                                <div style={{
                                    width: '48px', height: '48px', margin: '0 auto 16px', background: '#fff',
                                    border: '2px solid var(--burnt-clay)', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px'
                                }}>
                                    🔍
                                </div>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }}>1. SCOUT</h3>
                                <p style={{ fontSize: '12px', opacity: 0.7, margin: 0 }}>
                                    Scours the web and approved sources for raw data.
                                </p>
                            </div>

                            {/* Step 2: Verifier */}
                            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '30%' }}>
                                <div style={{
                                    width: '48px', height: '48px', margin: '0 auto 16px', background: '#fff',
                                    border: '2px solid var(--olive-drab)', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px'
                                }}>
                                    ⚖️
                                </div>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }}>2. VERIFIER</h3>
                                <p style={{ fontSize: '12px', opacity: 0.7, margin: 0 }}>
                                    Validates source authenticity and data integrity.
                                </p>
                            </div>

                            {/* Step 3: Synthesizer */}
                            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '30%' }}>
                                <div style={{
                                    width: '48px', height: '48px', margin: '0 auto 16px', background: '#fff',
                                    border: '2px solid var(--graphite)', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px'
                                }}>
                                    🧬
                                </div>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }}>3. SYNTHESIZER</h3>
                                <p style={{ fontSize: '12px', opacity: 0.7, margin: 0 }}>
                                    Aggregates verified findings into a cohesive report.
                                </p>
                            </div>
                        </div>

                        {/* Detailed Description */}
                        <div style={{ background: '#f9f9f9', padding: '24px', borderRadius: '12px' }}>
                            <h4 style={{ margin: '0 0 16px', fontSize: '16px' }}>Why is this better?</h4>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6', opacity: 0.8 }}>
                                <li style={{ marginBottom: '8px' }}>
                                    <strong>No Hallucinations:</strong> Every piece of data is traced back to a verified source URL.
                                </li>
                                <li style={{ marginBottom: '8px' }}>
                                    <strong>Cryptographic Proof:</strong> Verifiers sign data attesting to its origin using TEEs.
                                </li>
                                <li>
                                    <strong>Fair Rewards:</strong> Agents are paid automatically via smart contracts only when their work is verified.
                                </li>
                            </ul>
                        </div>

                        {/* Close Button */}
                        <div style={{ marginTop: '32px', textAlign: 'center' }}>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '12px 32px',
                                    background: 'var(--graphite)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                Close Guide
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
