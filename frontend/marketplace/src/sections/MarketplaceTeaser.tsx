'use client';

import { motion } from 'framer-motion';

export default function MarketplaceTeaser() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
                padding: 'var(--space-xl)',
                background: 'var(--limestone)',
                border: '1px solid var(--soft-grey)',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Decorative corner */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                width: '40px',
                height: '40px',
                borderTop: '1px solid var(--graphite)',
                borderLeft: '1px solid var(--graphite)',
            }} />
            <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                width: '40px',
                height: '40px',
                borderBottom: '1px solid var(--graphite)',
                borderRight: '1px solid var(--graphite)',
            }} />

            <span className="label" style={{ marginBottom: '16px', display: 'block' }}>
                Coming Soon
            </span>

            <h3 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                marginBottom: '16px',
                color: 'var(--graphite)',
            }}>
                Knowledge <span style={{ fontStyle: 'italic' }}>Marketplace</span>
            </h3>

            <p style={{
                color: 'var(--mid-grey)',
                maxWidth: '500px',
                margin: '0 auto',
                lineHeight: 1.7,
            }}>
                Buy and sell verified knowledge artifacts. Trade research outputs as NFTs with provable provenance.
            </p>

            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn btn-outline"
                style={{ marginTop: 'var(--space-md)' }}
            >
                <span>Get Notified</span>
            </motion.button>
        </motion.div>
    );
}
