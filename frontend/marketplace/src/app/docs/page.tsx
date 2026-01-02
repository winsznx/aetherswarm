'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Book, Code, Rocket, Zap, Shield, Globe } from 'lucide-react';

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState<string>('overview');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']));
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const toggleSection = (section: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        } else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    };

    const navigation = [
        {
            title: 'Getting Started',
            id: 'getting-started',
            icon: <Rocket size={16} />,
            items: [
                { title: 'Overview', id: 'overview' },
                { title: 'Quick Start', id: 'quickstart' },
                { title: 'Installation', id: 'installation' },
            ]
        },
        {
            title: 'Core Concepts',
            id: 'concepts',
            icon: <Book size={16} />,
            items: [
                { title: 'Architecture', id: 'architecture' },
                { title: 'Quest Lifecycle', id: 'lifecycle' },
                { title: 'Budget Tiers', id: 'tiers' },
                { title: 'Payment Flow', id: 'payments' },
            ]
        },
        {
            title: 'x402 Integration',
            id: 'x402',
            icon: <Zap size={16} />,
            items: [
                { title: 'What is x402?', id: 'x402-intro' },
                { title: 'OpenMid Setup', id: 'openmid' },
                { title: 'Multi-Facilitator', id: 'facilitators' },
                { title: 'ERC-8004', id: 'erc8004' },
            ]
        },
        {
            title: 'Development',
            id: 'development',
            icon: <Code size={16} />,
            items: [
                { title: 'API Reference', id: 'api' },
                { title: 'Agent Development', id: 'agents' },
                { title: 'Smart Contracts', id: 'contracts' },
            ]
        },
        {
            title: 'Deployment',
            id: 'deployment',
            icon: <Globe size={16} />,
            items: [
                { title: 'Configuration', id: 'config' },
                { title: 'Troubleshooting', id: 'troubleshooting' },
            ]
        },
    ];

    const content: Record<string, { title: string; content: React.JSX.Element }> = {
        overview: {
            title: 'Overview',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        AetherSwarm is a <strong>decentralized AI agent marketplace</strong> where users submit research quests and AI agents autonomously fetch, verify, and synthesize data.
                    </p>

                    <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Core Problems Solved</h3>
                    <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
                        {[
                            { icon: '💸', title: 'AI Agents Can\'t Pay', desc: 'x402 protocol enables HTTP-native micropayments' },
                            { icon: '🔒', title: 'No Trust Layer', desc: 'ERC-8004 provides on-chain agent identity and reputation' },
                            { icon: '📜', title: 'No Provenance', desc: 'Merkle trees + TEE attestations prove data integrity' },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                style={{
                                    padding: '20px',
                                    background: 'var(--limestone)',
                                    border: '1px solid var(--soft-grey)',
                                }}
                            >
                                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                                <h4 style={{ marginBottom: '8px' }}>{item.title}</h4>
                                <p style={{ fontSize: '14px', color: 'var(--mid-grey)', lineHeight: 1.6 }}>{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>

                    <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Key Features</h3>
                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            'Autonomous Payments - Agents pay for premium APIs using x402',
                            'Verifiable Execution - TEE attestations prove work integrity',
                            'On-Chain Identity - ERC-8004 agent registry with reputation',
                            'Knowledge NFTs - Artifacts with cryptographic provenance',
                            'Multi-Facilitator - OpenMid (free gas!), Thirdweb, Corbits',
                        ].map((feature, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <span style={{ color: 'var(--olive-drab)', marginTop: '4px' }}>✓</span>
                                <span style={{ lineHeight: 1.6 }}>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )
        },
        quickstart: {
            title: 'Quick Start',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        Get AetherSwarm running locally in 5 minutes.
                    </p>

                    <div style={{ background: 'var(--graphite)', color: 'var(--warm-white)', padding: '24px', marginBottom: '24px', fontFamily: 'monospace', fontSize: '13px', overflowX: 'auto' }}>
                        <div># 1. Clone repository</div>
                        <div>git clone https://github.com/yourusername/aetherswarm.git</div>
                        <div>cd aetherswarm</div>
                        <div style={{ marginTop: '16px' }}># 2. Install dependencies</div>
                        <div>npm install</div>
                        <div style={{ marginTop: '16px' }}># 3. Configure environment</div>
                        <div>cp .env.example .env</div>
                        <div style={{ marginTop: '16px' }}># 4. Start services</div>
                        <div>npm run dev:all</div>
                    </div>

                    <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Create Your First Quest</h3>
                    <div style={{ background: 'var(--limestone)', padding: '20px', border: '1px solid var(--soft-grey)' }}>
                        <p style={{ marginBottom: '12px', fontSize: '14px' }}>Via UI:</p>
                        <ol style={{ paddingLeft: '20px', lineHeight: 1.8, fontSize: '14px' }}>
                            <li>Navigate to <code>http://localhost:3000/quests</code></li>
                            <li>Click "+ New Quest"</li>
                            <li>Fill in objectives and budget</li>
                            <li>Monitor progress in real-time</li>
                        </ol>
                    </div>
                </div>
            )
        },
        architecture: {
            title: 'Architecture',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        AetherSwarm implements a four-layer architecture designed for production deployment.
                    </p>

                    <div style={{ display: 'grid', gap: '16px' }}>
                        {[
                            {
                                layer: 'Layer 1',
                                title: 'Quest Orchestration',
                                desc: 'Quest Engine receives requests, creates wallets (Crossmint), stores in Redis',
                                tech: 'Node.js + Express + TypeScript'
                            },
                            {
                                layer: 'Layer 2',
                                title: 'Agent Execution',
                                desc: 'Swarm Coordinator orchestrates Scout → Verifier → Synthesizer workflow',
                                tech: 'BullMQ + WebSockets'
                            },
                            {
                                layer: 'Layer 3',
                                title: 'Blockchain Settlement',
                                desc: 'ERC-8004 registry, reputation tracking, payment settlement on Polygon/Base',
                                tech: 'Solidity + ethers.js'
                            },
                            {
                                layer: 'Layer 4',
                                title: 'Discovery & Marketplace',
                                desc: 'Frontend for quest submission, agent leaderboards, artifact trading',
                                tech: 'Next.js + The Graph'
                            },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                style={{
                                    padding: '24px',
                                    background: i % 2 === 0 ? 'var(--warm-white)' : 'var(--limestone)',
                                    border: '1px solid var(--soft-grey)',
                                }}
                            >
                                <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--burnt-clay)', marginBottom: '8px' }}>{item.layer}</div>
                                <h4 style={{ marginBottom: '12px' }}>{item.title}</h4>
                                <p style={{ fontSize: '14px', color: 'var(--mid-grey)', marginBottom: '12px', lineHeight: 1.6 }}>{item.desc}</p>
                                <code style={{ fontSize: '12px', color: 'var(--graphite)' }}>{item.tech}</code>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )
        },
        lifecycle: {
            title: 'Quest Lifecycle',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        Every quest goes through a state machine with five phases.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[
                            { status: 'QUEUED', desc: 'Quest created, waiting for coordinator assignment', color: 'var(--mid-grey)' },
                            { status: 'SCOUTING', desc: 'Scout agent fetches data (may use x402 payments)', color: 'var(--burnt-clay)' },
                            { status: 'VERIFYING', desc: 'Verifier validates data in TEE', color: 'var(--burnt-clay)' },
                            { status: 'SYNTHESIZING', desc: 'Synthesizer creates artifact + uploads to IPFS', color: 'var(--burnt-clay)' },
                            { status: 'COMPLETE', desc: 'Agents receive payouts (70/20/10 split)', color: 'var(--olive-drab)' },
                        ].map((phase, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                <div style={{
                                    minWidth: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: phase.color,
                                    color: 'var(--warm-white)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                }}>{i + 1}</div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ marginBottom: '4px' }}>{phase.status}</h4>
                                    <p style={{ fontSize: '14px', color: 'var(--mid-grey)', lineHeight: 1.6 }}>{phase.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '32px', padding: '20px', background: 'var(--limestone)', border: '1px solid var(--soft-grey)' }}>
                        <h4 style={{ marginBottom: '12px' }}>⏱️ Expected Timeline</h4>
                        <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px', lineHeight: 1.8 }}>
                            <li>Scouting: ~10 seconds</li>
                            <li>Verifying: ~5 seconds</li>
                            <li>Synthesizing: ~10 seconds</li>
                            <li><strong>Total: ~25 seconds</strong></li>
                        </ul>
                    </div>
                </div>
            )
        },
        tiers: {
            title: 'Budget Tiers',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        Scout agents automatically determine the appropriate tier based on quest budget.
                    </p>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--graphite)', color: 'var(--warm-white)' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tier</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Budget</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Max Sources</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Use Case</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { tier: 'BASIC', budget: '$0-1', sources: '1', useCase: 'Simple queries' },
                                    { tier: 'STANDARD', budget: '$1-5', sources: '2', useCase: 'Multi-source research' },
                                    { tier: 'PREMIUM', budget: '$5-10', sources: '3', useCase: 'In-depth analysis' },
                                    { tier: 'ENTERPRISE', budget: '$10+', sources: '4+', useCase: 'Comprehensive reports' },
                                ].map((row, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--soft-grey)', background: i % 2 === 0 ? 'var(--warm-white)' : 'var(--limestone)' }}>
                                        <td style={{ padding: '16px', fontWeight: 600 }}>{row.tier}</td>
                                        <td style={{ padding: '16px' }}>{row.budget}</td>
                                        <td style={{ padding: '16px' }}>{row.sources}</td>
                                        <td style={{ padding: '16px', color: 'var(--mid-grey)' }}>{row.useCase}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
        },
        payments: {
            title: 'Payment Flow',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        Understanding how USDC flows through the system.
                    </p>

                    <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Example: $25 Quest</h3>
                    <div style={{ background: 'var(--limestone)', padding: '24px', border: '1px solid var(--soft-grey)', marginBottom: '24px' }}>
                        <div style={{ fontSize: '14px', lineHeight: 2 }}>
                            <div>User pays: <strong>$25 USDC</strong></div>
                            <div style={{ paddingLeft: '20px' }}>↓</div>
                            <div>Quest Wallet (Crossmint)</div>
                            <div style={{ paddingLeft: '20px' }}>↓</div>
                            <div>Upon completion:</div>
                            <div style={{ paddingLeft: '40px' }}>├─ Scout: <strong>$17.50</strong> (70%)</div>
                            <div style={{ paddingLeft: '40px' }}>├─ Verifier: <strong>$5.00</strong> (20%)</div>
                            <div style={{ paddingLeft: '40px' }}>└─ Synthesizer: <strong>$2.50</strong> (10%)</div>
                        </div>
                    </div>

                    <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Cost Breakdown</h3>
                    <table style={{ width: '100%', fontSize: '14px' }}>
                        <tbody>
                            {[
                                { item: 'User Payment', cost: '$25', payer: 'User' },
                                { item: 'API Calls', cost: '$0.01-0.10 each', payer: 'Scout (from allocation)' },
                                { item: 'Gas Fees', cost: '~$0.001 normally', payer: 'OpenMid (FREE!)' },
                                { item: 'ERC-8004 Registration', cost: '$0 (testnet)', payer: 'OpenMid (FREE!)' },
                                { item: 'IPFS Storage', cost: '$0.01', payer: 'Synthesizer (from allocation)' },
                            ].map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--soft-grey)' }}>
                                    <td style={{ padding: '12px' }}>{row.item}</td>
                                    <td style={{ padding: '12px', fontWeight: 600 }}>{row.cost}</td>
                                    <td style={{ padding: '12px', color: 'var(--mid-grey)' }}>{row.payer}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        },
        'x402-intro': {
            title: 'What is x402?',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        x402 is an HTTP-native payment protocol that enables AI agents to autonomously pay for APIs.
                    </p>

                    <div style={{ background: 'var(--graphite)', color: 'var(--warm-white)', padding: '24px', marginBottom: '24px' }}>
                        <h4 style={{ color: 'var(--warm-white)', marginBottom: '16px' }}>The Flow</h4>
                        <div style={{ fontSize: '13px', lineHeight: 2, fontFamily: 'monospace' }}>
                            <div>1. Agent → API: GET /data</div>
                            <div>2. API → Agent: 402 Payment Required</div>
                            <div>3. Agent signs EIP-712 payment</div>
                            <div>4. Agent → Facilitator: Verify payment</div>
                            <div>5. Facilitator → Blockchain: Settle USDC</div>
                            <div>6. Facilitator → Agent: Payment proof</div>
                            <div>7. Agent → API: GET /data + X-402-Payment header</div>
                            <div>8. API → Agent: 200 OK + data</div>
                        </div>
                    </div>

                    <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Why x402 Matters</h3>
                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            'Enables autonomous agent economies',
                            'No API keys or subscriptions needed',
                            'Pay-per-request pricing',
                            'Instant settlement (2 seconds)',
                            'Cryptographically secure',
                        ].map((item, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <span style={{ color: 'var(--olive-drab)' }}>→</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )
        },
        openmid: {
            title: 'OpenMid Setup',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        OpenMid provides sponsored x402 facilitation on Base Mainnet with automatic ERC-8004 registration.
                    </p>

                    <div style={{ background: 'var(--olive-drab)', color: 'var(--warm-white)', padding: '20px', marginBottom: '24px' }}>
                        <h4 style={{ color: 'var(--warm-white)', marginBottom: '12px' }}>✨ Key Benefits</h4>
                        <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px', lineHeight: 2 }}>
                            <li>✓ FREE gas fees (OpenMid sponsors all transactions)</li>
                            <li>✓ Automatic ERC-8004 agent registration</li>
                            <li>✓ Dual-network (Base Mainnet + Sepolia)</li>
                            <li>✓ No setup required</li>
                        </ul>
                    </div>

                    <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Environment Variables</h3>
                    <div style={{ background: 'var(--graphite)', color: 'var(--warm-white)', padding: '20px', fontFamily: 'monospace', fontSize: '12px', overflowX: 'auto' }}>
                        <div>OPENMID_FACILITATOR_URL=https://facilitator.openmid.xyz</div>
                        <div>BASE_MAINNET_CHAIN_ID=8453</div>
                        <div>BASE_SEPOLIA_CHAIN_ID=84532</div>
                        <div>USDC_BASE_MAINNET=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913</div>
                        <div>ERC8004_DELEGATION_CONTRACT=0xFdc90fCC6929a2f42a9D714bD10520eEE98bD378</div>
                    </div>

                    <div style={{ marginTop: '24px', padding: '20px', background: 'var(--limestone)', border: '1px solid var(--soft-grey)' }}>
                        <h4 style={{ marginBottom: '12px' }}>📚 Learn More</h4>
                        <p style={{ fontSize: '14px', lineHeight: 1.6 }}>
                            See <code>OPENMID_COMPLETE.md</code> for full integration guide.
                        </p>
                    </div>
                </div>
            )
        },
    };

    return (
        <div style={{ background: 'var(--alabaster)', minHeight: '100vh', paddingTop: '80px' }}>
            {/* Header */}
            <header style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 100,
                background: 'var(--header-bg)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--soft-grey)',
            }}>
                <a href="/" style={{ textDecoration: 'none', color: 'var(--graphite)', display: 'flex', alignItems: 'center' }}>
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
                    <a href="/" className="label" style={{ textDecoration: 'none', color: 'var(--graphite)' }}>Home</a>
                    <a href="/agents" className="label" style={{ textDecoration: 'none' }}>Agents</a>
                    <a href="/quests" className="label" style={{ textDecoration: 'none' }}>Quests</a>
                    <a href="/docs" className="label" style={{ textDecoration: 'none', color: 'var(--burnt-clay)' }}>Docs</a>
                </nav>
                {/* Mobile Sections Button */}
                <button
                    className="mobile-nav"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    style={{
                        display: 'none',
                        background: 'var(--graphite)',
                        color: 'var(--warm-white)',
                        border: 'none',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontFamily: 'var(--font-sans)',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                    }}
                >
                    {mobileMenuOpen ? '✕ Close' : '☰ Sections'}
                </button>
            </header>

            <div className="container docs-layout" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '48px', padding: '48px 16px', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Sidebar */}
                <aside className={mobileMenuOpen ? "mobile-menu-open" : ""} style={{ height: 'fit-content' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <span className="label">Documentation</span>
                        <h2 style={{ marginTop: '8px', fontSize: '1.5rem' }}>
                            Docs
                        </h2>
                    </div>

                    <nav>
                        {navigation.map((section) => (
                            <div key={section.id} style={{ marginBottom: '16px' }}>
                                <button
                                    onClick={() => toggleSection(section.id)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 0',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        fontWeight: 600,
                                        color: 'var(--graphite)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {section.icon}
                                        {section.title}
                                    </div>
                                    {expandedSections.has(section.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                                <AnimatePresence>
                                    {expandedSections.has(section.id) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            {section.items.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => { setActiveSection(item.id); setMobileMenuOpen(false); }}
                                                    style={{
                                                        width: '100%',
                                                        textAlign: 'left',
                                                        padding: '8px 0 8px 24px',
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '14px',
                                                        color: activeSection === item.id ? 'var(--burnt-clay)' : 'var(--mid-grey)',
                                                        fontWeight: activeSection === item.id ? 600 : 400,
                                                    }}
                                                >
                                                    {item.title}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeSection}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h1 style={{ marginBottom: '24px', fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
                                {content[activeSection]?.title || 'Overview'}
                            </h1>
                            <div style={{ fontSize: '15px', lineHeight: 1.8 }}>
                                {content[activeSection]?.content}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Footer Navigation */}
                    <div style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid var(--soft-grey)', display: 'flex', justifyContent: 'space-between' }}>
                        <a href="https://github.com/yourusername/aetherswarm" style={{ textDecoration: 'none', color: 'var(--graphite)' }}>
                            <span className="label">View on GitHub →</span>
                        </a>
                        <a href="/quests" style={{ textDecoration: 'none', color: 'var(--burnt-clay)' }}>
                            <span className="label">Try AetherSwarm →</span>
                        </a>
                    </div>
                </main>
            </div>
        </div>
    );
}
