'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function IntegrationsPage() {
    const integrations = [
        {
            name: 'x402 Protocol',
            status: 'active',
            description: 'HTTP-native micropayments for agent-to-API data access',
            features: ['EIP-712 signatures', 'Replay attack prevention', 'Real-time verification'],
            docs: 'https://docs.corbits.dev',
            implementation: 'Faremeter client in Scout agents, payment middleware in Quest Engine'
        },
        {
            name: 'Crossmint',
            status: 'active',
            description: 'Embedded wallets for gasless quest creation',
            features: ['ERC-4337 smart wallets', 'Gasless transactions', 'Fiat on-ramps'],
            docs: 'https://crossmint.com',
            implementation: 'Quest wallet creation, NFT minting'
        },
        {
            name: 'Thirdweb Nexus',
            status: 'active',
            description: 'Account abstraction and gas sponsorship',
            features: ['Multi-chain support', 'Sponsored transactions', 'Agent discovery'],
            docs: 'https://portal.thirdweb.com',
            implementation: 'Smart contract deployment, x402 facilitator'
        },
        {
            name: 'Tavily Search',
            status: 'active',
            description: 'Premium AI-optimized search API',
            features: ['High-quality results', 'LLM-generated answers', 'Domain filtering'],
            docs: 'https://tavily.com',
            implementation: 'Scout agent premium search integration'
        },
        {
            name: 'Pinata / IPFS',
            status: 'active',
            description: 'Decentralized storage for knowledge artifacts',
            features: ['Permanent storage', 'Content addressing', 'Gateway access'],
            docs: 'https://pinata.cloud',
            implementation: 'Synthesizer uploads final artifacts to IPFS'
        },
        {
            name: 'Polygon Amoy',
            status: 'active',
            description: 'Layer 2 blockchain for on-chain attestations',
            features: ['Low fees ($0.0001/tx)', 'Fast finality', 'EVM compatible'],
            docs: 'https://polygon.technology',
            implementation: 'Verifier posts attestations, all settlements'
        },
        {
            name: 'Reown AppKit',
            status: 'active',
            description: 'Multi-wallet connection (MetaMask, Coinbase, etc.)',
            features: ['Multiple wallets', 'Chain switching', 'Social login'],
            docs: 'https://reown.com',
            implementation: 'Frontend wallet connection'
        },
        {
            name: 'EigenCloud TEE',
            status: 'planned',
            description: 'Trusted Execution Environments for verifiable compute',
            features: ['TEE attestations', 'Deterministic inference', 'Data availability'],
            docs: 'https://eigencloud.xyz',
            implementation: 'Dev mode only - production deployment pending'
        }
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
            }}>
                <Link href=\"/\" style={{ textDecoration: 'none', color: 'var(--graphite)' }}>
                    <img src=\"/AstherS Logo1.svg\" alt=\"AetherSwarm\" className=\"logo-light\" style={{ height: '40px' }} />
                    <img src=\"/AstherS Logo2.svg\" alt=\"AetherSwarm\" className=\"logo-dark\" style={{ height: '40px' }} />
                </Link>
                <nav style={{ display: 'flex', gap: '24px' }}>
                    <Link href=\"/\" className=\"label\">Home</Link>
                    <Link href=\"/quests\" className=\"label\">Quests</Link>
                    <Link href=\"/integrations\" className=\"label\" style={{ color: 'var(--graphite)' }}>Integrations</Link>
                </nav >
            </header >

        <main style={{ padding: 'var(--space-lg)' }}>
            <div className=\"container\" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: '48px' }}
            >
                <span className=\"label\">Platform Infrastructure</span>
            <h1 style={{ marginTop: '8px', marginBottom: '16px' }}>
                Technology <span style={{ fontStyle: 'italic' }}>Integrations</span>
            </h1>
            <p style={{ color: 'var(--mid-grey)', maxWidth: '600px' }}>
                AetherSwarm leverages cutting-edge Web3 infrastructure to enable autonomous AI agents with verifiable compute, micropayments, and decentralized storage.
            </p>
        </motion.div>

    {/* Integration Grid */ }
    <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: 'var(--space-md)',
    }}>
        {integrations.map((integration, i) => (
                            <motion.div
                                key={integration.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                style={{
                                    padding: 'var(--space-md)',
                                    background: 'var(--warm-white)',
                                    border: '1px solid var(--soft-grey)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                                    <h3 style={{ fontFamily: 'var(--font-serif)', margin: 0 }}>{integration.name}</h3>
                                    <span style={{
                                        padding: '4px 12px',
                                        background: integration.status === 'active' ? 'var(--olive-drab)' : 'var(--burnt-clay)',
                                        color: 'var(--warm-white)',
                                        fontSize: '9px',
                                        fontWeight: 500,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                    }}>
                                        {integration.status}
                                    </span>
                                </div>

                                <p style={{ color: 'var(--mid-grey)', fontSize: '14px', marginBottom: '16px' }}>
                                    {integration.description}
                                </p>

                                <div style={{ marginBottom: '16px' }}>
                                    <div className=\"label\" style={{ marginBottom: '8px' }}>Features</div>
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--graphite)' }}>
                                        {integration.features.map(feature => (
                                            <li key={feature} style={{ marginBottom: '4px' }}>{feature}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div style={{ paddingTop: '16px', borderTop: '1px solid var(--soft-grey)' }}>
                                    <div className=\"label\" style={{ marginBottom: '4px' }}>Implementation</div>
                                    <p style={{ fontSize: '12px', color: 'var(--mid-grey)', marginBottom: '12px' }}>
                                        {integration.implementation}
                                    </p>
                                    <a
                                        href={integration.docs}
                                        target=\"_blank\"
        rel=\"noopener noreferrer\"
        style={{
            display: 'inline-block',
            padding: '6px 12px',
            background: 'var(--limestone)',
            border: '1px solid var(--soft-grey)',
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            color: 'var(--graphite)',
        }}
                                    >
        Documentation ↗
    </a>
                                </div >
                            </motion.div >
                        ))
}
                    </div >

    {/* x402 Deep Dive */ }
    < motion.div
initial = {{ opacity: 0, y: 20 }}
animate = {{ opacity: 1, y: 0 }}
transition = {{ delay: 0.5 }}
style = {{
    marginTop: '48px',
        padding: 'var(--space-lg)',
            background: 'var(--warm-white)',
                border: '2px solid var(--olive-drab)',
                        }}
                    >
                        <h2 style={{ marginBottom: '16px' }}>
                            x402 Protocol <span style={{ fontStyle: 'italic' }}>Deep Dive</span>
                        </h2>
                        <p style={{ color: 'var(--mid-grey)', marginBottom: '24px' }}>
                            AetherSwarm implements the full x402 specification for HTTP-native micropayments, enabling agents to autonomously pay for premium data sources.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                            <div>
                                <h4 style={{ marginBottom: '8px' }}>Payment Flow</h4>
                                <ol style={{ fontSize: '13px', color: 'var(--graphite)', paddingLeft: '20px' }}>
                                    <li>Agent requests data → 402 response</li>
                                    <li>Sign EIP-712 payment authorization</li>
                                    <li>Retry request with X-PAYMENT header</li>
                                    <li>Server verifies signature → Returns data</li>
                                </ol>
                            </div>

                            <div>
                                <h4 style={{ marginBottom: '8px' }}>Security Features</h4>
                                <ul style={{ fontSize: '13px', color: 'var(--graphite)', paddingLeft: '20px' }}>
                                    <li>EIP-712 typed signatures</li>
                                    <li>Replay attack prevention (nonce tracking)</li>
                                    <li>Amount verification</li>
                                    <li>Signature recovery validation</li>
                                </ul>
                            </div>

                            <div>
                                <h4 style={{ marginBottom: '8px' }}>Live Stats</h4>
                                <p style={{ fontSize: '13px', color: 'var(--mid-grey)' }}>
                                    View real-time x402 payment statistics at:
                                </p>
                                <code style={{
                                    display: 'block',
                                    padding: '8px',
                                    background: 'var(--limestone)',
                                    fontSize: '11px',
                                    fontFamily: 'monospace',
                                    marginTop: '8px'
                                }}>
                                    GET /x402/stats
                                </code>
                            </div>
                        </div>
                    </motion.div >
                </div >
            </main >
        </div >
    );
}
