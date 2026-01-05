'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface PaymentInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PaymentInfoModal({ isOpen, onClose }: PaymentInfoModalProps) {
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
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'var(--alabaster)',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '600px',
                            width: '90%',
                            maxHeight: '85vh',
                            overflow: 'auto',
                            zIndex: 1000,
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--soft-grey)'
                        }}
                    >
                        {/* Header */}
                        <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--soft-grey)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
                                    How Payments Work
                                </h2>
                                <button
                                    onClick={onClose}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        color: 'var(--graphite)',
                                        padding: '4px'
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                            <p style={{ margin: '8px 0 0 0', fontSize: '15px', opacity: 0.7 }}>
                                AetherSwarm uses the <strong>x402 Protocol</strong> for machine-to-machine micropayments.
                            </p>
                        </div>

                        {/* Content */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                            {/* Concept 1: Quest Wallet */}
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{
                                    minWidth: '40px', height: '40px', borderRadius: '8px',
                                    background: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '20px'
                                }}>💰</div>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>Embedded Quest Wallets</h3>
                                    <p style={{ fontSize: '14px', margin: 0, opacity: 0.8, lineHeight: 1.5 }}>
                                        Every quest you create automatically generates a unique, embedded wallet using Crossmint. This wallet holds the budget for that specific quest.
                                    </p>
                                </div>
                            </div>

                            {/* Concept 2: x402 Protocol */}
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{
                                    minWidth: '40px', height: '40px', borderRadius: '8px',
                                    background: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '20px'
                                }}>⚡</div>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>The x402 Protocol</h3>
                                    <p style={{ fontSize: '14px', margin: 0, opacity: 0.8, lineHeight: 1.5 }}>
                                        Agents must perform work <em>before</em> getting paid. They submit a "Proof of Work" (HTTP 402 Payment Required) which the quest wallet verifies against the constraints.
                                    </p>
                                </div>
                            </div>

                            {/* Concept 3: Escrow & Release */}
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{
                                    minWidth: '40px', height: '40px', borderRadius: '8px',
                                    background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '20px'
                                }}>🤝</div>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>Trustless Settlement</h3>
                                    <p style={{ fontSize: '14px', margin: 0, opacity: 0.8, lineHeight: 1.5 }}>
                                        Funds are only released when the Verifier agent confirms the data's validity using a Trusted Execution Environment (TEE) attestation.
                                    </p>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
                                <p style={{ fontSize: '13px', margin: 0, opacity: 0.7, fontStyle: 'italic' }}>
                                    <strong>Note:</strong> Currently running on Polygon Amoy Testnet. All transactions use test USDC.
                                </p>
                            </div>
                        </div>

                        {/* Close Button */}
                        <div style={{ marginTop: '32px', textAlign: 'right' }}>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '12px 24px',
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
                                Got it
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
