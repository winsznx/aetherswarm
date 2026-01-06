'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Book, Code, Rocket, Zap, Shield, Globe } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

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
            title: 'Integrations',
            id: 'integrations',
            icon: <Globe size={16} />,
            items: [
                { title: 'All Services', id: 'integrations-overview' },
                { title: 'x402 Status', id: 'x402-status' },
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
                        Get AetherSwarm running locally in 2 minutes with our automated script.
                    </p>

                    <div style={{ background: 'var(--graphite)', color: 'var(--warm-white)', padding: '24px', marginBottom: '24px', fontFamily: 'monospace', fontSize: '13px', overflowX: 'auto', borderRadius: '8px' }}>
                        <div># 1. Clone repository</div>
                        <div>git clone https://github.com/yourusername/aetherswarm.git</div>
                        <div>cd aetherswarm</div>
                        <div style={{ marginTop: '16px' }}># 2. Configure environment</div>
                        <div>cp .env.example .env</div>
                        <div style={{ marginTop: '16px' }}># 3. Start everything (Backend, Frontend, Agents)</div>
                        <div>./start-system.sh</div>
                    </div>

                    <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Create Your First Quest</h3>
                    <div style={{ background: 'var(--limestone)', padding: '20px', border: '1px solid var(--soft-grey)', borderRadius: '8px' }}>
                        <p style={{ marginBottom: '12px', fontSize: '14px' }}>Once the system is running:</p>
                        <ol style={{ paddingLeft: '20px', lineHeight: 1.8, fontSize: '14px' }}>
                            <li>Navigate to <code>http://localhost:3000/quests</code></li>
                            <li>Click "+ New Quest"</li>
                            <li>Enter an objective (e.g., "Analyze Bitcoin price trends")</li>
                            <li>Set a budget and click "Create Quest"</li>
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
                        A novel 3-layer architecture enables autonomous agent economies.
                    </p>

                    <div style={{ display: 'grid', gap: '16px' }}>
                        {[
                            {
                                layer: 'Layer 1',
                                title: 'Quest Orchestration',
                                desc: 'Quest Engine + Swarm Coordinator. Manages wallets and workflow.',
                                tech: 'Node.js, Express, BullMQ'
                            },
                            {
                                layer: 'Layer 2',
                                title: 'Autonomous Agents',
                                desc: 'Scout (Python/x402), Verifier (Rust/TEE), Synthesizer (Python/Merkle).',
                                tech: 'Python, Rust, EigenCloud'
                            },
                            {
                                layer: 'Layer 3',
                                title: 'Settlement & Registry',
                                desc: 'ERC-8004 Identity/Reputation Registry and Payment Settlement.',
                                tech: 'Polygon Amoy, Solidity'
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
                            { status: 'QUEUED', desc: 'Quest created, waiting for coordinator assignment.', color: 'var(--mid-grey)' },
                            { status: 'SCOUTING', desc: 'Scout agent hunts for data. Uses "Fast Path" for crypto prices or "Premium Search" (Tavily) for deep research.', color: 'var(--burnt-clay)' },
                            { status: 'VERIFYING', desc: 'Verifier validates data integrity inside an Intel TDX Enclave (TEE).', color: 'var(--burnt-clay)' },
                            { status: 'SYNTHESIZING', desc: 'Synthesizer builds a Merkle tree and uploads the final artifact to IPFS.', color: 'var(--burnt-clay)' },
                            { status: 'COMPLETE', desc: 'Quest finished. Agents paid (70/20/10 split). Artifact minting.', color: 'var(--olive-drab)' },
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
                </div>
            )
        },
        tiers: {
            title: 'Budget Tiers',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        Scout agents automatically optimize their strategy based on your budget.
                    </p>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ background: 'var(--graphite)', color: 'var(--warm-white)' }}>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Tier</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Budget</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Strategy</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { tier: 'BASIC', budget: '$1', strategy: 'Crypto "Fast Path" (Coingecko) or Single Source' },
                                { tier: 'STANDARD', budget: '$5', strategy: 'Multi-source Web Search (Tavily)' },
                                { tier: 'PREMIUM', budget: '$10+', strategy: 'Deep Research + Paid API Access' },
                            ].map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--soft-grey)', background: i % 2 === 0 ? 'var(--warm-white)' : 'var(--limestone)' }}>
                                    <td style={{ padding: '16px', fontWeight: 600 }}>{row.tier}</td>
                                    <td style={{ padding: '16px' }}>{row.budget}</td>
                                    <td style={{ padding: '16px' }}>{row.strategy}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                    <h3 style={{ marginBottom: '16px' }}>Automatic Settlement</h3>
                    <div style={{ background: 'var(--limestone)', padding: '24px', borderRadius: '8px', border: '1px solid var(--soft-grey)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <h4 style={{ marginBottom: '8px' }}>Scout (70%)</h4>
                                <p style={{ fontSize: '13px', color: 'var(--mid-grey)' }}>Pays for API access & compute.</p>
                            </div>
                            <div>
                                <h4 style={{ marginBottom: '8px' }}>Verifier (20%)</h4>
                                <p style={{ fontSize: '13px', color: 'var(--mid-grey)' }}>Pays for TEE compute usage.</p>
                            </div>
                            <div>
                                <h4 style={{ marginBottom: '8px' }}>Synthesizer (10%)</h4>
                                <p style={{ fontSize: '13px', color: 'var(--mid-grey)' }}>Pays for IPFS storage.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        'x402-intro': {
            title: 'What is x402?',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        x402 is an HTTP-native payment protocol (Status Code 402: Payment Required) that AetherSwarm uses to let agents pay for data.
                    </p>
                    <div style={{ background: 'var(--graphite)', color: 'var(--warm-white)', padding: '24px', borderRadius: '8px' }}>
                        <code style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                            1. Agent GET /premium-data<br />
                            2. Server returns 402 Payment Required + Price<br />
                            3. Agent signs payment (EIP-712)<br />
                            4. Agent retries GET with Proof-of-Payment<br />
                            5. Server returns 200 OK + Data
                        </code>
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
                        AetherSwarm uses <strong>OpenMid</strong> on Base Mainnet to sponsor gas fees for agent interactions, making micropayments truly viable.
                    </p>
                    <a href="https://openmid.xyz" target="_blank" style={{ color: 'var(--burnt-clay)', fontWeight: 600 }}>Learn more about OpenMid →</a>
                </div>
            )
        },
        facilitators: {
            title: 'Facilitators',
            content: (
                <div>
                    <h3 style={{ marginBottom: '16px' }}>Supported Networks</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li style={{ padding: '8px 0', borderBottom: '1px solid var(--soft-grey)' }}><strong>Polygon Amoy</strong> (Testnet Default)</li>
                        <li style={{ padding: '8px 0', borderBottom: '1px solid var(--soft-grey)' }}><strong>Base Mainnet</strong> (via OpenMid)</li>
                        <li style={{ padding: '8px 0' }}><strong>Ethereum Sepolia</strong></li>
                    </ul>
                </div>
            )
        },
        erc8004: {
            title: 'ERC-8004 Standard',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        The <strong>Trustless Agent Standard</strong>. AetherSwarm uses ERC-8004 to register agents on-chain, storing their reputation, endpoint URLs, and stake requirements in a decentralized registry.
                    </p>
                </div>
            )
        },
        installation: {
            title: 'Installation',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        Detailed installation for each component.
                    </p>
                    <h4 style={{ marginBottom: '8px' }}>Using the Script (Recommended)</h4>
                    <code style={{ background: 'var(--limestone)', padding: '4px 8px', borderRadius: '4px' }}>./start-system.sh</code>
                </div>
            )
        },
        agents: {
            title: 'Agent Development',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        Agents are independent programs that communicate via WebSocket with the Swarm Coordinator.
                    </p>
                    <h4 style={{ marginBottom: '8px' }}>Scout (Python)</h4>
                    <p style={{ fontSize: '14px', color: 'var(--mid-grey)', marginBottom: '16px' }}>Located in <code>agents/scout</code>. Handles <code>_perform_real_search</code>.</p>

                    <h4 style={{ marginBottom: '8px' }}>Verifier (Rust)</h4>
                    <p style={{ fontSize: '14px', color: 'var(--mid-grey)', marginBottom: '16px' }}>Located in <code>agents/verifier</code>. Compiles to a binary for performance.</p>
                </div>
            )
        },
        troubleshooting: {
            title: 'Troubleshooting',
            content: (
                <div>
                    <h3 style={{ marginBottom: '16px' }}>Common Issues</h3>

                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ marginBottom: '4px', color: 'var(--burnt-clay)' }}>Quest Stuck at "Queued"</h4>
                        <p style={{ fontSize: '14px', color: 'var(--mid-grey)', marginBottom: '8px' }}>Agents are likely disconnected from the coordinator.</p>
                        <div style={{ background: 'var(--limestone)', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                            <strong>Fix:</strong> Restart everything together.<br />
                            <code>./stop-system.sh && ./start-system.sh</code>
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ marginBottom: '4px', color: 'var(--burnt-clay)' }}>IPFS Upload Failed</h4>
                        <p style={{ fontSize: '14px', color: 'var(--mid-grey)', marginBottom: '8px' }}>Missing or invalid Pinata JWT.</p>
                        <div style={{ background: 'var(--limestone)', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                            <strong>Fix:</strong> Check <code>PINATA_JWT</code> in your .env file.
                        </div>
                    </div>
                </div>
            )
        },
        api: {
            title: 'API Reference',
            content: (
                <div>
                    <h3 style={{ marginBottom: '16px' }}>Quest Engine API</h3>
                    <div style={{ display: 'grid', gap: '24px' }}>
                        {[
                            { method: 'POST', path: '/quests', desc: 'Create a new quest', payload: '{ objectives: string[], budget: number }' },
                            { method: 'GET', path: '/quests', desc: 'List user quests', payload: 'None' },
                            { method: 'GET', path: '/quests/:id', desc: 'Get quest details & results', payload: 'None' },
                            { method: 'GET', path: '/health', desc: 'Service health check', payload: 'None' },
                        ].map((ep, i) => (
                            <div key={i} style={{ padding: '20px', background: 'var(--warm-white)', border: '1px solid var(--soft-grey)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <span style={{
                                        background: ep.method === 'POST' ? 'var(--burnt-clay)' : 'var(--olive-drab)',
                                        color: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 600
                                    }}>{ep.method}</span>
                                    <code style={{ fontSize: '14px', fontWeight: 600 }}>{ep.path}</code>
                                </div>
                                <p style={{ fontSize: '14px', color: 'var(--mid-grey)', marginBottom: '8px' }}>{ep.desc}</p>
                                <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--graphite)', background: 'var(--alabaster)', padding: '8px' }}>
                                    Payload: {ep.payload}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )
        },
        contracts: {
            title: 'Smart Contracts',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        AetherSwarm operates on <strong>Polygon Amoy</strong> (Testnet) and <strong>Base</strong> using the following core contracts.
                    </p>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {[
                            { name: 'DiscoveryRegistry', type: 'ERC-8004', desc: 'Stores agent identities, endpoints, and stake. Allows the coordinator to discover capable agents.' },
                            { name: 'ReputationRegistry', type: 'ERC-721 Extension', desc: 'Tracks agent performance scores. Reviews are tied to on-chain payments to prevent sybil attacks.' },
                            { name: 'QuestPool', type: 'Paymaster', desc: 'Holds USDC budget for active quests. Programmatically distributes funds to agents upon verification.' },
                            { name: 'ArtifactNFT', type: 'ERC-721', desc: 'Mints the final knowledge artifact as an NFT, containing the IPFS Merkle Root for data provenance.' },
                        ].map((c, i) => (
                            <div key={i} style={{ padding: '16px', background: 'var(--limestone)', borderLeft: '3px solid var(--burnt-clay)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <strong style={{ color: 'var(--graphite)' }}>{c.name}</strong>
                                    <span style={{ fontSize: '11px', background: 'var(--soft-grey)', padding: '2px 6px', borderRadius: '10px' }}>{c.type}</span>
                                </div>
                                <p style={{ fontSize: '13px', color: 'var(--mid-grey)', margin: 0 }}>{c.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )
        },
        config: {
            title: 'Configuration',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        Critical environment variables for <code>.env</code>.
                    </p>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        <div>
                            <h4 style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--burnt-clay)' }}>Wallets & Keys</h4>
                            <code style={{ display: 'block', background: 'var(--graphite)', color: 'var(--warm-white)', padding: '16px', borderRadius: '6px', fontSize: '12px', lineHeight: 1.6 }}>
                                CROSSMINT_API_KEY=...<br />
                                THIRDWEB_SECRET_KEY=...<br />
                                AGENT_PRIVATE_KEY=...<br />
                                PINATA_JWT=...
                            </code>
                        </div>
                        <div>
                            <h4 style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--burnt-clay)' }}>Services</h4>
                            <code style={{ display: 'block', background: 'var(--graphite)', color: 'var(--warm-white)', padding: '16px', borderRadius: '6px', fontSize: '12px', lineHeight: 1.6 }}>
                                RPC_URL=https://rpc.ankr.com/polygon_amoy<br />
                                REDIS_URL=redis://localhost:6379<br />
                                TAVILY_API_KEY=tvly-...
                            </code>
                        </div>
                    </div>
                </div>
            )
        },
        'integrations-overview': {
            title: 'Platform Integrations',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        AetherSwarm leverages cutting-edge Web3 infrastructure for autonomous AI agents.
                    </p>

                    <div style={{ display: 'grid', gap: '24px' }}>
                        {[
                            {
                                name: 'x402 Protocol',
                                status: 'ACTIVE',
                                desc: 'HTTP-native micropayments for agent-to-API data access',
                                features: ['EIP-712 signatures', 'Replay attack prevention', 'Payment verification'],
                                color: 'var(--olive-drab)'
                            },
                            {
                                name: 'Crossmint',
                                status: 'ACTIVE',
                                desc: 'Embedded wallets for gasless quest creation',
                                features: ['ERC-4337 smart wallets', 'Gasless transactions', 'Fiat on-ramps'],
                                color: 'var(--olive-drab)'
                            },
                            {
                                name: 'Thirdweb Nexus',
                                status: 'ACTIVE',
                                desc: 'Account abstraction and gas sponsorship',
                                features: ['Multi-chain support', 'Sponsored transactions', 'Contract deployment'],
                                color: 'var(--olive-drab)'
                            },
                            {
                                name: 'Tavily Search',
                                status: 'ACTIVE',
                                desc: 'Premium AI-optimized search API',
                                features: ['High-quality results', 'LLM-generated answers', 'Domain filtering'],
                                color: 'var(--olive-drab)'
                            },
                            {
                                name: 'Pinata / IPFS',
                                status: 'ACTIVE',
                                desc: 'Decentralized storage for knowledge artifacts',
                                features: ['Permanent storage', 'Content addressing', 'Gateway access'],
                                color: 'var(--olive-drab)'
                            },
                            {
                                name: 'Polygon Amoy',
                                status: 'ACTIVE',
                                desc: 'Layer 2 blockchain for on-chain attestations',
                                features: ['Low fees ($0.0001/tx)', 'Fast finality', 'EVM compatible'],
                                color: 'var(--olive-drab)'
                            },
                            {
                                name: 'Reown AppKit',
                                status: 'ACTIVE',
                                desc: 'Multi-wallet connection',
                                features: ['Multiple wallets', 'Chain switching', 'Social login'],
                                color: 'var(--olive-drab)'
                            },
                            {
                                name: 'EigenCloud TEE',
                                status: 'PLANNED',
                                desc: 'Trusted Execution Environments (dev mode)',
                                features: ['TEE attestations', 'Deterministic inference', 'Data availability'],
                                color: 'var(--burnt-clay)'
                            }
                        ].map((integration, i) => (
                            <div key={i} style={{
                                padding: '20px',
                                background: 'var(--warm-white)',
                                border: '1px solid var(--soft-grey)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                    <h4 style={{ margin: 0 }}>{integration.name}</h4>
                                    <span style={{
                                        padding: '4px 12px',
                                        background: integration.color,
                                        color: 'var(--warm-white)',
                                        fontSize: '9px',
                                        fontWeight: 500,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                    }}>
                                        {integration.status}
                                    </span>
                                </div>
                                <p style={{ fontSize: '14px', color: 'var(--mid-grey)', marginBottom: '12px' }}>
                                    {integration.desc}
                                </p>
                                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                                    {integration.features.map((feature, j) => (
                                        <li key={j} style={{ marginBottom: '4px' }}>{feature}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )
        },
        'x402-status': {
            title: 'x402 Implementation Status',
            content: (
                <div>
                    <p style={{ marginBottom: '24px', lineHeight: 1.8, color: 'var(--mid-grey)' }}>
                        Real-time status of x402 payment protocol implementation.
                    </p>

                    <div style={{ background: 'var(--limestone)', padding: '24px', marginBottom: '24px', border: '2px solid var(--olive-drab)' }}>
                        <h3 style={{ marginBottom: '16px', color: 'var(--olive-drab)' }}>✅ Fully Implemented</h3>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                'EIP-712 payment signature generation',
                                'HTTP 402 response handling',
                                'Payment proof verification',
                                'Replay attack prevention (nonce tracking)',
                                'Amount verification',
                                'Payment tracking and logging'
                            ].map((item, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px' }}>
                                    <span style={{ color: 'var(--olive-drab)' }}>✓</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ marginBottom: '16px' }}>Payment Flow</h3>
                        <div style={{ background: 'var(--graphite)', color: 'var(--warm-white)', padding: '20px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.8 }}>
                            1. Agent requests data → Server returns 402<br />
                            2. Agent signs EIP-712 payment authorization<br />
                            3. Agent retries with X-PAYMENT header<br />
                            4. Server verifies signature → Returns data<br />
                            5. Payment logged and tracked
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ marginBottom: '16px' }}>Live Statistics</h3>
                        <p style={{ fontSize: '14px', color: 'var(--mid-grey)', marginBottom: '12px' }}>
                            View real-time x402 payment statistics:
                        </p>
                        <code style={{
                            display: 'block',
                            padding: '12px',
                            background: 'var(--limestone)',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            border: '1px solid var(--soft-grey)'
                        }}>
                            GET /x402/stats
                        </code>
                    </div>

                    <div style={{ background: 'var(--warm-white)', padding: '20px', border: '1px solid var(--soft-grey)' }}>
                        <h4 style={{ marginBottom: '12px' }}>Security Features</h4>
                        <ul style={{ fontSize: '14px', color: 'var(--mid-grey)', paddingLeft: '20px' }}>
                            <li>Cryptographic signature verification using ethers.js</li>
                            <li>Nonce-based replay attack prevention</li>
                            <li>Amount validation (minimum 0.01 USDC)</li>
                            <li>Payer address verification</li>
                        </ul>
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
                    <ThemeToggle />
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

            <div className="container docs-layout">
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
                        <a href="https://github.com/winsznx/aetherswarm" style={{ textDecoration: 'none', color: 'var(--graphite)' }}>
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
