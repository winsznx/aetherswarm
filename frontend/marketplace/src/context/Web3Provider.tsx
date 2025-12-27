'use client';

import { wagmiAdapter, projectId, networks } from '@/config/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { polygon, polygonAmoy } from '@reown/appkit/networks';
import React, { type ReactNode } from 'react';
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi';

// Set up queryClient
const queryClient = new QueryClient();

// Set up metadata
const metadata = {
    name: 'AetherSwarm',
    description: 'Decentralized Knowledge Expedition Platform',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://aetherswarm.io',
    icons: ['https://avatars.githubusercontent.com/u/179229932'],
};

// Create the AppKit modal (only on client)
let modal: ReturnType<typeof createAppKit> | null = null;

if (typeof window !== 'undefined' && projectId) {
    modal = createAppKit({
        adapters: [wagmiAdapter],
        projectId,
        networks: [polygonAmoy, polygon],
        defaultNetwork: polygonAmoy,
        metadata,
        features: {
            analytics: true,
            email: true,
            socials: ['google', 'x', 'github', 'discord'],
            emailShowWallets: true,
        },
        themeMode: 'dark',
        themeVariables: {
            '--w3m-accent': '#2A2A2A',
            '--w3m-border-radius-master': '0px',
        },
    });
}

export { modal };

interface Web3ProviderProps {
    children: ReactNode;
    cookies?: string | null;
}

export function Web3Provider({ children, cookies }: Web3ProviderProps) {
    const initialState = cookies
        ? cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)
        : undefined;

    return (
        <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}

export default Web3Provider;
