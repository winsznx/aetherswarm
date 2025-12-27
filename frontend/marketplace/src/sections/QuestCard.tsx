'use client';

import { motion } from 'framer-motion';
import { Quest } from '@/types';

interface QuestCardProps {
    quest: Quest;
}

export default function QuestCard({ quest }: QuestCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
                padding: 'var(--space-md)',
                background: 'var(--warm-white)',
                border: '1px solid var(--soft-grey)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
            }}
        >
            {/* Hover overlay */}
            <motion.div
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'var(--limestone)',
                    transformOrigin: 'left',
                    zIndex: 0,
                }}
            />

            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px',
                }}>
                    <span className="label" style={{ fontFamily: 'monospace', fontSize: '10px' }}>
                        {quest.id?.slice(0, 20)}...
                    </span>
                    <span style={{
                        padding: '4px 12px',
                        background: 'var(--alabaster)',
                        border: '1px solid var(--soft-grey)',
                        fontSize: '10px',
                        fontWeight: 500,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                    }}>
                        ${quest.budget}
                    </span>
                </div>

                {/* Objective */}
                <h4 style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1.25rem',
                    lineHeight: 1.3,
                    marginBottom: '16px',
                    color: 'var(--graphite)',
                }}>
                    {quest.objectives?.[0]?.slice(0, 80) || 'No objective specified'}...
                </h4>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--soft-grey)',
                }}>
                    <span style={{ fontSize: '11px', color: 'var(--mid-grey)', fontFamily: 'monospace' }}>
                        {quest.walletAddress?.slice(0, 8)}...{quest.walletAddress?.slice(-6)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'var(--olive-drab)',
                        }} />
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Active
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
