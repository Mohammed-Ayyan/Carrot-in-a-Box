import React, { useState } from 'react';
import { MessageSquare, Sparkles, Eye, CheckCircle, Clock } from 'lucide-react';
import { TimerRing } from './TimerRing';

interface PlayerBluffOverlayProps {
  playerSawCarrot: boolean;
  onSelectBluff: (index: number, statement: string) => void;
  secondsRemaining?: number | null;
  totalSeconds?: number;
}

const PLAYER_BLUFF_OPTIONS = [
  {
    title: 'The Confident Claim',
    statement: "I definitely have the carrot in my box! Swap with me!",
    tag: 'Tempting',
  },
  {
    title: 'The Reverse Psychology',
    statement: "My box is completely empty... keep your box if you dare!",
    tag: 'Bluff',
  },
  {
    title: 'The Poker Face',
    statement: "I'm saying nothing. Look at my poker face.",
    tag: 'Mysterious',
  },
];

export const PlayerBluffOverlay: React.FC<PlayerBluffOverlayProps> = ({
  playerSawCarrot,
  onSelectBluff,
  secondsRemaining = null,
  totalSeconds = 60,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleSelect = (idx: number, statement: string) => {
    if (selectedIdx !== null) return; // already selected
    setSelectedIdx(idx);
    onSelectBluff(idx, statement);
  };

  const timeIsUp = typeof secondsRemaining === 'number' && secondsRemaining <= 0;
  const showTimer = typeof secondsRemaining === 'number' && secondsRemaining > 0;

  return (
    <div className="player-bluff-container">
      <div className="bluff-card-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div className="peek-badge">
            <Eye size={16} />
            <span>YOU PEEKED INSIDE BOX B</span>
          </div>
          {/* Countdown ring — visible to the peeker during statement selection */}
          {showTimer && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <TimerRing
                seconds={secondsRemaining!}
                totalSeconds={totalSeconds}
                size={64}
                urgentAt={10}
              />
              <span style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.05em' }}>CHOOSE</span>
            </div>
          )}
          {timeIsUp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 13, fontWeight: 700 }}>
              <Clock size={16} />
              <span>TIME UP</span>
            </div>
          )}
        </div>

        <h3 className="bluff-title">
          {playerSawCarrot ? '🥕 YOU HAVE THE CARROT!' : '📦 YOUR BOX IS EMPTY!'}
        </h3>
        <p className="bluff-subtitle">
          {selectedIdx !== null
            ? 'Statement sent! Waiting for opponent...'
            : 'Choose a statement to persuade your opponent:'}
        </p>
      </div>

      <div className="bluff-options-grid">
        {PLAYER_BLUFF_OPTIONS.map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          const isDisabled = selectedIdx !== null && !isSelected;

          return (
            <button
              key={idx}
              className={`bluff-option-card ${isSelected ? 'bluff-option-selected' : ''} ${isDisabled ? 'bluff-option-disabled' : ''}`}
              onClick={() => handleSelect(idx, opt.statement)}
              disabled={selectedIdx !== null || timeIsUp}
              style={{
                opacity: isDisabled ? 0.4 : 1,
                border: isSelected ? '2px solid #f59e0b' : undefined,
                position: 'relative',
              }}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 8, right: 10,
                  color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 700,
                }}>
                  <CheckCircle size={14} />
                  SENT
                </div>
              )}
              <div className="option-tag">
                <Sparkles size={12} />
                <span>{opt.tag}</span>
              </div>
              <h4 className="option-name">{opt.title}</h4>
              <p className="option-statement">
                <MessageSquare size={14} className="msg-icon" />
                "{opt.statement}"
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
