import { cookieStorage, createStorage } from '@wagmi/core';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { polygon, polygonAmoy, mainnet } from '@reown/appkit/networks';

// Get projectId from https://dashboard.reown.com
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '';

if (!projectId) {
    console.warn('[Reown] No project ID configured - wallet connection will not work');
}

// Networks for AetherSwarm - using Polygon for USDC payments
export const networks = [polygonAmoy, polygon, mainnet];

// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
    storage: createStorage({
        storage: cookieStorage,
    }),
    ssr: true,
    projectId,
    networks,
});

export const config = wagmiAdapter.wagmiConfig;

// USDC Contract addresses
export const USDC_ADDRESSES: { [chainId: number]: string } = {
    // Polygon Mainnet
    137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    // Polygon Amoy Testnet
    80002: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    // Ethereum Mainnet
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
};

// ERC-20 ABI for USDC transfers
export const ERC20_ABI = [
    {
        name: 'transfer',
        type: 'function',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'approve',
        type: 'function',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'balanceOf',
        type: 'function',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'allowance',
        type: 'function',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;
