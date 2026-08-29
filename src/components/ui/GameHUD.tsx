import React, { useEffect, useState } from 'react';
import {
  Volume2, VolumeX, User, Trophy, RefreshCw, ShieldCheck,
  MessageSquareQuote, Bot, Eye, Bug, Clock, Mic, MicOff, Radio, MessageSquare, Info, Smile, Settings,
} from 'lucide-react';
import { GameStateData, PlayerChoice, EmoteId } from '../../game/types';
import { PlayerBluffOverlay } from './PlayerBluffOverlay';
import { TimerRing } from './TimerRing';
import { TextChatPanel } from './TextChatPanel';
import { FirstTimeTutorial } from './FirstTimeTutorial';
import { EmoteTray } from './EmoteTray';
import { SettingsModal } from './SettingsModal';
import { platformService } from '../../platform/PlatformService';

interface GameHUDProps {
  gameState: GameStateData;
  onMakeChoice: (choice: PlayerChoice) => void;
  onSelectPlayerBluff: (index: number, statement: string) => void;
  onSendEmote: (emoteId: EmoteId) => void;
  onToggleMute: () => void;
  onToggleDebugVisibility: () => void;
  onToggleVoiceMic?: () => void;
  onToggleChat?: () => void;
  onSendMessage?: (text: string) => void;
  onCloseTutorial?: () => void;
}

// Seconds allotted for each timed phase (kept in sync with server .env defaults).
const STATEMENT_TOTAL_SECS = 60;
const DECISION_TOTAL_SECS = 30;

export const GameHUD: React.FC<GameHUDProps> = ({
  gameState,
  onMakeChoice,
  onSelectPlayerBluff,
  onSendEmote,
  onToggleMute,
  onToggleDebugVisibility,
  onToggleVoiceMic,
  onToggleChat,
  onSendMessage,
  onCloseTutorial,
}) => {
  const [showEmotes, setShowEmotes] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const {
    status, peeker, round, score, isMuted, bluffText,
    playerBox, aiChoice, debugVisibility, carrotBox,
    playerName, opponentName, phaseSecondsRemaining,
    voiceState, isMicMuted, peerMicMuted,
    chatMessages, unreadChatCount, isChatOpen, showTutorial,
  } = gameState;

  // Keyboard shortcut 'D' → debug visibility toggle.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') onToggleDebugVisibility();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleDebugVisibility]);

  // Which timer slot is currently ticking.
  const isStatementPhase = status === 'PLAYER_BLUFFING';
  const isDecisionPhase = status === 'DECISION';
  const secs = phaseSecondsRemaining;

  // Helper for human-friendly phase status banner
  const getPhaseBanner = () => {
    switch (status) {
      case 'PLAYER_PEEKING':
        return { text: '🥕 YOUR TURN TO PEEK INSIDE YOUR BOX', color: '#f59e0b' };
      case 'PEEKING':
        return { text: `👀 ${opponentName.toUpperCase()} IS PEEKING INSIDE THEIR BOX...`, color: '#3b82f6' };
      case 'PLAYER_BLUFFING':
        return { text: '🗣️ CHOOSE YOUR STATEMENT TO PERSUADE OPPONENT', color: '#10b981' };
      case 'BLUFF':
        return { text: `🎭 ${opponentName.toUpperCase()} HAS SUBMITTED A STATEMENT`, color: '#8b5cf6' };
      case 'DECISION':
        return { text: '📦 MAKE YOUR CHOICE: KEEP OR SWAP BOXES', color: '#f59e0b' };
      case 'AI_THINKING':
        return { text: `⏳ WAITING FOR ${opponentName.toUpperCase()} DECISION...`, color: '#64748b' };
      case 'REVEALING':
        return { text: '✨ REVEALING THE CARROT...', color: '#ec4899' };
      case 'RESULT':
        return { text: '🏆 ROUND CONCLUDED', color: '#10b981' };
      default:
        return { text: 'GAME IN PROGRESS', color: '#64748b' };
    }
  };

  const banner = getPhaseBanner();
  const isChatDisabled = platformService.getSettings().disableChat;

  return (
    <div className="game-hud">

      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <div className="hud-top-bar">

        {/* Left: player identity + box */}
        <div className="hud-badge player-badge">
          <User size={16} />
          <span className="badge-label">
            {playerName} (BOX {playerBox === 'BOX_A' ? 'A' : 'B'})
          </span>
        </div>

        {/* Centre: peeker tag + score */}
        <div className="hud-center-group">
          <div className="hud-badge peeker-badge">
            <Eye size={16} className="eye-icon" />
            <span>
              PEEKER: {peeker === 'PLAYER' ? `${playerName} 🫵` : `${opponentName} 🫵`}
            </span>
          </div>

          <div className="hud-badge score-badge">
            <Trophy size={16} className="trophy-icon" />
            <span>{playerName} {score.player} — {score.opponent} {opponentName}</span>
          </div>

          {debugVisibility && (
            <div className="hud-badge debug-badge">
              <Bug size={16} />
              <span>DEBUG ON (CARROT: {carrotBox})</span>
            </div>
          )}
        </div>

        {/* Right: voice mic + emotes + chat + round + settings + mute */}
        <div className="hud-top-right">
          {onToggleVoiceMic && (
            <button
              className={`hud-audio-btn ${isMicMuted ? 'mic-muted' : 'mic-on'}`}
              onClick={onToggleVoiceMic}
              title={
                voiceState === 'PERMISSION_DENIED'
                  ? 'Microphone permission denied'
                  : isMicMuted
                  ? 'Unmute Mic (🎙️ YOU ARE MUTED)'
                  : 'Mute Mic (🎙️ YOU ARE UNMUTED)'
              }
              style={{
                borderColor: isMicMuted ? '#ef4444' : voiceState === 'CONNECTED' ? '#22c55e' : undefined,
                color: isMicMuted ? '#ef4444' : voiceState === 'CONNECTED' ? '#22c55e' : undefined,
              }}
            >
              {isMicMuted || voiceState === 'PERMISSION_DENIED' ? (
                <MicOff size={18} />
              ) : (
                <Mic size={18} />
              )}
            </button>
          )}

          {/* Emotes Button */}
          <button
            className={`hud-audio-btn ${showEmotes ? 'active' : ''}`}
            onClick={() => setShowEmotes(!showEmotes)}
            title="Express Emote"
          >
            <Smile size={18} />
          </button>

          {/* Chat Button (Hidden if platform disabled) */}
          {onToggleChat && !isChatDisabled && (
            <button
              className={`hud-audio-btn chat-toggle-btn ${isChatOpen ? 'chat-active' : ''}`}
              onClick={onToggleChat}
              title="Toggle Text Chat"
            >
              <MessageSquare size={18} />
              {unreadChatCount > 0 && (
                <span className="unread-badge">{unreadChatCount}</span>
              )}
            </button>
          )}

          {/* Settings Button */}
          <button
            className="hud-audio-btn"
            onClick={() => setShowSettings(true)}
            title="Game Settings"
          >
            <Settings size={18} />
          </button>

          <button
            className={`hud-audio-btn ${debugVisibility ? 'debug-active' : ''}`}
            onClick={onToggleDebugVisibility}
            title="Toggle Debug (D key)"
          >
            <Bug size={18} />
          </button>

          <div className="hud-badge round-badge">
            <span className="badge-label">ROUND</span>
            <span className="round-number">{round}</span>
          </div>

          <button
            className="hud-audio-btn"
            onClick={onToggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      {/* ── PHASE STATUS BANNER ───────────────────────────────────── */}
      <div className="phase-banner-container" style={{ borderColor: banner.color }}>
        <span className="banner-text">{banner.text}</span>
      </div>

      {/* ── OPPONENT SPEECH BUBBLE (chooser sees opponent's statement) ── */}
      {(status === 'BLUFF' || status === 'DECISION' || status === 'AI_THINKING' || status === 'AI_DECISION') && bluffText && (
        <div className="opponent-speech-container">
          <div className="speech-bubble">
            <div className="speech-header">
              <Bot size={18} className="bot-icon" />
              <span>
                {status === 'BLUFF' || status === 'DECISION'
                  ? `${opponentName} said:`
                  : status === 'AI_THINKING'
                    ? 'OPPONENT IS THINKING...'
                    : 'OPPONENT DECIDED'}
              </span>
            </div>
            <p className="speech-quote">
              <MessageSquareQuote size={18} className="quote-icon" />
              "{bluffText}"
            </p>
          </div>
        </div>
      )}

      {/* No bluff yet but opponent is in bluff/decision phase — show waiting hint */}
      {(status === 'BLUFF' || status === 'DECISION') && !bluffText && (
        <div className="opponent-speech-container">
          <div className="speech-bubble">
            <div className="speech-header">
              <Bot size={18} className="bot-icon" />
              <span>{opponentName} is choosing a statement...</span>
            </div>
          </div>
        </div>
      )}

      {/* ── PEEKER: statement selection overlay with timer ──────── */}
      {isStatementPhase && (
        <PlayerBluffOverlay
          playerSawCarrot={gameState.playerSawCarrot}
          onSelectBluff={onSelectPlayerBluff}
          secondsRemaining={secs}
          totalSeconds={STATEMENT_TOTAL_SECS}
        />
      )}

      {/* ── CHOOSER: SWAP / KEEP decision with timer ────────────── */}
      {isDecisionPhase && (
        <div className="decision-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 12 }}>
            <h3 className="decision-title" style={{ margin: 0 }}>
              Will you SWAP or KEEP your box?
            </h3>

            {/* Visible countdown for the swap/keep decision — shown to BOTH players */}
            {typeof secs === 'number' && secs > 0 && (
              <TimerRing
                seconds={secs}
                totalSeconds={DECISION_TOTAL_SECS}
                size={68}
                urgentAt={8}
              />
            )}
            {typeof secs === 'number' && secs <= 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                color: '#ef4444', fontSize: 13, fontWeight: 700,
              }}>
                <Clock size={16} />
                <span>TIME UP — auto KEEP</span>
              </div>
            )}
          </div>

          <div className="decision-actions">
            <button
              className="choice-btn swap-btn"
              onClick={() => onMakeChoice('SWAP')}
              disabled={typeof secs === 'number' && secs <= 0}
            >
              <RefreshCw size={22} className="btn-icon" />
              <div className="btn-content">
                <span className="btn-title">SWAP BOXES</span>
                <span className="btn-sub">
                  Take Opponent's Box {playerBox === 'BOX_A' ? 'B' : 'A'}
                </span>
              </div>
            </button>

            <button
              className="choice-btn keep-btn"
              onClick={() => onMakeChoice('KEEP')}
              disabled={typeof secs === 'number' && secs <= 0}
            >
              <ShieldCheck size={22} className="btn-icon" />
              <div className="btn-content">
                <span className="btn-title">KEEP MY BOX</span>
                <span className="btn-sub">
                  Stay with Box {playerBox === 'BOX_A' ? 'A' : 'B'}
                </span>
              </div>
            </button>
          </div>

          {/* Waiting hint for the peeker while chooser decides */}
          {peeker === 'PLAYER' && (
            <p style={{
              textAlign: 'center', marginTop: 10,
              fontSize: 13, color: '#94a3b8',
            }}>
              {opponentName} is making their decision...
            </p>
          )}
        </div>
      )}

      {/* ── BOTTOM HINT BANNER (auto-progressing phases) ──────── */}
      {status !== 'DECISION' && status !== 'PLAYER_BLUFFING' && status !== 'RESULT' && (
        <div className="hud-bottom-hint">
          <div className="hint-card">
            <span>
              {status === 'WAITING'   && 'Waiting for an opponent...'}
              {status === 'DEALING'   && `Dealing boxes… ${peeker === 'PLAYER' ? 'YOU peek first!' : `${opponentName} peeks first!`}`}
              {status === 'PEEKING'   && `${opponentName} is peeking inside their box...`}
              {status === 'PLAYER_PEEKING' && 'Peeking inside your box… look closely!'}
              {status === 'BLUFF'     && `${opponentName} is choosing their statement...`}
              {status === 'AI_THINKING'  && `${opponentName} is processing your statement...`}
              {status === 'AI_DECISION'  && `${opponentName} decided to ${aiChoice === 'SWAP' ? 'SWAP' : 'KEEP'}!`}
              {status === 'SWAPPING'     && 'Sliding boxes across the table...'}
              {status === 'REVEALING'    && 'Opening both box lids...'}
            </span>
          </div>
        </div>
      )}

      {/* ── REAL-TIME TEXT CHAT PANEL ───────────────────────────── */}
      {onToggleChat && onSendMessage && !isChatDisabled && (
        <TextChatPanel
          messages={chatMessages}
          opponentName={opponentName}
          isOpen={isChatOpen}
          onClose={onToggleChat}
          onSendMessage={onSendMessage}
        />
      )}

      {/* ── EMOTE SELECTION TRAY ───────────────────────────────── */}
      {showEmotes && (
        <EmoteTray
          onSelectEmote={(emoteId) => onSendEmote(emoteId)}
          onClose={() => setShowEmotes(false)}
        />
      )}

      {/* ── GAME SETTINGS MODAL ────────────────────────────────── */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
        />
      )}

      {/* ── FIRST TIME TUTORIAL OVERLAY ────────────────────────── */}
      {showTutorial && onCloseTutorial && (
        <FirstTimeTutorial onClose={onCloseTutorial} />
      )}
    </div>
  );
};
