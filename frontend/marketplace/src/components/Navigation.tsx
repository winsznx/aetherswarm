'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

export function Navigation() {
    const pathname = usePathname();
    const { open } = useAppKit();
    const { address, isConnected } = useAppKitAccount();

    const navItems = [
        { href: '/', label: 'Home', icon: '🏠' },
        { href: '/quests', label: 'Quests', icon: '🎯' },
        { href: '/agents', label: 'Agents', icon: '🤖' },
        { href: '/docs', label: 'Docs', icon: '📚' },
    ];

    const isActive = (path: string) => pathname === path;

    return (
        <nav style={{
            background: 'var(--warm-white)',
            borderBottom: '1px solid var(--graphite)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            padding: '0 24px'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '64px'
            }}>
                {/* Logo */}
                <Link href="/" style={{
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'var(--burnt-clay)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px'
                    }}>
                        ⚡
                    </div>
                    <span style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        color: 'var(--graphite)'
                    }}>
                        AetherSwarm
                    </span>
                </Link>

                {/* Navigation Items */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center'
                }}>
                    {navItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            style={{
                                textDecoration: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: isActive(item.href) ? 'white' : 'var(--graphite)',
                                background: isActive(item.href) ? 'var(--burnt-clay)' : 'transparent',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive(item.href)) {
                                    e.currentTarget.style.background = 'var(--alabaster)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive(item.href)) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </div>

                {/* Wallet Connection */}
                <div>
                    {isConnected ? (
                        <button
                            onClick={() => open()}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: '1px solid var(--burnt-clay)',
                                background: 'white',
                                color: 'var(--burnt-clay)',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <span>🟢</span>
                            <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => open()}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'var(--burnt-clay)',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Connect Wallet
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Navigation (shown on small screens) */}
            <style jsx>{`
        @media (max-width: 768px) {
          nav > div:first-child {
            height: auto;
            padding: 12px 0;
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>
        </nav>
    );
}
