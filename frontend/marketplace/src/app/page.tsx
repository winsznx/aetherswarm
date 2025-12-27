'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { useTheme } from '@/components/ThemeProvider';
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { USDC_ADDRESSES, ERC20_ABI } from '@/config/wagmi';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Types
interface Quest {
  questId: string;
  status: string;
  objectives: string;
  budget: string;
  walletAddress?: string;
  paymentTxHash?: string;
  explorerLinks?: {
    paymentTx: string | null;
    questWallet: string;
    discoveryRegistry: string;
  };
}

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

// Custom Agent Node
const AgentNode = ({ data }: { data: any }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    style={{
      padding: '20px 32px',
      background: data.active ? '#2A2A2A' : '#FAF9F6',
      color: data.active ? '#FAF9F6' : '#2A2A2A',
      border: '1px solid #2A2A2A',
      minWidth: '160px',
      fontFamily: 'var(--font-sans)',
    }}
  >
    <div style={{
      fontSize: '9px',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      opacity: 0.6,
      marginBottom: '6px',
      fontWeight: 500,
    }}>
      {data.role}
    </div>
    <div style={{
      fontFamily: 'var(--font-serif)',
      fontSize: '18px',
      fontWeight: 400,
    }}>
      {data.label}
    </div>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginTop: '10px',
      fontSize: '10px',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: data.status === 'active' ? '#6B705C' : '#B07D62',
      }} />
      {data.status}
    </div>
  </motion.div>
);

const nodeTypes = { agent: AgentNode };

const initialNodes: Node[] = [
  {
    id: 'coordinator',
    type: 'agent',
    position: { x: 350, y: 50 },
    data: { label: 'Orchestrator', role: 'Coordinator', active: true, status: 'active' },
  },
  {
    id: 'scout',
    type: 'agent',
    position: { x: 100, y: 200 },
    data: { label: 'Scout', role: 'Discovery', active: false, status: 'pending' },
  },
  {
    id: 'verifier',
    type: 'agent',
    position: { x: 350, y: 200 },
    data: { label: 'Verifier', role: 'TEE Attestation', active: true, status: 'active' },
  },
  {
    id: 'synthesizer',
    type: 'agent',
    position: { x: 600, y: 200 },
    data: { label: 'Synthesizer', role: 'Aggregation', active: false, status: 'pending' },
  },
  {
    id: 'questpool',
    type: 'agent',
    position: { x: 350, y: 350 },
    data: { label: 'Quest Pool', role: 'Smart Contract', active: true, status: 'active' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'coordinator', target: 'scout', animated: true, style: { stroke: '#2A2A2A' } },
  { id: 'e2', source: 'coordinator', target: 'verifier', animated: true, style: { stroke: '#2A2A2A' } },
  { id: 'e3', source: 'coordinator', target: 'synthesizer', animated: true, style: { stroke: '#2A2A2A' } },
  { id: 'e4', source: 'scout', target: 'questpool', style: { stroke: '#2A2A2A' } },
  { id: 'e5', source: 'verifier', target: 'questpool', style: { stroke: '#2A2A2A' } },
  { id: 'e6', source: 'synthesizer', target: 'questpool', style: { stroke: '#2A2A2A' } },
];

// Magnetic Button Component
const MagneticButton = ({ children, onClick, className = '', style = {}, disabled = false }: { children: React.ReactNode; onClick?: () => void; className?: string; style?: React.CSSProperties; disabled?: boolean }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || disabled) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.3);
    y.set((e.clientY - centerY) * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onClick={disabled ? undefined : onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY, ...style, cursor: disabled ? 'not-allowed' : 'pointer' }}
      className={className}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
};

// Time Display Component
const TimeDisplay = () => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span className="time-display">London: {time}</span>;
};

export default function Home() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [newQuest, setNewQuest] = useState({ objectives: '', budget: '10.00' });
  const [isCreating, setIsCreating] = useState(false);
  const [heroRevealed, setHeroRevealed] = useState(false);
  const [activeService, setActiveService] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Wallet connection via Reown
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  // USDC Payment
  const [paymentStep, setPaymentStep] = useState<'idle' | 'approving' | 'paying' | 'creating' | 'done'>('idle');
  const { writeContract, data: txHash, error: txError, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Platform treasury address (receives USDC)
  const TREASURY_ADDRESS = '0xFc2b2e43342a65F0911D4A602Cef650fa84245bA';

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroScale = useTransform(scrollYProgress, [0, 0.1], [1, 1.5]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const philosophyFill = useTransform(scrollYProgress, [0.1, 0.25], [0, 100]);

  useEffect(() => {
    setTimeout(() => setHeroRevealed(true), 500);
  }, []);

  // Fetch health data
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8081/health');
      const data = await res.json();
      setHealth(data);

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === 'scout') {
            return { ...node, data: { ...node.data, active: data.agentBreakdown.scouts > 0, status: data.agentBreakdown.scouts > 0 ? 'active' : 'pending' } };
          }
          if (node.id === 'verifier') {
            return { ...node, data: { ...node.data, active: data.agentBreakdown.verifiers > 0, status: data.agentBreakdown.verifiers > 0 ? 'active' : 'pending' } };
          }
          if (node.id === 'synthesizer') {
            return { ...node, data: { ...node.data, active: data.agentBreakdown.synthesizers > 0, status: data.agentBreakdown.synthesizers > 0 ? 'active' : 'pending' } };
          }
          return node;
        })
      );
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }, [setNodes]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // Handle USDC payment and quest creation
  const createQuest = async () => {
    if (!newQuest.objectives.trim()) return;

    // Check wallet connection
    if (!isConnected || !address) {
      open(); // Open wallet connect modal
      return;
    }

    const currentChainId = chainId as number;
    const usdcAddress = USDC_ADDRESSES[currentChainId];

    if (!usdcAddress) {
      alert('Please switch to Polygon Amoy or Polygon Mainnet for USDC payments');
      return;
    }

    setIsCreating(true);
    setPaymentStep('paying');

    try {
      // Convert budget to USDC amount (6 decimals)
      const amount = parseUnits(newQuest.budget, 6);

      // Transfer USDC to treasury
      writeContract({
        address: usdcAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [TREASURY_ADDRESS as `0x${string}`, amount],
      });

    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentStep('idle');
      setIsCreating(false);
    }
  };

  // Watch for transaction confirmation and create quest
  useEffect(() => {
    if (isConfirmed && paymentStep === 'paying') {
      setPaymentStep('creating');

      // Create quest after payment confirmed
      const createQuestAfterPayment = async () => {
        try {
          const res = await fetch('http://localhost:3001/quests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              objectives: newQuest.objectives,
              budget: newQuest.budget,
              userId: address,
              paymentTxHash: txHash,
            }),
          });
          const data = await res.json();
          if (data.questId) {
            setQuests((prev) => [{ ...data, objectives: newQuest.objectives }, ...prev]);
            setNewQuest({ objectives: '', budget: '10.00' });
            setPaymentStep('done');
            setTimeout(() => setPaymentStep('idle'), 3000);
          }
        } catch (error) {
          console.error('Quest creation failed:', error);
        } finally {
          setIsCreating(false);
        }
      };

      createQuestAfterPayment();
    }
  }, [isConfirmed, paymentStep, newQuest, address, txHash]);

  // Handle transaction errors
  useEffect(() => {
    if (txError) {
      console.error('Transaction error:', txError);
      setPaymentStep('idle');
      setIsCreating(false);
    }
  }, [txError]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const services = [
    { title: 'Discovery', desc: 'Scout agents hunt and pay for data using x402 micropayments' },
    { title: 'Verification', desc: 'TEE-backed attestation ensures data integrity via EigenCloud' },
    { title: 'Synthesis', desc: 'AI agents create knowledge artifacts with cryptographic provenance' },
  ];

  return (
    <div ref={containerRef} style={{ background: 'var(--alabaster)' }}>
      {/* Navigation */}
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
        <a href="/" style={{ textDecoration: 'none', color: 'var(--graphite)', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1rem, 4vw, 1.25rem)', letterSpacing: '-0.02em' }}>
            AETHER<span style={{ fontStyle: 'italic' }}>SWARM</span>
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav className="desktop-nav" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a href="/" className="label" style={{ textDecoration: 'none', color: 'var(--graphite)' }}>Home</a>
          <a href="/agents" className="label" style={{ textDecoration: 'none' }}>Agents</a>
          <a href="/quests" className="label" style={{ textDecoration: 'none' }}>Quests</a>
          <a href="/settings" className="label" style={{ textDecoration: 'none' }}>Settings</a>
          <button
            onClick={() => open()}
            style={{
              background: isConnected ? 'var(--olive-drab)' : 'var(--graphite)',
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
            {isConnected
              ? `${address?.slice(0, 6)}...${address?.slice(-4)}`
              : 'Connect Wallet'
            }
          </button>
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: '1px solid var(--soft-grey)',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              color: 'var(--graphite)',
              fontFamily: 'var(--font-sans)',
            }}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻'}
          </button>
        </nav>

        {/* Mobile Navigation */}
        <nav className="mobile-nav" style={{ display: 'none', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: '1px solid var(--soft-grey)',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'var(--graphite)',
            }}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻'}
          </button>
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
              fontFamily: 'var(--font-sans)',
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
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 200,
              }}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: '280px',
                background: 'var(--alabaster)',
                zIndex: 201,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  alignSelf: 'flex-end',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--graphite)',
                  marginBottom: '32px',
                }}
              >
                ✕
              </button>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[{ href: '/', label: 'Home' }, { href: '/agents', label: 'Agents' }, { href: '/quests', label: 'Quests' }, { href: '/settings', label: 'Settings' }].map(link => (
                  <a key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.5rem',
                    textDecoration: 'none',
                    color: 'var(--graphite)',
                    padding: '12px 0',
                    borderBottom: '1px solid var(--soft-grey)',
                  }}>
                    {link.label}
                  </a>
                ))}
              </nav>
              <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
                <span className="label">Decentralized Knowledge</span>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginTop: '8px' }}>
                  AETHER<span style={{ fontStyle: 'italic' }}>SWARM</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="hero-section" style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Curtain Reveal */}
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: heroRevealed ? 0 : 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--alabaster)',
            transformOrigin: 'right',
            zIndex: 20,
          }}
        />

        <motion.div style={{ scale: heroScale, opacity: heroOpacity }}>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.8 }}
            style={{
              textAlign: 'center',
              letterSpacing: '-0.04em',
              color: 'var(--graphite)',
            }}
          >
            AETHER<span style={{ fontStyle: 'italic' }}>SWARM</span>
          </motion.h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="label"
          style={{
            marginTop: 'var(--space-md)',
            textAlign: 'center',
            maxWidth: '500px',
            lineHeight: 1.6,
          }}
        >
          Decentralized Knowledge Expedition Platform
        </motion.p>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          style={{
            position: 'absolute',
            bottom: 'var(--space-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-xs)',
          }}
        >
          <span className="label">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              width: '1px',
              height: '40px',
              background: 'var(--graphite)',
            }}
          />
        </motion.div>
      </section>

      {/* Philosophy Section */}
      <section style={{
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        padding: '64px 16px',
      }}>
        <div className="container">
          <motion.h2
            style={{
              maxWidth: '900px',
              lineHeight: 1.2,
              fontSize: 'clamp(1.5rem, 5vw, 3rem)',
            }}
          >
            Deploy research <span style={{ fontStyle: 'italic' }}>quests</span>. Let AI agents hunt, verify, and synthesize knowledge with <span style={{ fontStyle: 'italic' }}>cryptographic proof</span>.
          </motion.h2>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '80px 0', background: 'var(--limestone)' }}>
        <div className="container">
          <span className="label">Process</span>
          <h2 style={{ marginTop: '8px', marginBottom: '48px' }}>
            How It <span style={{ fontStyle: 'italic' }}>Works</span>
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            {[
              { step: '01', title: 'Deploy Quest', desc: 'Define your research objective and set a USDC budget. Your quest is broadcast to the agent network.' },
              { step: '02', title: 'Agent Discovery', desc: 'Scout agents hunt for data using x402 micropayments. Verifiers attest authenticity via TEE.' },
              { step: '03', title: 'Knowledge Synthesis', desc: 'Synthesizer agents aggregate findings into actionable insights with ERC-8004 provenance tracking.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                style={{
                  padding: '32px',
                  background: 'var(--warm-white)',
                  border: '1px solid var(--soft-grey)',
                }}
              >
                <div style={{ fontSize: '3rem', fontFamily: 'var(--font-serif)', color: 'var(--soft-grey)', marginBottom: '16px' }}>
                  {item.step}
                </div>
                <h3 style={{ marginBottom: '12px' }}>{item.title}</h3>
                <p style={{ color: 'var(--mid-grey)', lineHeight: 1.6, fontSize: '14px' }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Types */}
      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <span className="label">The Swarm</span>
          <h2 style={{ marginTop: '8px', marginBottom: '48px' }}>
            Agent <span style={{ fontStyle: 'italic' }}>Network</span>
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
          }}>
            {[
              { icon: '🔍', title: 'Scout Agents', role: 'Discovery', desc: 'Autonomous searchers that traverse data sources, APIs, and web content. Pay for premium data using x402 machine-to-machine micropayments.', status: 'Python-based' },
              { icon: '✓', title: 'Verifier Agents', role: 'Attestation', desc: 'TEE-backed verification nodes running on EigenCloud. Provide cryptographic proof that data hasn\'t been tampered with.', status: 'Rust-based' },
              { icon: '◇', title: 'Synthesizer Agents', role: 'Knowledge Creation', desc: 'AI-powered aggregators that combine verified data into structured knowledge artifacts with full provenance tracking.', status: 'Coming Soon' },
            ].map((agent, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                style={{
                  padding: '32px',
                  background: 'var(--graphite)',
                  color: 'var(--warm-white)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '16px' }}>{agent.icon}</div>
                <div className="label" style={{ marginBottom: '8px', opacity: 0.7 }}>{agent.role}</div>
                <h3 style={{ color: 'var(--warm-white)', marginBottom: '16px' }}>{agent.title}</h3>
                <p style={{ opacity: 0.8, lineHeight: 1.6, fontSize: '14px', marginBottom: '16px' }}>{agent.desc}</p>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5 }}>{agent.status}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section style={{ padding: '80px 0', background: 'var(--limestone)' }}>
        <div className="container">
          <span className="label">Applications</span>
          <h2 style={{ marginTop: '8px', marginBottom: '48px' }}>
            Use <span style={{ fontStyle: 'italic' }}>Cases</span>
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
          }}>
            {[
              { title: 'Market Research', desc: 'Autonomous competitive intelligence gathering with verified sources' },
              { title: 'Academic Research', desc: 'Literature review and citation verification at scale' },
              { title: 'Due Diligence', desc: 'Company and protocol analysis with cryptographic attestation' },
              { title: 'Trend Analysis', desc: 'Real-time synthesis of emerging topics across data sources' },
              { title: 'Fact Checking', desc: 'Multi-source verification with provenance tracking' },
              { title: 'Knowledge Graphs', desc: 'Automated entity extraction and relationship mapping' },
            ].map((useCase, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                style={{
                  padding: '24px',
                  background: 'var(--warm-white)',
                  border: '1px solid var(--soft-grey)',
                }}
              >
                <h4 style={{ fontFamily: 'var(--font-serif)', marginBottom: '8px' }}>{useCase.title}</h4>
                <p style={{ fontSize: '13px', color: 'var(--mid-grey)', lineHeight: 1.5 }}>{useCase.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <span className="label">Infrastructure</span>
          <h2 style={{ marginTop: '8px', marginBottom: '48px' }}>
            Built <span style={{ fontStyle: 'italic' }}>On</span>
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
          }}>
            {[
              { name: 'x402', desc: 'HTTP 402 micropayments for machine-to-machine transactions', link: 'Payment Protocol' },
              { name: 'EigenCloud', desc: 'Trusted Execution Environment for verifiable computation', link: 'TEE Provider' },
              { name: 'ERC-8004', desc: 'On-chain provenance tracking for knowledge artifacts', link: 'Token Standard' },
              { name: 'Polygon', desc: 'Fast, low-cost transactions on Amoy testnet', link: 'Network' },
            ].map((tech, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                style={{
                  padding: '24px',
                  borderLeft: '2px solid var(--graphite)',
                }}
              >
                <div className="label" style={{ marginBottom: '8px' }}>{tech.link}</div>
                <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '8px' }}>{tech.name}</h4>
                <p style={{ fontSize: '13px', color: 'var(--mid-grey)', lineHeight: 1.5 }}>{tech.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '80px 0', background: 'var(--graphite)', color: 'var(--warm-white)' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '32px',
            textAlign: 'center',
          }}>
            {[
              { value: '3', label: 'Agent Types' },
              { value: '402', label: 'Protocol' },
              { value: 'TEE', label: 'Secured' },
              { value: '∞', label: 'Quests' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div style={{ fontSize: 'clamp(2rem, 8vw, 4rem)', fontFamily: 'var(--font-serif)' }}>{stat.value}</div>
                <div className="label" style={{ marginTop: '8px', opacity: 0.7 }}>{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Dashboard */}
      <section style={{
        minHeight: 'auto',
        padding: 'var(--space-lg) 0',
      }}>
        <div className="container">
          <div className="dashboard-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
          }}>
            {/* Swarm Visualization - Hidden on mobile */}
            <div className="react-flow-container" style={{
              background: 'var(--limestone)',
              border: '1px solid var(--soft-grey)',
              position: 'relative',
              minHeight: '400px',
            }}>
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                zIndex: 10,
              }}>
                <span className="label">Live Network</span>
                <h3 style={{ marginTop: '8px' }}>Swarm Topology</h3>
              </div>

              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                style={{ background: 'transparent' }}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={24}
                  size={1}
                  color="#D1D1D1"
                />
                <Controls />
                <MiniMap
                  nodeColor={(node) => node.data?.active ? '#2A2A2A' : '#E6E4DC'}
                  style={{ background: '#FAF9F6', border: '1px solid #D1D1D1' }}
                />
              </ReactFlow>
            </div>

            {/* Mobile Agent Status - Shown only on mobile */}
            <div className="mobile-agent-list" style={{ display: 'none' }}>
              <div style={{
                background: 'var(--limestone)',
                border: '1px solid var(--soft-grey)',
                padding: '16px',
              }}>
                <span className="label">Network Status</span>
                <h3 style={{ marginTop: '8px', marginBottom: '16px' }}>Active Agents</h3>
                {['Coordinator', 'Scout', 'Verifier', 'Synthesizer'].map((agent, i) => (
                  <div key={agent} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: i < 3 ? '1px solid var(--soft-grey)' : 'none',
                  }}>
                    <span style={{ fontFamily: 'var(--font-serif)' }}>{agent}</span>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                    }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: i === 0 || i === 2 ? 'var(--olive-drab)' : 'var(--burnt-clay)',
                      }} />
                      {i === 0 || i === 2 ? 'Active' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Control Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Status */}
              <div style={{
                background: 'var(--warm-white)',
                border: '1px solid var(--soft-grey)',
                padding: '16px',
              }}>
                <span className="label">System Status</span>
                <div className="stats-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                  marginTop: '12px',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="stat-number" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontFamily: 'var(--font-serif)' }}>
                      {health?.connectedAgents || 0}
                    </div>
                    <div className="label">Agents</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="stat-number" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontFamily: 'var(--font-serif)' }}>
                      {health?.activeQuests || 0}
                    </div>
                    <div className="label">Active</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className="stat-number" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontFamily: 'var(--font-serif)', color: 'var(--olive-drab)' }}>
                      ●
                    </div>
                    <div className="label">Online</div>
                  </div>
                </div>
              </div>

              {/* Create Quest */}
              <div style={{
                background: 'var(--warm-white)',
                border: '1px solid var(--soft-grey)',
                padding: 'var(--space-md)',
                flex: 1,
              }}>
                <span className="label">Deploy Quest</span>
                <div style={{ marginTop: 'var(--space-sm)' }}>
                  <textarea
                    className="input"
                    placeholder="Describe your research objective..."
                    value={newQuest.objectives}
                    onChange={(e) => setNewQuest({ ...newQuest, objectives: e.target.value })}
                    style={{
                      minHeight: '120px',
                      resize: 'vertical',
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1rem',
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    gap: 'var(--space-sm)',
                    marginTop: 'var(--space-sm)',
                    alignItems: 'flex-end',
                  }}>
                    <div style={{ flex: 1 }}>
                      <span className="label" style={{ display: 'block', marginBottom: '6px' }}>
                        Budget (USDC)
                      </span>
                      <input
                        type="text"
                        className="input"
                        value={newQuest.budget}
                        onChange={(e) => setNewQuest({ ...newQuest, budget: e.target.value })}
                      />
                    </div>
                    <MagneticButton
                      onClick={createQuest}
                      className="btn btn-primary"
                      disabled={isCreating || isPending || isConfirming}
                      style={{
                        opacity: (isCreating || isPending || isConfirming) ? 0.7 : 1,
                        background: paymentStep === 'done' ? 'var(--olive-drab)' : undefined,
                      }}
                    >
                      <span>
                        {!isConnected
                          ? 'Connect Wallet'
                          : paymentStep === 'paying'
                            ? 'Confirming Payment...'
                            : paymentStep === 'creating'
                              ? 'Creating Quest...'
                              : paymentStep === 'done'
                                ? '✓ Quest Created!'
                                : isPending
                                  ? 'Sign Transaction...'
                                  : isConfirming
                                    ? 'Confirming...'
                                    : 'Deploy Quest'
                        }
                      </span>
                    </MagneticButton>
                  </div>
                </div>
              </div>

              {/* Recent Quests */}
              <div style={{
                background: 'var(--warm-white)',
                border: '1px solid var(--soft-grey)',
                padding: 'var(--space-md)',
                maxHeight: '300px',
                overflow: 'auto',
              }}>
                <span className="label">Recent Quests</span>
                <AnimatePresence mode="popLayout">
                  {quests.length === 0 ? (
                    <p style={{
                      color: 'var(--mid-grey)',
                      marginTop: 'var(--space-sm)',
                      fontStyle: 'italic',
                      fontSize: '14px',
                    }}>
                      No quests deployed yet.
                    </p>
                  ) : (
                    quests.map((quest, i) => (
                      <motion.div
                        key={quest.questId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                          padding: 'var(--space-sm)',
                          borderBottom: '1px solid var(--soft-grey)',
                          marginTop: 'var(--space-sm)',
                        }}
                      >
                        <div style={{ fontSize: '10px', color: 'var(--mid-grey)', fontFamily: 'monospace' }}>
                          {quest.questId.slice(0, 24)}...
                        </div>
                        <p style={{ fontSize: '14px', marginTop: '4px' }}>
                          {quest.objectives?.slice(0, 60)}...
                        </p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '9px',
                            padding: '4px 10px',
                            background: quest.status === 'queued' ? '#F2F0E9' : '#E6E4DC',
                            border: '1px solid var(--soft-grey)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                          }}>
                            {quest.status}
                          </span>
                          {quest.explorerLinks?.paymentTx && (
                            <a
                              href={quest.explorerLinks.paymentTx}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '9px',
                                padding: '4px 10px',
                                background: 'var(--olive-drab)',
                                color: 'var(--warm-white)',
                                textDecoration: 'none',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                              }}
                            >
                              ↗ View Tx
                            </a>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Accordion */}
      <section style={{ padding: 'var(--space-xl) 0' }}>
        <div className="container">
          <span className="label">Capabilities</span>
          <div style={{ marginTop: 'var(--space-md)' }}>
            {services.map((service, i) => (
              <motion.div
                key={i}
                className="accordion-item"
                onMouseEnter={() => setActiveService(i)}
                onMouseLeave={() => setActiveService(null)}
              >
                <div className="accordion-title">
                  <h3>{service.title}</h3>
                  <span style={{ fontSize: '24px' }}>→</span>
                </div>
                <AnimatePresence>
                  {activeService === i && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        marginTop: 'var(--space-sm)',
                        color: 'var(--mid-grey)',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {service.desc}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-dark" style={{ padding: '48px 0 32px' }}>
        <div className="container">
          <MagneticButton className="btn btn-liquid" style={{
            width: '100%',
            padding: '24px',
            background: 'transparent',
            border: '1px solid var(--alabaster)',
            color: 'var(--alabaster)',
            fontSize: 'clamp(0.875rem, 3vw, 1rem)',
          }}>
            <span style={{ position: 'relative', zIndex: 1 }}>Let's Build Together →</span>
          </MagneticButton>

          <div className="footer-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '16px',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div>
              <span className="label">Protocol</span>
              <div style={{ marginTop: '4px' }}>x402</div>
            </div>
            <div>
              <span className="label">Standard</span>
              <div style={{ marginTop: '4px' }}>ERC-8004</div>
            </div>
            <div>
              <span className="label">Network</span>
              <div style={{ marginTop: '4px' }}>Polygon</div>
            </div>
            <div className="desktop-nav">
              <TimeDisplay />
            </div>
          </div>

          <div style={{
            marginTop: '24px',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--mid-grey)' }}>
              © 2024 AetherSwarm
            </span>
            <div style={{ display: 'flex', gap: '16px' }}>
              {['GitHub', 'Discord', 'Twitter'].map((link) => (
                <a key={link} href="#" style={{
                  fontSize: '11px',
                  color: 'var(--mid-grey)',
                  textDecoration: 'none',
                }}>
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
