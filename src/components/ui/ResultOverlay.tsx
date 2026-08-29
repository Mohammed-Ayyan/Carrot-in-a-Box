import React, { useState } from 'react';
import { RotateCcw, XCircle, Clock, LogOut } from 'lucide-react';
import { GameStateData } from '../../game/types';
import { audioManager } from '../../audio/audioManager';

interface ResultOverlayProps {
  gameState: GameStateData;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

export const ResultOverlay: React.FC<ResultOverlayProps> = ({
  gameState,
  onPlayAgain,
  onReturnToLobby,
}) => {
  const [requested, setRequested] = useState(false);
  const { winner, peeker, playerChoice, aiChoice, playerBox, carrotBox } = gameState;

  if (!winner) return null;

  const isPlayerWin = winner === 'PLAYER';

  let explanation = '';
  if (peeker === 'OPPONENT') {
    if (isPlayerWin) {
      explanation = playerChoice === 'SWAP'
        ? `Brilliant read! You swapped boxes and snatched the carrot inside ${playerBox === 'BOX_A' ? 'Box A' : 'Box B'}!`
        : `Sharp instincts! You saw through the opponent's bluff and kept the box with the carrot!`;
    } else {
      explanation = playerChoice === 'SWAP'
        ? `Unlucky! You swapped into an empty box. The carrot was inside ${carrotBox === 'BOX_A' ? 'Box A' : 'Box B'}!`
        : `Your opponent tricked you! They kept the carrot inside ${carrotBox === 'BOX_A' ? 'Box A' : 'Box B'}!`;
    }
  } else {
    // PLAYER WAS PEEKER
    if (isPlayerWin) {
      explanation = aiChoice === 'SWAP'
        ? `Masterful bluffing! Your statement tricked the opponent into swapping the carrot right over to you!`
        : `Flawless poker face! You convinced the opponent to keep their empty box!`;
    } else {
      explanation = aiChoice === 'SWAP'
        ? `The opponent swapped boxes and took your carrot!`
        : `The opponent saw right through your bluff and kept their box with the carrot!`;
    }
  }

  return (
    <div className="result-overlay">
      <div className={`result-card ${isPlayerWin ? 'card-win' : 'card-empty'}`}>
        <div className="result-icon-wrapper">
          {isPlayerWin ? (
            <span className="carrot-emoji">🥕</span>
          ) : (
            <XCircle size={52} className="empty-icon" />
          )}
        </div>

        <h2 className="result-title">
          {isPlayerWin ? 'YOU WON THE CARROT!' : 'OPPONENT WON THE CARROT!'}
        </h2>

        <p className="result-subtext">{explanation}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 8 }}>
          <button
            className="play-again-button"
            disabled={requested}
            style={{ opacity: requested ? 0.7 : 1, cursor: requested ? 'not-allowed' : 'pointer' }}
            onClick={() => {
              if (requested) return;
              setRequested(true);
              audioManager.playClick();
              onPlayAgain();
            }}
          >
            {requested ? <Clock size={20} /> : <RotateCcw size={20} />}
            <span>{requested ? 'WAITING FOR OPPONENT...' : 'PLAY AGAIN'}</span>
          </button>

          <button
            className="play-again-button"
            style={{ background: '#334155', border: '1px solid #475569' }}
            onClick={() => {
              audioManager.playClick();
              onReturnToLobby();
            }}
          >
            <LogOut size={20} />
            <span>RETURN TO LOBBY</span>
          </button>
        </div>
      </div>
    </div>
  );
};
