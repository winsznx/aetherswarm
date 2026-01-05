'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { API_CONFIG } from '@/config/api';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
    Node,
    Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface HealthData {
    status: string;
    connectedAgents: number;
    activeQuests: number;
    agentBreakdown: {
        scouts: number;
        verifiers: number;
        synthesizers: number;
    };
}

interface Agent {
    id: string;
    role: string;
    status: 'active' | 'pending' | 'offline';
    address: string;
    reputation: number;
}

const AgentNode = ({ data }: { data: any }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
            padding: '24px 32px',
            background: data.active ? '#2A2A2A' : '#FAF9F6',
            color: data.active ? '#FAF9F6' : '#2A2A2A',
            border: '1px solid #2A2A2A',
            minWidth: '180px',
        }}
    >
        <div style={{
            fontSize: '9px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            opacity: 0.6,
            marginBottom: '8px',
        }}>
            {data.role}
        </div>
        <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '20px',
        }}>
            {data.label}
        </div>
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '12px',
            fontSize: '10px',
            textTransform: 'uppercase',
        }}>
            <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: data.status === 'active' ? '#6B705C' : '#B07D62',
            }} />
            {data.status}
        </div>
        {data.reputation !== undefined && (
            <div style={{
                marginTop: '8px',
                fontSize: '10px',
                color: data.active ? 'rgba(255,255,255,0.6)' : 'var(--mid-grey)',
            }}>
                Reputation: {data.reputation}%
            </div>
        )}
    </motion.div>
);

const nodeTypes = { agent: AgentNode };

const initialNodes: Node[] = [
    {
        id: 'coordinator',
        type: 'agent',
        position: { x: 350, y: 50 },
        data: { label: 'Orchestrator', role: 'Coordinator', active: true, status: 'active', reputation: 100 },
    },
    {
        id: 'scout-1',
        type: 'agent',
        position: { x: 50, y: 200 },
        data: { label: 'Scout Alpha', role: 'Discovery', active: false, status: 'pending', reputation: 85 },
    },
    {
        id: 'scout-2',
        type: 'agent',
        position: { x: 250, y: 300 },
        data: { label: 'Scout Beta', role: 'Discovery', active: false, status: 'offline', reputation: 72 },
    },
    {
        id: 'verifier-1',
        type: 'agent',
        position: { x: 450, y: 200 },
        data: { label: 'Verifier', role: 'TEE Attestation', active: true, status: 'active', reputation: 98 },
    },
    {
        id: 'synthesizer-1',
        type: 'agent',
        position: { x: 650, y: 200 },
        data: { label: 'Synthesizer', role: 'Aggregation', active: false, status: 'pending', reputation: 90 },
    },
];

const initialEdges: Edge[] = [
    { id: 'e1', source: 'coordinator', target: 'scout-1', animated: true, style: { stroke: '#2A2A2A' } },
    { id: 'e2', source: 'coordinator', target: 'scout-2', style: { stroke: '#2A2A2A' } },
    { id: 'e3', source: 'coordinator', target: 'verifier-1', animated: true, style: { stroke: '#2A2A2A' } },
    { id: 'e4', source: 'coordinator', target: 'synthesizer-1', style: { stroke: '#2A2A2A' } },
    { id: 'e5', source: 'scout-1', target: 'verifier-1', style: { stroke: '#D1D1D1', strokeDasharray: '5,5' } },
    { id: 'e6', source: 'verifier-1', target: 'synthesizer-1', style: { stroke: '#D1D1D1', strokeDasharray: '5,5' } },
];

import { ThemeToggle } from '@/components/ThemeToggle';
import { AgentRegistrationModal } from '@/components/AgentRegistrationModal';

export default function AgentsPage() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [health, setHealth] = useState<HealthData | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showRegistrationModal, setShowRegistrationModal] = useState(false);

    const fetchHealth = useCallback(async () => {
        try {
            const res = await fetch(`${API_CONFIG.COORDINATOR_URL}/health`);
            const data = await res.json();
            setHealth(data);

            setNodes((nds) =>
                nds.map((node) => {
                    // Check if any agent with this role is active
                    const agentType = node.id.split('-')[0];
                    let isActive = false;
                    let reputation = 0;

                    // Match node role to active agents count
                    if (agentType === 'scout' && data.agentBreakdown.scouts > 0) isActive = true;
                    if (agentType === 'verifier' && data.agentBreakdown.verifiers > 0) isActive = true;
                    if (agentType === 'synthesizer' && data.agentBreakdown.synthesizers > 0) isActive = true;
                    if (node.id === 'coordinator') isActive = true; // Always active if we fetched health

                    return {
                        ...node,
                        data: {
                            ...node.data,
                            active: isActive,
                            status: isActive ? 'active' : 'pending',
                            reputation: isActive ? 95 + Math.floor(Math.random() * 5) : node.data.reputation // Simulate dynamic rep
                        }
                    };
                })
            );
        } catch (e) {
            console.error('Failed to fetch health');
        }
    }, [setNodes]);

    const fetchAgents = useCallback(async () => {
        try {
            const res = await fetch(`${API_CONFIG.COORDINATOR_URL}/agents`);
            const data = await res.json();
            setAgents(data.agents || []);
        } catch (e) {
            console.error('Failed to fetch agents:', e);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        fetchAgents();
        const interval = setInterval(() => {
            fetchHealth();
            fetchAgents();
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchHealth, fetchAgents]);

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
                    <a href="/agents" className="label" style={{ textDecoration: 'none', color: 'var(--graphite)' }}>Agents</a>
                    <a href="/quests" className="label" style={{ textDecoration: 'none' }}>Quests</a>
                    <a href="/settings" className="label" style={{ textDecoration: 'none' }}>Settings</a>
                    <button
                        onClick={() => setShowRegistrationModal(true)}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--burnt-clay)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}
                    >
                        Join Swarm
                    </button>
                    <ThemeToggle />
                </nav>
                <nav className="mobile-nav" style={{ display: 'none', gap: '8px', alignItems: 'center' }}>
                    <ThemeToggle />
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
                                display: 'flex', flexDirection: 'column', gap: '24px',
                                boxShadow: '-4px 0 20px rgba(0,0,0,0.1)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px' }}>×</button>
                            </div>
                            <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <a href="/" className="label" style={{ fontSize: '14px' }}>Home</a>
                                <a href="/agents" className="label" style={{ fontSize: '14px', color: 'var(--graphite)' }}>Agents</a>
                                <a href="/quests" className="label" style={{ fontSize: '14px' }}>Quests</a>
                                <a href="/settings" className="label" style={{ fontSize: '14px' }}>Settings</a>
                                <button
                                    onClick={() => {
                                        setShowRegistrationModal(true);
                                        setMobileMenuOpen(false);
                                    }}
                                    style={{
                                        padding: '12px',
                                        background: 'var(--burnt-clay)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginTop: '12px'
                                    }}
                                >
                                    Join Swarm
                                </button>
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
                    >
                        <span className="label">Network Overview</span>
                        <h2 style={{ marginTop: '8px', marginBottom: '24px' }}>
                            Agent <span style={{ fontStyle: 'italic' }}>Topology</span>
                        </h2>
                    </motion.div>

                    {/* Stats */}
                    <div className="stats-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: '16px',
                        marginBottom: '32px',
                    }}>
                        {[
                            { label: 'Total Agents', value: health?.connectedAgents || 0 },
                            { label: 'Scouts', value: health?.agentBreakdown?.scouts || 0 },
                            { label: 'Verifiers', value: health?.agentBreakdown?.verifiers || 0 },
                            { label: 'Synthesizers', value: health?.agentBreakdown?.synthesizers || 0 },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                style={{
                                    padding: '16px',
                                    background: 'var(--warm-white)',
                                    border: '1px solid var(--soft-grey)',
                                    textAlign: 'center',
                                }}
                            >
                                <div className="stat-number" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontFamily: 'var(--font-serif)' }}>
                                    {stat.value}
                                </div>
                                <div className="label">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Agent Network Visualization */}
                    <div style={{
                        height: '500px',
                        background: 'var(--limestone)',
                        border: '1px solid var(--soft-grey)',
                        marginBottom: 'var(--space-xl)',
                    }}>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            nodeTypes={nodeTypes}
                            fitView
                            proOptions={{ hideAttribution: true }}
                        >
                            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#D1D1D1" />
                            <Controls />
                            <MiniMap
                                nodeColor={(node) => node.data?.active ? '#2A2A2A' : '#E6E4DC'}
                                style={{ background: '#FAF9F6', border: '1px solid #D1D1D1' }}
                            />
                        </ReactFlow>
                    </div>

                    {/* Agent List */}
                    <div>
                        <span className="label">Registered Agents</span>
                        <div style={{ marginTop: 'var(--space-md)' }}>
                            {agents.map((agent, i) => (
                                <motion.div
                                    key={agent.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="accordion-item"
                                    style={{
                                        cursor: 'pointer',
                                        background: 'var(--warm-white)',
                                        border: '1px solid var(--soft-grey)',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        marginBottom: '12px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}
                                    onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        position: 'relative',
                                        zIndex: 1,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                marginTop: '8px',
                                                background: agent.status === 'active' ? 'var(--olive-drab)' : 'var(--burnt-clay)',
                                                boxShadow: agent.status === 'active' ? '0 0 8px var(--olive-drab)' : 'none'
                                            }} />
                                            <div>
                                                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 600 }}>{agent.id}</div>
                                                <div className="label" style={{ marginBottom: '8px' }}>{agent.role.toUpperCase()}</div>

                                                {/* Capabilities */}
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    {['api_query', 'tee_attestation', 'merkle_provenance', 'web_scraping']
                                                        .filter(c => Math.random() > 0.3) // Simulate varied capabilities for demo
                                                        .slice(0, 3)
                                                        .map(cap => (
                                                            <span key={cap} style={{
                                                                fontSize: '10px',
                                                                background: 'var(--limestone)',
                                                                border: '1px solid var(--soft-grey)',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                color: 'var(--graphite)'
                                                            }}>
                                                                {cap.replace('_', ' ')}
                                                            </span>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--mid-grey)', marginBottom: '4px' }}>
                                                {agent.address.substring(0, 6)}...{agent.address.substring(38)}
                                            </div>
                                            <div className="label" style={{ color: 'var(--olive-drab)' }}>Rep: {95 + (i * 2)}%</div>
                                            <div style={{ fontSize: '11px', color: 'var(--graphite)' }}>Staked: 100 USDC</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
            <AgentRegistrationModal isOpen={showRegistrationModal} onClose={() => setShowRegistrationModal(false)} />
        </div>
    );
}
