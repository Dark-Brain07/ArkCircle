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

export const switchNetwork = async () => {
    if (!window.ethereum) return false;
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARC_CHAIN_ID_HEX }],
        });
        return true;
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: ARC_CHAIN_ID_HEX,
                            chainName: 'Arc Testnet',
                            nativeCurrency: {
                                name: 'USDC', // User said Currency symbol USDC for the network?? Usually it is ETH or ARC, but user said "Currency symbol USDC".
                                symbol: 'USDC', // Note: Native currency being USDC is unusual but specified.
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

export const getContract = (address, signerOrProvider) => {
    return new ethers.Contract(address, CONTRACT_ABI, signerOrProvider);
};

export const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const provider = new ethers.BrowserProvider(window.ethereum);
            const network = await provider.getNetwork();

            if (Number(network.chainId) !== ARC_CHAIN_ID) {
                const switched = await switchNetwork();
                if (!switched) throw new Error("Incorrect Network");
            }

            return {
                account: accounts[0],
                provider: provider,
                signer: await provider.getSigner()
            };
        } catch (error) {
            console.error("Connection error:", error);
            throw error;
        }
    } else {
        throw new Error("Metamask not found");
    }
};

export const getReadOnlyProvider = () => {
    return new ethers.JsonRpcProvider(ARC_RPC_URL);
};

export const getLeaderboard = async (contract) => {
    try {
        const count = await contract.getScoreCount();
        // Fetch all scores (caution: fine for demo, slow for production if count is high)
        const scores = await contract.getTopScores(count);

        // Sort descending by accuracy
        const sortedScores = [...scores].map(s => ({
            player: s.player,
            accuracy: Number(s.accuracy),
            timestamp: Number(s.timestamp)
        })).sort((a, b) => b.accuracy - a.accuracy);

        return sortedScores.slice(0, 100);
    } catch (err) {
        console.error("Leaderboard fetch error:", err);
        return [];
    }
};
