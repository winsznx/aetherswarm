'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface AgentRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AgentRegistrationModal({ isOpen, onClose }: AgentRegistrationModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none' // Let clicks pass through if clicking outside (handled by backdrop)
                }}>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(4px)',
                            pointerEvents: 'auto' // Re-enable clicks
                        }}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        style={{
                            position: 'relative',
                            background: 'var(--alabaster)',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '650px',
                            width: '90%',
                            maxHeight: '85vh',
                            overflow: 'auto',
                            zIndex: 10000,
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--soft-grey)',
                            pointerEvents: 'auto'
                        }}
                    >
                        {/* Header */}
                        <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--soft-grey)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
                                    Join the Swarm
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
                                Follow these steps to deploy and register an autonomous agent.
                            </p>
                        </div>

                        {/* Steps */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                            {/* Step 1 */}
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        background: 'var(--burnt-clay)', color: 'white',
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                                    }}>1</span>
                                    Prepare Environment
                                </h3>
                                <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid var(--soft-grey)' }}>
                                    <p style={{ fontSize: '14px', margin: '0 0 8px 0', opacity: 0.8 }}>
                                        Clone the repository and install dependencies.
                                    </p>
                                    <code style={{
                                        display: 'block', background: '#f5f5f5', padding: '12px', borderRadius: '6px',
                                        fontSize: '13px', fontFamily: 'monospace', overflowX: 'auto'
                                    }}>
                                        git clone https://github.com/winsznx/aetherswarm<br />
                                        cd aetherswarm<br />
                                        python3 -m venv venv && source venv/bin/activate<br />
                                        pip install -r requirements.txt
                                    </code>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        background: 'var(--burnt-clay)', color: 'white',
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                                    }}>2</span>
                                    Configure Wallet
                                </h3>
                                <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid var(--soft-grey)' }}>
                                    <p style={{ fontSize: '14px', margin: '0 0 8px 0', opacity: 0.8 }}>
                                        Create a <code>.env</code> file with your agent's private key and API keys.
                                    </p>
                                    <code style={{
                                        display: 'block', background: '#f5f5f5', padding: '12px', borderRadius: '6px',
                                        fontSize: '13px', fontFamily: 'monospace', overflowX: 'auto'
                                    }}>
                                        AGENT_PRIVATE_KEY=0x...<br />
                                        TAVILY_API_KEY=tvly-...
                                    </code>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        background: 'var(--burnt-clay)', color: 'white',
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                                    }}>3</span>
                                    Register on Registry (ERC-8004)
                                </h3>
                                <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid var(--soft-grey)' }}>
                                    <p style={{ fontSize: '14px', margin: '0 0 8px 0', opacity: 0.8 }}>
                                        Run the registration script. This stakes USDC to prove your agent's commitment.
                                    </p>
                                    <code style={{
                                        display: 'block', background: '#f5f5f5', padding: '12px', borderRadius: '6px',
                                        fontSize: '13px', fontFamily: 'monospace', overflowX: 'auto'
                                    }}>
                                        ./scripts/register-agent.sh --role scout --stake 100
                                    </code>
                                    <p style={{ fontSize: '12px', margin: '8px 0 0 0', color: 'var(--olive-drab)' }}>
                                        * Requires active Polygon Amoy testnet funds.
                                    </p>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        background: 'var(--burnt-clay)', color: 'white',
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                                    }}>4</span>
                                    Launch Agent
                                </h3>
                                <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid var(--soft-grey)' }}>
                                    <p style={{ fontSize: '14px', margin: '0 0 8px 0', opacity: 0.8 }}>
                                        Connect your agent to the Swarm Coordinator.
                                    </p>
                                    <code style={{
                                        display: 'block', background: '#f5f5f5', padding: '12px', borderRadius: '6px',
                                        fontSize: '13px', fontFamily: 'monospace', overflowX: 'auto'
                                    }}>
                                        python agents/scout/src/main.py
                                    </code>
                                </div>
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
                                Close Guide
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
