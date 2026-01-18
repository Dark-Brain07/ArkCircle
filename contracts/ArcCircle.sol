// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ArcCircle {
    struct Score {
        address player;
        uint256 accuracy; // Stored as percentage * 100 (e.g., 98.5% = 9850) or just integer 0-100 depending on resolution. Let's use basis points (10000 = 100%)
        uint256 timestamp;
    }

    Score[] public scores;
    mapping(address => uint256) public bestScores;

    event ScoreSubmitted(address indexed player, uint256 accuracy);

    // Accuracy is in basis points: 10000 = 100.00%
    function submitScore(uint256 _accuracy) external {
        require(_accuracy <= 10000, "Accuracy cannot exceed 100%");
        
        scores.push(Score({
            player: msg.sender,
            accuracy: _accuracy,
            timestamp: block.timestamp
        }));

        if (_accuracy > bestScores[msg.sender]) {
            bestScores[msg.sender] = _accuracy;
        }

        emit ScoreSubmitted(msg.sender, _accuracy);
    }

    function getScoreCount() external view returns (uint256) {
        return scores.length;
    }

    function getTopScores(uint256 limit) external view returns (Score[] memory) {
        // Basic implementation: returns latest 'limit' scores for simplicity in this demo
        // For a real leaderboard, we'd sort, but sorting is expensive on-chain.
        // We'll return the array and let frontend sort.
        uint256 count = scores.length;
        if (limit > count) {
            limit = count;
        }
        
        Score[] memory result = new Score[](limit);
        for (uint256 i = 0; i < limit; i++) {
            result[i] = scores[count - 1 - i];
        }
        return result;
    }
}
