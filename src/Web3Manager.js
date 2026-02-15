import { ethers } from 'ethers';

// Arc Testnet Configuration
export const ARC_CHAIN_ID = 5042002;
export const ARC_CHAIN_ID_HEX = '0x4ceec2'; // 5042002 in hex
export const ARC_RPC_URL = 'https://rpc.testnet.arc.network';
export const ARC_EXPLORER_URL = 'https://testnet.arcscan.app';

// Contract ABI (Subset needed for interaction)
const CONTRACT_ABI = [
    "function submitScore(uint256 _accuracy) external",
    "function getScoreCount() external view returns (uint256)",
    "function getTopScores(uint256 limit) external view returns (tuple(address player, uint256 accuracy, uint256 timestamp)[])",
    "event ScoreSubmitted(address indexed player, uint256 accuracy)"
];

// ── EIP-6963 Multi-Provider Discovery ──────────────────────────────
let _eip6963Providers = [];

if (typeof window !== 'undefined') {
    window.addEventListener('eip6963:announceProvider', (event) => {
        const exists = _eip6963Providers.some(
            (p) => p.info.uuid === event.detail.info.uuid
        );
        if (!exists) {
            _eip6963Providers.push(event.detail);
        }
    });
    // Request providers to announce themselves
    window.dispatchEvent(new Event('eip6963:requestProvider'));
}

/**
 * Returns all EIP-6963 announced wallet providers.
 */
export const getEIP6963Providers = () => [..._eip6963Providers];

/**
 * Check if the user is on a mobile device.
 */
export const isMobile = () => {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
};

/**
 * Check if an injected provider is available (window.ethereum or EIP-6963).
 */
export const hasInjectedProvider = () => {
    return (
        typeof window !== 'undefined' &&
        (!!window.ethereum || _eip6963Providers.length > 0)
    );
};

// ── Deep-link URLs for popular mobile wallets ──────────────────────
export const getMobileWalletDeepLinks = () => {
    const dappUrl = typeof window !== 'undefined'
        ? encodeURIComponent(window.location.href)
        : '';
    const rawUrl = typeof window !== 'undefined' ? window.location.href : '';

    return [
        {
            name: 'MetaMask',
            icon: '🦊',
            deepLink: `https://metamask.app.link/dapp/${rawUrl.replace(/^https?:\/\//, '')}`,
            downloadUrl: 'https://metamask.io/download/',
        },
        {
            name: 'Trust Wallet',
            icon: '🛡️',
            deepLink: `https://link.trustwallet.com/open_url?coin_id=60&url=${dappUrl}`,
            downloadUrl: 'https://trustwallet.com/download',
        },
        {
            name: 'Coinbase Wallet',
            icon: '🔵',
            deepLink: `https://go.cb-w.com/dapp?cb_url=${dappUrl}`,
            downloadUrl: 'https://www.coinbase.com/wallet/downloads',
        },
        {
            name: 'OKX Wallet',
            icon: '⚫',
            deepLink: `okx://wallet/dapp/url?dappUrl=${dappUrl}`,
            downloadUrl: 'https://www.okx.com/web3',
        },
        {
            name: 'Rabby Wallet',
            icon: '🐰',
            deepLink: null, // Rabby is desktop-only extension
            downloadUrl: 'https://rabby.io/',
        },
    ];
};

// ── Network switching / adding ─────────────────────────────────────
export const switchNetwork = async (provider) => {
    const ethereum = provider || window.ethereum;
    if (!ethereum) return false;
    try {
        await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARC_CHAIN_ID_HEX }],
        });
        return true;
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: ARC_CHAIN_ID_HEX,
                            chainName: 'Arc Testnet',
                            nativeCurrency: {
                                name: 'USDC',
                                symbol: 'USDC',
                                decimals: 18,
                            },
                            rpcUrls: [ARC_RPC_URL],
                            blockExplorerUrls: [ARC_EXPLORER_URL],
                        },
                    ],
                });
                return true;
            } catch (addError) {
                console.error('Failed to add network:', addError);
            }
        }
        console.error('Failed to switch network:', switchError);
    }
    return false;
};

// ── Connect using a specific EIP-1193 provider ─────────────────────
export const connectWithProvider = async (ethereumProvider) => {
    try {
        const accounts = await ethereumProvider.request({
            method: 'eth_requestAccounts',
        });
        const provider = new ethers.BrowserProvider(ethereumProvider);
        const network = await provider.getNetwork();

        if (Number(network.chainId) !== ARC_CHAIN_ID) {
            const switched = await switchNetwork(ethereumProvider);
            if (!switched) throw new Error('Incorrect Network');
        }

        return {
            account: accounts[0],
            provider,
            signer: await provider.getSigner(),
        };
    } catch (error) {
        console.error('Connection error:', error);
        throw error;
    }
};

// ── Legacy connect (uses window.ethereum directly) ─────────────────
export const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
        return connectWithProvider(window.ethereum);
    }
    throw new Error('No wallet detected');
};

// ── Contract helpers (unchanged) ───────────────────────────────────
export const getContract = (address, signerOrProvider) => {
    return new ethers.Contract(address, CONTRACT_ABI, signerOrProvider);
};

export const getReadOnlyProvider = () => {
    return new ethers.JsonRpcProvider(ARC_RPC_URL);
};

export const getLeaderboard = async (contract) => {
    try {
        const count = await contract.getScoreCount();
        const scores = await contract.getTopScores(count);

        const sortedScores = [...scores]
            .map((s) => ({
                player: s.player,
                accuracy: Number(s.accuracy),
                timestamp: Number(s.timestamp),
            }))
            .sort((a, b) => b.accuracy - a.accuracy);

        return sortedScores.slice(0, 100);
    } catch (err) {
        console.error('Leaderboard fetch error:', err);
        return [];
    }
};
