import React, { useState, useEffect } from 'react';
import { getContract, getLeaderboard } from './Web3Manager';

const Leaderboard = ({ contractAddress, provider, resetTrigger }) => {
    const [scores, setScores] = useState([]);
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!contractAddress || !provider) return;

        const fetchScores = async () => {
            setLoading(true);
            try {
                const contract = getContract(contractAddress, provider);
                const topScores = await getLeaderboard(contract);
                setScores(topScores);
            } catch (error) {
                console.error("Leaderboard error:", error);
            }
            setLoading(false);
        };

        fetchScores();

        // Refresh every 15s or when resetTrigger changes
        const interval = setInterval(fetchScores, 15000);
        return () => clearInterval(interval);
    }, [contractAddress, provider, resetTrigger]);

    const displayScores = expanded ? scores : scores.slice(0, 3);

    return (
        <div className={`leaderboard-container ${expanded ? 'expanded' : ''}`}>
            <div className="leaderboard-header" onClick={() => setExpanded(!expanded)}>
                <h3>Top Architects</h3>
                <div className={`arrow ${expanded ? 'up' : 'down'}`}>▼</div>
            </div>

            <div className="leaderboard-list">
                {displayScores.map((score, index) => (
                    <div key={`${score.player}-${score.timestamp}`} className="leaderboard-item" style={{ animationDelay: `${index * 50}ms` }}>
                        <div className="rank">#{index + 1}</div>
                        <div className="player-info">
                            <div className="player-address">
                                {score.player.substring(0, 6)}...{score.player.substring(38)}
                            </div>
                            <div className="player-score">{(score.accuracy / 100).toFixed(2)}%</div>
                        </div>
                    </div>
                ))}
                {scores.length === 0 && !loading && (
                    <div className="empty-state">No scores yet</div>
                )}
                {loading && scores.length === 0 && (
                    <div className="empty-state">Loading...</div>
                )}
            </div>

            {!expanded && scores.length > 3 && (
                <div className="expand-hint" onClick={() => setExpanded(true)}>
                    Show Top 100
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
