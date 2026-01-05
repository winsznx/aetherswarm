'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface WorkflowModalProps {
    quest: any;
    isOpen: boolean;
    onClose: () => void;
}

export function WorkflowModal({ quest, isOpen, onClose }: WorkflowModalProps) {
    if (!quest) return null;

    const workflowSteps = [
        {
            name: 'Quest Created',
            status: 'complete',
            icon: '🎯',
            description: 'Quest initialized with objectives and budget',
            timestamp: quest.createdAt
        },
        {
            name: 'Wallet Created',
            status: quest.walletAddress ? 'complete' : 'pending',
            icon: '💰',
            description: 'Crossmint embedded wallet generated',
            details: quest.walletAddress
        },
        {
            name: 'Scout Searching',
            status: quest.status === 'completed' || quest.results?.scoutData ? 'complete' :
                quest.status === 'processing' ? 'active' : 'pending',
            icon: '🔍',
            description: 'Scout agent researching with premium APIs',
            details: quest.results?.scoutData ? `${quest.results.scoutData.length} sources found` : null
        },
        {
            name: 'Verifier Attesting',
            status: quest.results?.attestationTxHash ? 'complete' :
                quest.status === 'processing' ? 'active' : 'pending',
            icon: '✓',
            description: 'TEE verification and attestation',
            details: quest.results?.attestationTxHash
        },
        {
            name: 'Synthesizer Compiling',
            status: quest.results?.summary ? 'complete' :
                quest.status === 'processing' ? 'active' : 'pending',
            icon: '📝',
            description: 'Knowledge synthesis and artifact creation',
            details: quest.results?.summary
        },
        {
            name: 'Quest Complete',
            status: quest.status === 'completed' ? 'complete' : 'pending',
            icon: '🎉',
            description: 'Results delivered and logged on-chain',
            timestamp: quest.completedAt
        }
    ];

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
                            background: 'white',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '600px',
                            width: '90%',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            zIndex: 1000,
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                        }}
                    >
                        {/* Header */}
                        <div style={{ marginBottom: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
                                        Quest Workflow
                                    </h2>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.6 }}>
                                        {quest.questId}
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                        opacity: 0.6
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {/* Workflow Steps */}
                        <div style={{ position: 'relative' }}>
                            {/* Vertical Line */}
                            <div style={{
                                position: 'absolute',
                                left: '20px',
                                top: '30px',
                                bottom: '30px',
                                width: '2px',
                                background: 'linear-gradient(to bottom, #e0e0e0 0%, #e0e0e0 100%)'
                            }} />

                            {workflowSteps.map((step, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    style={{
                                        position: 'relative',
                                        marginBottom: index < workflowSteps.length - 1 ? '32px' : 0,
                                        paddingLeft: '56px'
                                    }}
                                >
                                    {/* Icon Circle */}
                                    <div style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: step.status === 'complete' ? '#e7f5e9' :
                                            step.status === 'active' ? '#fff3e0' : '#f5f5f5',
                                        border: `2px solid ${step.status === 'complete' ? '#2e7d32' :
                                            step.status === 'active' ? '#f57c00' : '#e0e0e0'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '18px',
                                        zIndex: 1
                                    }}>
                                        {step.icon}
                                    </div>

                                    {/* Content */}
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <h3 style={{
                                                margin: 0,
                                                fontSize: '16px',
                                                fontWeight: 600,
                                                color: step.status === 'complete' ? '#000' : step.status === 'active' ? '#000' : '#999'
                                            }}>
                                                {step.name}
                                            </h3>
                                            {step.status === 'active' && (
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    background: '#f57c00',
                                                    animation: 'pulse 2s infinite'
                                                }} />
                                            )}
                                        </div>

                                        <p style={{
                                            margin: '4px 0',
                                            fontSize: '14px',
                                            opacity: 0.7,
                                            lineHeight: 1.5
                                        }}>
                                            {step.description}
                                        </p>

                                        {step.details && (
                                            <p style={{
                                                margin: '8px 0 0 0',
                                                fontSize: '13px',
                                                padding: '8px 12px',
                                                background: '#f8f9fa',
                                                borderRadius: '6px',
                                                fontFamily: step.details.startsWith('0x') ? 'monospace' : 'inherit',
                                                wordBreak: 'break-all'
                                            }}>
                                                {step.details}
                                            </p>
                                        )}

                                        {step.timestamp && (
                                            <p style={{ margin: '8px 0 0 0', fontSize: '12px', opacity: 0.5 }}>
                                                {new Date(step.timestamp).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Close Button */}
                        <div style={{ marginTop: '32px', textAlign: 'right' }}>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '10px 24px',
                                    background: 'var(--graphite)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>

                        <style jsx>{`
              @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
              }
            `}</style>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
