import React, { useState, useEffect } from 'react';
import './index.css';
import GameCanvas from './GameCanvas';
import Leaderboard from './Leaderboard';
import { connectWallet, getContract, getReadOnlyProvider } from './Web3Manager';
import { ethers } from 'ethers';

// ... (rest of imports)

const HARDCODED_CONTRACT_ADDRESS = "0xD8f957dd16cD1409Feb8A5aC448E7E3A165aa37B";

function App() {
  const [account, setAccount] = useState(null);
  const [contractAddress, setContractAddress] = useState(HARDCODED_CONTRACT_ADDRESS);
  const [score, setScore] = useState(null);
  const [isDrawingAllowed, setIsDrawingAllowed] = useState(false);
  const [gameState, setGameState] = useState('IDLE'); // IDLE, DRAWING, SCORED, SUBMITTING, SUBMITTED
  const [timer, setTimer] = useState(10);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [signer, setSigner] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  const handleConnect = async () => {
    try {
      const { account, signer } = await connectWallet();
      setAccount(account);
      setSigner(signer);
    } catch (err) {
      alert("Failed to connect: " + err.message);
    }
  };

  const startGame = () => {
    setGameState('DRAWING');
    setIsDrawingAllowed(true);
    setScore(null);
    setTimer(10);
    setResetTrigger(prev => prev + 1);
  };

  // Timer logic
  useEffect(() => {
    let interval;
    if (gameState === 'DRAWING' && timer > 0) {
      interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    } else if (timer === 0 && gameState === 'DRAWING') {
      // Time up!
      setIsDrawingAllowed(false);
      setGameState('SCORED');
      if (score === null) setScore(0); // If they didn't finish
    }
    return () => clearInterval(interval);
  }, [gameState, timer]);

  const onScoreCalculated = (calculatedScore) => {
    setScore(calculatedScore);
    setGameState('SCORED');
    setIsDrawingAllowed(false);
  };

  const submitScore = async () => {
    if (!contractAddress) {
      alert("Please enter the Game Contract Address first!");
      return;
    }
    if (!signer) {
      alert("Connect Wallet first!");
      return;
    }

    try {
      setGameState('SUBMITTING');
      setStatusMsg("Confirming transaction...");

      const contract = getContract(contractAddress, signer);
      // Determine score integer (0-10000 basis points)
      const scoreBasisPoints = Math.floor(score * 100);

      // Metamask auto-gas limit - we don't pass gasLimit, ethers handles it
      const tx = await contract.submitScore(scoreBasisPoints);

      setStatusMsg("Mining...");
      await tx.wait();

      setGameState('SUBMITTED');
      setStatusMsg("Score Submitted Successfully!");

      // Reset after a delay?
    } catch (err) {
      console.error(err);
      setStatusMsg("Error: " + (err.reason || err.message));
      setGameState('SCORED'); // Go back so they can try again
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo-container">
          <img src="/logo.png" alt="Arc Circle" className="logo" />
          <div className="title">Arc Circle</div>
        </div>

        <div style={{ pointerEvents: 'auto', display: 'flex', gap: '10px' }}>
          {!contractAddress && (
            <input
              type="text"
              placeholder="Contract Address (0x...)"
              onChange={(e) => setContractAddress(e.target.value)}
              style={{
                background: '#000000aa', border: '1px solid #00f0ff',
                color: 'white', padding: '5px', borderRadius: '5px'
              }}
            />
          )}
          <button className="wallet-btn" onClick={handleConnect}>
            {account ? `${account.substring(0, 6)}...${account.substring(38)}` : "Connect Wallet"}
          </button>
        </div>
      </header>

      <GameCanvas
        onScoreCalculated={onScoreCalculated}
        isDrawingAllowed={isDrawingAllowed}
        onDrawingStart={() => { }}
        onDrawingEnd={() => { }}
        resetTrigger={resetTrigger}
      />

      <div className="ui-overlay">
        {gameState === 'IDLE' && (
          <button className="submit-btn" onClick={startGame}>
            Start Drawing
          </button>
        )}

        {gameState === 'DRAWING' && (
          <div className="timer" style={{ color: timer < 3 ? 'red' : 'inherit' }}>
            {timer.toFixed(1)}s
          </div>
        )}

        {gameState === 'SCORED' && (
          <>
            <div className="score-display">{score ? score.toFixed(1) : 0}%</div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="submit-btn" onClick={startGame}>
                Try Again
              </button>
              <button className="submit-btn" onClick={submitScore} disabled={!score || score < 1}>
                Submit to Chain
              </button>
            </div>
          </>
        )}

        {gameState === 'SUBMITTING' && (
          <div className="loading">
            <div className="message">{statusMsg}</div>
          </div>
        )}

        {gameState === 'SUBMITTED' && (
          <>
            <div className="score-display" style={{ color: '#00ff88' }}>SAVED</div>
            <div className="message">{statusMsg}</div>
            <button className="submit-btn" onClick={startGame}>
              Play Again
            </button>
          </>
        )}
      </div>

      <Leaderboard
        contractAddress={contractAddress}
        provider={account ? new ethers.BrowserProvider(window.ethereum) : getReadOnlyProvider()}
        resetTrigger={gameState === 'SUBMITTED' ? resetTrigger : 0}
      />

      <a href="https://www.rajuice.xyz/" target="_blank" rel="noopener noreferrer" className="developer-footer">
        <img src="/rajuice-avatar.jpg" alt="Rajuice" className="dev-avatar" />
        <div className="dev-text">Developed By <span>Rajuice</span></div>
      </a>
    </div>
  );
}

export default App;
