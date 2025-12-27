'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface QuestFormProps {
    onSubmit: (data: { objective: string; budget: number }) => void;
    disabled?: boolean;
}

export function QuestForm({ onSubmit, disabled }: QuestFormProps) {
    const [objective, setObjective] = useState('');
    const [budget, setBudget] = useState('10');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!objective.trim()) return;
        onSubmit({ objective, budget: parseFloat(budget) });
        setObjective('');
    };

    return (
        <form onSubmit={handleSubmit} style={{
            background: 'var(--warm-white)',
            border: '1px solid var(--soft-grey)',
            padding: 'var(--space-lg)',
            maxWidth: '600px',
            margin: '0 auto',
        }}>
            <span className="label">Deploy New Quest</span>

            <div style={{ marginTop: 'var(--space-md)' }}>
                <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontFamily: 'var(--font-serif)',
                    fontSize: '1rem',
                    color: 'var(--graphite)',
                }}>
                    Research Objective
                </label>
                <textarea
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Describe what you want the agent swarm to research..."
                    className="input"
                    style={{
                        minHeight: '120px',
                        resize: 'vertical',
                        fontFamily: 'var(--font-serif)',
                        fontSize: '1rem',
                    }}
                />
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 'var(--space-md)',
                marginTop: 'var(--space-md)',
                alignItems: 'end',
            }}>
                <div>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontFamily: 'var(--font-serif)',
                        fontSize: '1rem',
                        color: 'var(--graphite)',
                    }}>
                        Budget (USDC)
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="input"
                    />
                </div>

                <motion.button
                    type="submit"
                    disabled={disabled || !objective.trim()}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn btn-primary"
                    style={{
                        opacity: disabled || !objective.trim() ? 0.5 : 1,
                        cursor: disabled || !objective.trim() ? 'not-allowed' : 'pointer',
                    }}
                >
                    <span>{disabled ? 'Deploying...' : 'Deploy Quest'}</span>
                </motion.button>
            </div>
        </form>
    );
}

export default QuestForm;
