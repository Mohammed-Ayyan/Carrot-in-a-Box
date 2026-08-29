import React from 'react';
import { Eye, MessageSquare, MessageSquareQuote, Package, Trophy, X, CheckCircle } from 'lucide-react';
import { audioManager } from '../../audio/audioManager';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  const handleClose = () => {
    audioManager.playClick();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="how-to-play-card">
        {/* Close Button */}
        <button className="modal-close-btn" onClick={handleClose} title="Close Instructions">
          <X size={20} />
        </button>

        {/* Title */}
        <div className="how-to-play-header">
          <span className="header-icon">🥕</span>
          <h2>HOW TO PLAY</h2>
          <p>A 2-Player Game of Mystery & Deception</p>
        </div>

        {/* 5 Simple Steps */}
        <div className="steps-container">
          <div className="step-card">
            <div className="step-badge step-1">
              <Eye size={22} />
            </div>
            <div className="step-content">
              <h4>1. PEEK</h4>
              <p>Look inside your own box. Only <strong>YOU</strong> can see whether you have the carrot.</p>
            </div>
          </div>

          <div className="step-card">
            <div className="step-badge step-2">
              <MessageSquare size={22} />
            </div>
            <div className="step-content">
              <h4>2. PERSUADE</h4>
              <p>Talk to your opponent using <strong>voice chat</strong> 🎙️ or <strong>text chat</strong> 💬.</p>
            </div>
          </div>

          <div className="step-card">
            <div className="step-badge step-3">
              <MessageSquareQuote size={22} />
            </div>
            <div className="step-content">
              <h4>3. BLUFF</h4>
              <p>Select your statement to convince your opponent to <strong>SWAP</strong> or <strong>KEEP</strong> boxes.</p>
            </div>
          </div>

          <div className="step-card">
            <div className="step-badge step-4">
              <Package size={22} />
            </div>
            <div className="step-content">
              <h4>4. CHOOSE</h4>
              <p>The chooser makes their decision before the phase timer runs out.</p>
            </div>
          </div>

          <div className="step-card">
            <div className="step-badge step-5">
              <Trophy size={22} />
            </div>
            <div className="step-content">
              <h4>5. REVEAL</h4>
              <p>Both boxes open to reveal the carrot and determine the round winner!</p>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button className="play-button continue-btn" onClick={handleClose}>
          <CheckCircle size={20} />
          <span>GOT IT! CONTINUE</span>
        </button>
      </div>
    </div>
  );
};
