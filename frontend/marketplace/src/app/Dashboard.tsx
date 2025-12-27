'use client';

import { lazy, Suspense } from 'react';
import { useQuest } from '@/hooks/useQuest';
import QuestCard from '@/sections/QuestCard';
import { QuestForm } from '@/sections/QuestForm';

const MarketplaceTeaser = lazy(() => import('@/sections/MarketplaceTeaser'));

export default function Dashboard() {
    const { quests, createQuest, isLoading } = useQuest();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-emerald-900 text-white p-4 font-sans">
            <header className="mb-8 text-center pt-8">
                <h1 className="text-3xl md:text-5xl font-extrabold mb-2 tracking-tight">AetherSwarm</h1>
                <p className="text-slate-300 text-lg">Decentralized Knowledge Expedition Platform</p>
            </header>

            <main className="max-w-6xl mx-auto space-y-12">
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-center text-blue-200">Dispatch a New Swarm</h2>
                    <QuestForm onSubmit={createQuest} disabled={isLoading} />
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-6 border-b border-slate-700 pb-2">Active Expeditions</h2>
                    {quests.length === 0 ? (
                        <p className="text-center text-slate-500 italic">No active quests. Launch one above.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {quests.map((quest) => (
                                <QuestCard key={quest.id} quest={quest} />
                            ))}
                        </div>
                    )}
                </section>

                <Suspense fallback={<div className="text-center py-8">Loading Marketplace...</div>}>
                    <MarketplaceTeaser />
                </Suspense>
            </main>

            <footer className="mt-20 text-center text-sm text-slate-500 pb-8">
                <p>Powered by x402, EigenCloud & Polygon</p>
            </footer>
        </div>
    );
}
