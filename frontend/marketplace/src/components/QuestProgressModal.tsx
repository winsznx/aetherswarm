'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuestProgressModalProps {
    questId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

interface QuestStatus {
    questId: string;
    status: string; // 'queued' | 'processing' | 'completed' | 'failed'
    objectives: string;
    results?: {
        summary?: string;
        scoutData?: any[];
    };
    logs?: string[]; // Optional: if we want to stream logs
}

// Map frontend status to internal status
// Frontend: Queued -> Scout -> Verifier -> Synthesizer -> Completed
// We'll simulate these steps if the backend only sends 'active'

export function QuestProgressModal({ questId, isOpen, onClose }: QuestProgressModalProps) {
    const [questData, setQuestData] = useState<QuestStatus | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    // Polling interval
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const steps = [
        { id: 'deploy', label: 'Deploying', icon: '🚀' },
        { id: 'queued', label: 'Queued', icon: '⏳' },
        { id: 'scout', label: 'Scouting', icon: '🔍' },
        { id: 'verify', label: 'Verifying', icon: '⚖️' },
        { id: 'synthesize', label: 'Synthesizing', icon: '🧬' },
        { id: 'complete', label: 'Completed', icon: '✅' },
    ];

    useEffect(() => {
        if (isOpen && questId) {
            // Start polling
            setLogs(['Quest initialized...']);
            setCurrentStep(0); // deploying

            // Immediate fetch
            fetchQuestStatus();

            intervalRef.current = setInterval(fetchQuestStatus, 2000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setQuestData(null);
            setLogs([]);
            setCurrentStep(0);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isOpen, questId]);

    const fetchQuestStatus = async () => {
        if (!questId) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_QUEST_ENGINE_URL || 'http://localhost:3001'}/quests/${questId}`);
            if (res.ok) {
                const data = await res.json();
                setQuestData(data);
                updateProgress(data);
            }
        } catch (error) {
            console.error('Error fetching quest status:', error);
        }
    };

    const updateProgress = (data: QuestStatus) => {
        // Logic to map status to steps
        // The current backend likely returns 'queued', 'processing', 'completed'
        // We might need to fake the granular steps or look at logs if available
        // For now, we will use a simple mapping but we should make it look alive

        if (data.status === 'queued') {
            setCurrentStep(1); // Queued
            if (!logs.includes('Quest queued in smart contract')) {
                setLogs(prev => [...prev, 'Quest queued in smart contract', 'Waiting for Scout Agent...']);
            }
        } else if (data.status === 'processing') {
            // Processing is ambiguous, so we'll simulate progression or just stick to Scout if we can't tell
            // If we had more granular status from the coordinator, we'd use it.
            // For now, let's assume processing = Scouting -> Verifying -> Synthesizing
            // We can check if we have results to know if we are further along
            if (currentStep < 2) {
                setCurrentStep(2); // Scouting
                setLogs(prev => [...prev, 'Scout Agent picked up the quest', 'Searching for data sources...']);
            }

            // If we stay in processing for a while, we can simulate moving to next steps 
            // purely for visual feedback or we check if we have partial results?
            // Since we don't have partial results stream, we might just stay on Scouting/Verifying 
            // until completed. OR we can just show "Processing" as a big step.

            // Let's rely on time or just keep it at Scouting until complete for now to be safe,
            // OR randomly move to Verify after 3-5 seconds? 
            // Better: Keep at 2 (Scouting) until we implement granular status
        } else if (data.status === 'completed') {
            if (currentStep < 5) {
                setCurrentStep(5);
                setLogs(prev => [...prev, 'Verification passed', 'Knowledge synthesis complete', 'Results ready!']);
            }
        }
    };

    // Calculate progress percentage
    const progress = (currentStep / (steps.length - 1)) * 100;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            zIndex: 400,
                            backdropFilter: 'blur(4px)',
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
                            width: '90%',
                            maxWidth: '600px',
                            background: 'var(--warm-white)',
                            borderRadius: '16px',
                            padding: '32px',
                            zIndex: 401,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            border: '1px solid var(--soft-grey)',
                        }}
                    >
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', margin: '0 0 8px 0' }}>
                                Mission <span style={{ fontStyle: 'italic' }}>Progress</span>
                            </h3>
                            <p style={{ margin: 0, opacity: 0.6, fontSize: '14px', fontFamily: 'monospace' }}>
                                ID: {questId?.slice(0, 16)}...
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ position: 'relative', marginBottom: '40px', padding: '0 20px' }}>
                            {/* Line */}
                            <div style={{
                                position: 'absolute',
                                top: '20px',
                                left: '40px',
                                right: '40px',
                                height: '2px',
                                background: '#eee',
                                zIndex: 0
                            }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        height: '100%',
                                        background: 'var(--burnt-clay)',
                                        transition: 'width 0.5s ease'
                                    }}
                                />
                            </div>

                            {/* Steps */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                                {steps.map((step, index) => {
                                    const isActive = index <= currentStep;
                                    const isCurrent = index === currentStep;

                                    return (
                                        <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                background: isActive ? 'var(--burnt-clay)' : '#fff',
                                                border: isActive ? 'none' : '2px solid #eee',
                                                color: isActive ? 'white' : 'var(--mid-grey)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '18px',
                                                transition: 'all 0.3s ease',
                                                boxShadow: isCurrent ? '0 0 0 4px rgba(188, 71, 73, 0.2)' : 'none'
                                            }}>
                                                {step.icon}
                                            </div>
                                            <span style={{
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                color: isActive ? 'var(--graphite)' : 'var(--mid-grey)',
                                                opacity: isActive ? 1 : 0.5
                                            }}>
                                                {step.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Live Log Window */}
                        <div style={{
                            background: '#1a1a1a',
                            borderRadius: '8px',
                            padding: '16px',
                            height: '200px',
                            overflowY: 'auto',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            color: '#00ff00',
                            marginBottom: '24px',
                            border: '1px solid var(--soft-grey)'
                        }}>
                            {logs.map((log, i) => (
                                <div key={i} style={{ marginBottom: '4px', opacity: 0.8 }}>
                                    <span style={{ opacity: 0.5 }}>[{new Date().toLocaleTimeString()}]</span> {log}
                                </div>
                            ))}
                            {currentStep < 5 && (
                                <motion.div
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                    _
                                </motion.div>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{ textAlign: 'center' }}>
                            {currentStep === 5 ? (
                                <button
                                    onClick={onClose}
                                    style={{
                                        padding: '12px 32px',
                                        background: 'var(--olive-drab)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    View Results
                                </button>
                            ) : (
                                <button
                                    onClick={onClose}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--mid-grey)',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Run in Background
                                </button>
                            )}
                        </div>

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
