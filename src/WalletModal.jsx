import React, { useState, useEffect } from 'react';
import {
    getEIP6963Providers,
    isMobile,
    hasInjectedProvider,
    getMobileWalletDeepLinks,
    connectWithProvider,
} from './Web3Manager';

const WalletModal = ({ isOpen, onClose, onConnected }) => {
    const [eip6963Wallets, setEip6963Wallets] = useState([]);
    const [mobileLinks, setMobileLinks] = useState([]);
    const [isConnecting, setIsConnecting] = useState(null); // wallet name
    const [error, setError] = useState('');
    const [showMobile, setShowMobile] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setError('');
        setIsConnecting(null);

        // Gather discovered EIP-6963 wallets
        const providers = getEIP6963Providers();
        setEip6963Wallets(providers);

        // On mobile with no injected provider, show deep links
        const mobile = isMobile();
        const hasProvider = hasInjectedProvider();
        setShowMobile(mobile && !hasProvider);
        setMobileLinks(getMobileWalletDeepLinks());
    }, [isOpen]);

    if (!isOpen) return null;

    const handleProviderConnect = async (ethereumProvider, walletName) => {
        setIsConnecting(walletName);
        setError('');
        try {
            const result = await connectWithProvider(ethereumProvider);
            onConnected(result);
            onClose();
        } catch (err) {
            setError(err.message || 'Connection failed');
        } finally {
            setIsConnecting(null);
        }
    };

    const handleInjectedConnect = async () => {
        if (!window.ethereum) {
            setError('No wallet extension detected');
            return;
        }
        await handleProviderConnect(window.ethereum, 'Browser Wallet');
    };

    const handleDeepLink = (link) => {
        window.location.href = link;
    };

    // Build wallet list: EIP-6963 providers + fallback injected
    const hasEip6963 = eip6963Wallets.length > 0;
    const hasWindowEthereum = typeof window !== 'undefined' && !!window.ethereum;

    return (
        <div className="wallet-modal-overlay" onClick={onClose}>
            <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
                <div className="wallet-modal-header">
                    <h2>Connect Wallet</h2>
                    <button className="wallet-modal-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                {error && <div className="wallet-modal-error">{error}</div>}

                <div className="wallet-modal-list">
                    {/* ── EIP-6963 discovered wallets ── */}
                    {hasEip6963 &&
                        eip6963Wallets.map((w) => (
                            <button
                                key={w.info.uuid}
                                className="wallet-option"
                                disabled={!!isConnecting}
                                onClick={() =>
                                    handleProviderConnect(w.provider, w.info.name)
                                }
                            >
                                {w.info.icon ? (
                                    <img
                                        src={w.info.icon}
                                        alt={w.info.name}
                                        className="wallet-option-icon"
                                    />
                                ) : (
                                    <span className="wallet-option-emoji">🔗</span>
                                )}
                                <span className="wallet-option-name">
                                    {w.info.name}
                                </span>
                                {isConnecting === w.info.name && (
                                    <span className="wallet-connecting">
                                        Connecting…
                                    </span>
                                )}
                            </button>
                        ))}

                    {/* ── Fallback injected provider (when EIP-6963 isn't available) ── */}
                    {!hasEip6963 && hasWindowEthereum && (
                        <button
                            className="wallet-option"
                            disabled={!!isConnecting}
                            onClick={handleInjectedConnect}
                        >
                            <span className="wallet-option-emoji">🌐</span>
                            <span className="wallet-option-name">
                                Browser Wallet
                            </span>
                            {isConnecting === 'Browser Wallet' && (
                                <span className="wallet-connecting">
                                    Connecting…
                                </span>
                            )}
                        </button>
                    )}

                    {/* ── Mobile deep links ── */}
                    {showMobile && (
                        <>
                            <div className="wallet-modal-divider">
                                <span>Open in Wallet App</span>
                            </div>
                            {mobileLinks
                                .filter((w) => w.deepLink)
                                .map((w) => (
                                    <button
                                        key={w.name}
                                        className="wallet-option"
                                        onClick={() =>
                                            handleDeepLink(w.deepLink)
                                        }
                                    >
                                        <span className="wallet-option-emoji">
                                            {w.icon}
                                        </span>
                                        <span className="wallet-option-name">
                                            {w.name}
                                        </span>
                                        <span className="wallet-open-arrow">
                                            →
                                        </span>
                                    </button>
                                ))}
                        </>
                    )}

                    {/* ── No wallet found on desktop ── */}
                    {!hasWindowEthereum && !hasEip6963 && !showMobile && (
                        <div className="wallet-modal-empty">
                            <p>No wallet extension detected.</p>
                            <p>
                                Install{' '}
                                <a
                                    href="https://metamask.io/download/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    MetaMask
                                </a>{' '}
                                or another EVM wallet to continue.
                            </p>
                        </div>
                    )}

                    {/* ── Mobile: no injected but show install links too ── */}
                    {showMobile && (
                        <div className="wallet-modal-hint">
                            Tap a wallet above to open this dApp inside the
                            wallet's browser.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WalletModal;
