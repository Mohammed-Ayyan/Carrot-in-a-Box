import React, { useState } from 'react';
import { EmoteId } from '../../game/types';

interface EmoteTrayProps {
  onSelectEmote: (emoteId: EmoteId) => void;
  onClose: () => void;
}

const EMOTE_LIST: { id: EmoteId; label: string }[] = [
  { id: '😏', label: 'Smirk' },
  { id: '😂', label: 'Laugh' },
  { id: '😮', label: 'Shock' },
  { id: '😎', label: 'Confident' },
  { id: '🤔', label: 'Thinking' },
  { id: '😈', label: 'Evil' },
  { id: '😱', label: 'Scared' },
  { id: '🤥', label: 'Liar' },
  { id: '🥕', label: 'Carrot' },
  { id: '👏', label: 'Applause' },
  { id: '🔥', label: 'Fire' },
  { id: '👍', label: 'Thumbs Up' },
];

export const EmoteTray: React.FC<EmoteTrayProps> = ({ onSelectEmote, onClose }) => {
  const [cooldown, setCooldown] = useState(false);

  const handlePick = (emoteId: EmoteId) => {
    if (cooldown) return;
    onSelectEmote(emoteId);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 1500);
    onClose();
  };

  return (
    <div className="emote-tray-container" onClick={(e) => e.stopPropagation()}>
      <div className="emote-tray-header">
        <span className="emote-tray-title">EXPRESSIONS</span>
        <button className="emote-tray-close" onClick={onClose} title="Close Emotes">
          ✕
        </button>
      </div>
      <div className="emote-grid">
        {EMOTE_LIST.map((item) => (
          <button
            key={item.id}
            className={`emote-btn ${cooldown ? 'cooldown' : ''}`}
            onClick={() => handlePick(item.id)}
            title={item.label}
          >
            <span className="emote-char">{item.id}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
