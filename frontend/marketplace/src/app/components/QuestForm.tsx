'use client';

import { useState } from 'react';

export default function QuestForm() {
    const [objectives, setObjectives] = useState('');
    const [budget, setBudget] = useState('10');
    const [status, setStatus] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('Submitting...');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_QUEST_ENGINE_URL}/quests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    objectives: objectives.split('\n'),
                    constraints: [],
                    budget: Number(budget)
                })
            });

            const data = await res.json();
            if (res.ok) {
                setStatus(`Quest created! ID: ${data.questId} | Wallet: ${data.walletAddress}`);
            } else {
                setStatus(`Error: ${data.error}`);
            }
        } catch (err: any) {
            setStatus(`Failed: ${err.message}`);
        }
    };

    return (
        <div className="p-6 border rounded-lg bg-gray-50 max-w-lg mx-auto mt-10">
            <h2 className="text-2xl font-bold mb-4">Start New Quest</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block font-medium mb-1">Objectives (one per line)</label>
                    <textarea
                        className="w-full p-2 border rounded"
                        rows={4}
                        value={objectives}
                        onChange={(e) => setObjectives(e.target.value)}
                        placeholder="e.g. Find latest research on metabolic pathways..."
                        required
                    />
                </div>
                <div>
                    <label className="block font-medium mb-1">Budget (USDC)</label>
                    <input
                        type="number"
                        className="w-full p-2 border rounded"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                >
                    Dispatch Swarm
                </button>
            </form>
            {status && (
                <div className="mt-4 p-4 bg-white border rounded text-center">
                    {status}
                </div>
            )}
        </div>
    );
}
