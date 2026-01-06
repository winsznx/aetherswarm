'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuestDetailsModalProps {
    quest: any;
    isOpen: boolean;
    onClose: () => void;
}

export function QuestDetailsModal({ quest, isOpen, onClose }: QuestDetailsModalProps) {
    if (!quest) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 999,
                            backdropFilter: 'blur(4px)'
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
                            // transform is handled by motion props
                            background: 'var(--warm-white)',
                            color: 'var(--graphite)',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '700px',
                            width: '90%',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            zIndex: 1000,
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--soft-grey)'
                        }}
                    >
                        {/* Header */}
                        <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--soft-grey)', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
                                        Quest Details
                                    </h2>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.6, fontFamily: 'monospace' }}>
                                        {quest.questId}
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '24px',
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                        opacity: 0.6,
                                        color: 'var(--graphite)'
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div style={{ marginBottom: '24px' }}>
                            <span style={{
                                display: 'inline-block',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: quest.status === 'completed' ? '#effbe9' :
                                    quest.status === 'processing' ? '#fff8e6' : '#eaf6ff',
                                color: quest.status === 'completed' ? '#2e7d32' :
                                    quest.status === 'processing' ? '#f57c00' : '#1976d2',
                                border: '1px solid currentColor',
                                opacity: 0.9
                            }}>
                                {quest.status.toUpperCase()}
                            </span>
                        </div>

                        {/* Objectives */}
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', fontFamily: 'var(--font-serif)' }}>
                                Objectives
                            </h3>
                            <p style={{ fontSize: '15px', lineHeight: 1.6, opacity: 0.8, margin: 0 }}>
                                {quest.objectives}
                            </p>
                        </div>

                        {/* Info Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '16px',
                            marginBottom: '24px'
                        }}>
                            <div>
                                <p style={{ fontSize: '13px', opacity: 0.6, margin: '0 0 4px 0' }}>Budget</p>
                                <p style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>${quest.budget}</p>
                            </div>

                            <div>
                                <p style={{ fontSize: '13px', opacity: 0.6, margin: '0 0 4px 0' }}>Created</p>
                                <p style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                                    {quest.createdAt ? new Date(quest.createdAt).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>

                            {quest.walletAddress && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <p style={{ fontSize: '13px', opacity: 0.6, margin: '0 0 4px 0' }}>Quest Wallet</p>
                                    <p style={{
                                        fontSize: '14px',
                                        fontFamily: 'monospace',
                                        margin: 0,
                                        wordBreak: 'break-all'
                                    }}>
                                        {quest.walletAddress}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Results Section */}
                        {quest.results && (
                            <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--alabaster)', borderRadius: '8px', border: '1px solid var(--soft-grey)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', fontFamily: 'var(--font-serif)' }}>
                                    Results
                                </h3>

                                {quest.results.summary && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <p style={{ fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                                            {quest.results.summary}
                                        </p>
                                    </div>
                                )}

                                {quest.results.scoutData && quest.results.scoutData.length > 0 && (
                                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--soft-grey)', paddingTop: '16px' }}>
                                        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>📚</span> Cited Sources
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {quest.results.scoutData.flatMap((op: any) => {
                                                // Handle aggregated results (e.g. HackerNews, Tavily)
                                                if (op.data && Array.isArray(op.data.results)) {
                                                    return op.data.results.map((r: any) => ({
                                                        title: r.title,
                                                        url: r.url
                                                    }));
                                                }
                                                // Handle citations (sometimes distinct in premium results)
                                                if (op.data && Array.isArray(op.data.citations)) {
                                                    return op.data.citations.map((c: any) => (typeof c === 'string' ? { title: c, url: c } : c));
                                                }
                                                // Default direct source
                                                return [{
                                                    title: op.title || op.source,
                                                    url: op.source
                                                }];
                                            })
                                                .filter((source: any) => source.url && source.url.startsWith('http'))
                                                .map((source: any, idx: number) => (
                                                    <a
                                                        key={idx}
                                                        href={source.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            padding: '8px 12px',
                                                            background: 'var(--warm-white)',
                                                            border: '1px solid var(--soft-grey)',
                                                            borderRadius: '6px',
                                                            textDecoration: 'none',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseOver={(e) => {
                                                            e.currentTarget.style.borderColor = 'var(--mid-grey)';
                                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                                        }}
                                                        onMouseOut={(e) => {
                                                            e.currentTarget.style.borderColor = 'var(--soft-grey)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '14px' }}>🔗</span>
                                                        <div style={{ overflow: 'hidden' }}>
                                                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--graphite)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {source.title || source.url}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: 'var(--mid-grey)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {source.url}
                                                            </div>
                                                        </div>
                                                    </a>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {quest.results.attestationTxHash && (
                                    <div style={{ marginTop: '12px' }}>
                                        <a
                                            href={quest.results.attestationExplorerLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ fontSize: '13px', color: 'var(--burnt-clay)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            View Attestation <span>→</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* x402 Payment & NFT Section */}
                        {quest.results && (
                            <div style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>

                                {/* Knowledge NFT */}
                                {quest.results.nftTokenId && (
                                    <div style={{ padding: '16px', background: 'var(--warm-white)', border: '1px solid var(--olive-drab)', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '18px' }}>📜</span>
                                            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, fontFamily: 'var(--font-serif)', color: 'var(--olive-drab)' }}>
                                                Knowledge Artifact Minted
                                            </h3>
                                        </div>
                                        <p style={{ fontSize: '13px', margin: '0 0 12px 0', opacity: 0.8 }}>
                                            Research completed and finalized on-chain as a verifiable NFT.
                                        </p>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <div style={{ background: 'var(--alabaster)', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>
                                                Token ID: #{quest.results.nftTokenId}
                                            </div>
                                            {quest.results.nftExplorerLink && (
                                                <a
                                                    href={quest.results.nftExplorerLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ fontSize: '12px', color: 'var(--burnt-clay)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, textDecoration: 'none' }}
                                                >
                                                    View NFT ↗
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* x402 Payments */}
                                {quest.results.payoutTxHashes && quest.results.payoutTxHashes.length > 0 && (
                                    <div style={{ padding: '16px', background: 'var(--alabaster)', border: '1px solid var(--soft-grey)', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                            <span style={{ fontSize: '18px' }}>💸</span>
                                            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, fontFamily: 'var(--font-serif)' }}>
                                                x402 Micropayments
                                            </h3>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {quest.results.payoutTxHashes.map((hash: string, i: number) => (
                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '8px', background: 'var(--warm-white)', border: '1px solid var(--soft-grey)', borderRadius: '4px' }}>
                                                    <span style={{ fontFamily: 'monospace' }}>{hash.slice(0, 8)}...{hash.slice(-6)}</span>
                                                    <a
                                                        href={`https://amoy.polygonscan.com/tx/${hash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: 'var(--olive-drab)', textDecoration: 'none', fontSize: '12px', fontWeight: 500 }}
                                                    >
                                                        Verified ✓
                                                    </a>
                                                </div>
                                            ))}
                                            <p style={{ fontSize: '12px', color: 'var(--mid-grey)', margin: '8px 0 0 0', textAlign: 'center' }}>
                                                Automatic settlement via QuestPool contract
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Explorer Links */}
                        {quest.explorerLinks && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                padding: '16px',
                                background: 'var(--alabaster)',
                                borderRadius: '8px',
                                border: '1px solid var(--soft-grey)'
                            }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0', fontFamily: 'var(--font-serif)' }}>
                                    On-Chain Proofs
                                </h3>

                                {quest.explorerLinks.paymentTx && (
                                    <a
                                        href={quest.explorerLinks.paymentTx}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '13px', color: 'var(--burnt-clay)', textDecoration: 'none' }}
                                    >
                                        Payment Transaction →
                                    </a>
                                )}

                                {quest.explorerLinks.questWallet && (
                                    <a
                                        href={quest.explorerLinks.questWallet}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '13px', color: 'var(--burnt-clay)', textDecoration: 'none' }}
                                    >
                                        Quest Wallet →
                                    </a>
                                )}

                                {quest.explorerLinks.discoveryRegistry && (
                                    <a
                                        href={quest.explorerLinks.discoveryRegistry}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '13px', color: 'var(--burnt-clay)', textDecoration: 'none' }}
                                    >
                                        Discovery Registry →
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Close Button */}
                        <div style={{ marginTop: '24px', textAlign: 'right' }}>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '10px 24px',
                                    background: 'var(--graphite)',
                                    color: 'var(--warm-white)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
