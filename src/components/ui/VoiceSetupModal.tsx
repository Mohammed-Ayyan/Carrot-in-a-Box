import React from 'react';
import { Mic, MicOff, MessageSquare, Loader2, Radio } from 'lucide-react';
import { audioManager } from '../../audio/audioManager';
import { VoiceSetupStatus, VoiceState } from '../../game/types';

interface VoiceSetupModalProps {
  voiceSetupStatus: VoiceSetupStatus;
  voiceState: VoiceState;
  onEnableMic: () => void;
  onSkipVoice: () => void;
}

export const VoiceSetupModal: React.FC<VoiceSetupModalProps> = ({
  voiceSetupStatus,
  voiceState,
  onEnableMic,
  onSkipVoice,
}) => {
  const isRequesting = voiceSetupStatus === 'REQUESTING';
  const isDenied = voiceSetupStatus === 'DENIED' || voiceState === 'PERMISSION_DENIED';
  const isConnected = voiceState === 'CONNECTED';

  const handleEnableMic = () => {
    audioManager.playClick();
    onEnableMic();
  };

  const handleSkip = () => {
    audioManager.playClick();
    onSkipVoice();
  };

  return (
    <div className="modal-overlay">
      <div className="voice-setup-card">
        <div className="voice-setup-icon-badge">
          {isConnected ? (
            <Radio size={36} className="pulse-icon text-green" />
          ) : isDenied ? (
            <MicOff size={36} className="text-red" />
          ) : (
            <Mic size={36} className="text-amber" />
          )}
        </div>

        <h3>VOICE CHAT SETUP</h3>
        <p className="voice-setup-desc">
          Carrot in a Box is best experienced with real-time voice chat. Talk, persuade, and bluff your opponent live!
        </p>

        {/* Status Indicators */}
        {isRequesting && (
          <div className="voice-status-box status-connecting">
            <Loader2 size={18} className="spin" />
            <span>Requesting microphone permission...</span>
          </div>
        )}

        {isDenied && (
          <div className="voice-status-box status-denied">
            <MicOff size={18} />
            <span>Microphone access was denied. You can still play using text chat!</span>
          </div>
        )}

        {isConnected && (
          <div className="voice-status-box status-connected">
            <Radio size={18} />
            <span>Voice Connected & Ready!</span>
          </div>
        )}

        {/* Actions */}
        <div className="voice-actions-group">
          {!isConnected && (
            <button
              className="play-button enable-mic-btn"
              onClick={handleEnableMic}
              disabled={isRequesting}
            >
              {isRequesting ? <Loader2 size={22} className="spin" /> : <Mic size={22} />}
              <span>{isRequesting ? 'CONNECTING...' : 'ENABLE MICROPHONE'}</span>
            </button>
          )}

          <button
            className="play-button skip-voice-btn"
            onClick={handleSkip}
          >
            <MessageSquare size={20} />
            <span>{isConnected ? 'START GAME' : 'CONTINUE WITHOUT VOICE'}</span>
          </button>
        </div>

        <p className="voice-privacy-note">
          🔒 Your privacy matters. Audio is transmitted peer-to-peer (P2P) directly to your opponent.
        </p>
      </div>
    </div>
  );
};
