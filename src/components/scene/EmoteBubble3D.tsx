import React, { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import { ActiveEmote } from '../../game/types';

interface EmoteBubble3DProps {
  activeEmote: ActiveEmote | null;
}

export const EmoteBubble3D: React.FC<EmoteBubble3DProps> = ({ activeEmote }) => {
  const [currentEmote, setCurrentEmote] = useState<ActiveEmote | null>(null);

  useEffect(() => {
    if (activeEmote) {
      setCurrentEmote(activeEmote);
      const timer = setTimeout(() => {
        setCurrentEmote(null);
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [activeEmote?.timestamp, activeEmote?.emoteId]);

  if (!currentEmote) return null;

  const isPlayer = currentEmote.sender === 'PLAYER';
  // Position above player hands/bottom viewport or prominently above opponent's head
  const position: [number, number, number] = isPlayer ? [0, 1.25, 0.75] : [0, 2.10, -1.40];

  return (
    <group position={position}>
      <Html center distanceFactor={7} zIndexRange={[300, 200]}>
        <div className={`emote-3d-bubble ${isPlayer ? 'emote-player' : 'emote-opponent'}`}>
          <div className="emote-emoji">{currentEmote.emoteId}</div>
          <div className="emote-sparkles">
            <span className="sparkle s1">✨</span>
            <span className="sparkle s2">✨</span>
          </div>
        </div>
      </Html>
    </group>
  );
};
