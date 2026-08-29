import React, { useState } from 'react';
import { Eye, MessageSquare, Mic, Clock, HelpCircle, X, ChevronRight, Check } from 'lucide-react';
import { audioManager } from '../../audio/audioManager';

interface FirstTimeTutorialProps {
  onClose: () => void;
}

const STEPS = [
  {
    title: 'YOUR BOX & PEEKING',
    icon: <Eye size={24} />,
    desc: 'You are seated in front of your box (BOX B). When it is your turn to PEEK, click the Peek button to look inside. Only YOU will see if your box contains the carrot!',
  },
  {
    title: 'PERSUADE & BLUFF',
    icon: <MessageSquare size={24} />,
    desc: 'Use Voice Chat 🎙️ or Text Chat 💬 to persuade, deceive, or trick your opponent into keeping or swapping boxes.',
  },
  {
    title: 'THE DECISION & TIMER',
    icon: <Clock size={24} />,
    desc: 'When it is the Chooser’s turn, they must decide whether to KEEP or SWAP boxes before the phase countdown timer runs out.',
  },
  {
    title: 'THE REVEAL',
    icon: <HelpCircle size={24} />,
    desc: 'Both boxes open to reveal the carrot! The player holding the box with the carrot wins 1 point.',
  },
];

export const FirstTimeTutorial: React.FC<FirstTimeTutorialProps> = ({ onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const handleNext = () => {
    audioManager.playClick();
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    audioManager.playClick();
    onClose();
  };

  const step = STEPS[currentStepIndex];

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-card">
        {/* Skip button */}
        <button className="tutorial-skip-btn" onClick={handleSkip} title="Skip Tutorial">
          <X size={18} />
          <span>SKIP TUTORIAL</span>
        </button>

        {/* Header */}
        <div className="tutorial-step-badge">
          {step.icon}
          <span>STEP {currentStepIndex + 1} OF {STEPS.length}</span>
        </div>

        <h3>{step.title}</h3>
        <p className="tutorial-desc">{step.desc}</p>

        {/* Progress Dots */}
        <div className="tutorial-dots">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`tutorial-dot ${idx === currentStepIndex ? 'active' : ''}`}
            />
          ))}
        </div>

        {/* Next / Finish Action */}
        <button className="play-button tutorial-next-btn" onClick={handleNext}>
          <span>{currentStepIndex === STEPS.length - 1 ? 'GOT IT! LET\'S PLAY' : 'NEXT STEP'}</span>
          {currentStepIndex === STEPS.length - 1 ? <Check size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
    </div>
  );
};
