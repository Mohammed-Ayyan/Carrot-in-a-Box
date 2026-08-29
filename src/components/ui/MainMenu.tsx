import React, { useState } from 'react';
import { Volume2, VolumeX, Play, Sparkles, Loader2, Copy, Check, PlusCircle, LogIn, RefreshCw, X, HelpCircle, Users, Bot, Globe, Lock, DoorOpen } from 'lucide-react';
import { audioManager } from '../../audio/audioManager';
import { GameStateData } from '../../game/types';
import { generateRandomNickname, remoteGameEngine } from '../../game/RemoteGameEngine';
import { platformService } from '../../platform/PlatformService';

interface MainMenuProps {
  gameState: GameStateData;
  onPlayVsBot: (nickname: string) => void;
  onPlayOnline: (nickname: string) => void;
  onCreateRoom: (nickname: string) => void;
  onJoinRoom: (nickname: string, roomCode: string) => void;
  onCancelSearch: () => void;
  onAcceptBotFallback: () => void;
  onKeepWaiting: () => void;
  showBotFallbackPrompt?: boolean;
  searchSeconds?: number;
  onOpenHowToPlay?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  connecting?: boolean;
  errorMessage?: string | null;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  gameState,
  onPlayVsBot,
  onPlayOnline,
  onCreateRoom,
  onJoinRoom,
  onCancelSearch,
  onAcceptBotFallback,
  onKeepWaiting,
  showBotFallbackPrompt = false,
  searchSeconds = 0,
  onOpenHowToPlay,
  isMuted,
  onToggleMute,
  connecting = false,
  errorMessage = null,
}) => {
  const [nickname, setNickname] = useState(() => platformService.getUsername() || generateRandomNickname());
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [menuMode, setMenuMode] = useState<'MAIN' | 'JOIN_INPUT'>('MAIN');

  const { lobbyState, roomCode, status } = gameState;
  const isSearching = lobbyState === 'SEARCHING' || status === 'WAITING';
  const isCreateWaiting = lobbyState === 'CREATE_WAITING' && roomCode !== null;

  const handleRandomizeName = () => {
    audioManager.playClick();
    setNickname(generateRandomNickname());
  };

  const handleCopyCode = () => {
    if (!roomCode) return;
    const shareText = platformService.createInviteLink(roomCode);
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinSubmit = () => {
    if (joinCodeInput.trim().length < 4) return;
    audioManager.playClick();
    onJoinRoom(nickname.trim() || 'Player', joinCodeInput.trim().toUpperCase());
  };

  return (
    <div className="main-menu-overlay">
      <div className="main-menu-card" style={{ maxWidth: 480 }}>
        {/* Sound Toggle Button */}
        <button
          className="audio-toggle-btn"
          onClick={onToggleMute}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        {/* Title Header */}
        <div className="title-container">
          <div className="carrot-icon-badge">
            <span>🥕</span>
          </div>
          <h1 className="game-title">
            <span className="title-top">CARROT</span>
            <span className="title-bottom">IN A BOX</span>
          </h1>
          <p className="game-subtitle">
            <Sparkles size={14} className="sparkle-icon" /> Lie. Bluff. Outsmart.
          </p>
        </div>

        {/* Nickname Input & Randomizer */}
        {!isSearching && !isCreateWaiting && (
          <div style={{ display: 'flex', gap: 8, width: '100%', marginBottom: 12 }}>
            <input
              className="nickname-input"
              style={{ flex: 1, margin: 0 }}
              type="text"
              placeholder="Display Name"
              value={nickname}
              maxLength={20}
              disabled={connecting}
              onChange={(e) => setNickname(e.target.value)}
            />
            <button
              onClick={handleRandomizeName}
              title="Randomize Name"
              style={{
                background: '#334155', border: '1px solid #475569', borderRadius: 8,
                padding: '0 12px', color: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center'
              }}
            >
              <RefreshCw size={18} />
            </button>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && <p className="menu-error">{errorMessage}</p>}

        {/* --- VIEW 1: SEARCHING FOR ONLINE OPPONENT --- */}
        {isSearching && !showBotFallbackPrompt && (
          <div style={{ textAlign: 'center', margin: '16px 0', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Loader2 size={36} className="spin" style={{ color: '#60a5fa' }} />
              <h3 style={{ color: '#f59e0b', fontSize: 20, fontWeight: 800, margin: 0 }}>
                Finding an opponent...
              </h3>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                Waiting for another player to join...
              </p>
              <div style={{
                background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 12, padding: '6px 14px', color: '#60a5fa', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 8, marginTop: 4
              }}>
                <Users size={16} />
                <span>Players in room: 1/2</span>
                <span style={{ color: '#94a3b8', marginLeft: 8 }}>({searchSeconds}s)</span>
              </div>
            </div>
            <button
              className="play-button"
              style={{ background: '#475569' }}
              onClick={onCancelSearch}
            >
              <X size={20} />
              <span>CANCEL SEARCH</span>
            </button>
          </div>
        )}

        {/* --- VIEW 2: BOT FALLBACK PROMPT (25s searching timeout) --- */}
        {isSearching && showBotFallbackPrompt && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)', border: '2px solid #f59e0b', borderRadius: 16,
            padding: 20, textAlign: 'center', margin: '12px 0', width: '100%'
          }}>
            <Bot size={36} style={{ color: '#f59e0b', marginBottom: 8 }} />
            <h3 style={{ color: '#f8fafc', fontSize: 18, fontWeight: 800, margin: '0 0 6px 0' }}>
              No opponent found yet.
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 16, lineHeight: 1.4 }}>
              Would you like to play against a bot while we keep looking?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="play-button"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)', color: '#0f172a' }}
                onClick={onAcceptBotFallback}
              >
                <Bot size={20} />
                <span>PLAY VS BOT</span>
              </button>
              <button
                className="play-button"
                style={{ background: '#334155', color: '#f8fafc' }}
                onClick={onKeepWaiting}
              >
                <Loader2 size={20} className="spin" />
                <span>KEEP WAITING</span>
              </button>
            </div>
          </div>
        )}

        {/* --- VIEW 3: CREATE ROOM WAITING --- */}
        {isCreateWaiting && (
          <div style={{ textAlign: 'center', margin: '16px 0', width: '100%' }}>
            <h3 style={{ color: '#f59e0b', margin: '4px 0 4px 0', fontSize: 18, fontWeight: 800 }}>
              WAITING FOR YOUR FRIEND
            </h3>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 14 }}>
              Share room code or invite link to join match:
            </p>
            <div style={{
              background: '#0f172a', border: '2px dashed #f59e0b', borderRadius: 12,
              padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 14
            }}>
              <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.2em', color: '#f59e0b', fontFamily: 'monospace' }}>
                {roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                style={{
                  background: copied ? '#22c55e' : '#f59e0b', border: 'none', borderRadius: 8,
                  padding: '8px 14px', color: '#0f172a', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 13
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'COPIED!' : 'INVITE FRIEND'}</span>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#60a5fa', fontSize: 13, marginBottom: 16, fontWeight: 700 }}>
              <Loader2 size={16} className="spin" />
              <span>Players in room: 1/2</span>
            </div>
            <button
              className="play-button"
              style={{ background: '#475569' }}
              onClick={() => {
                onCancelSearch();
                remoteGameEngine.setLobbyState('MAIN_MENU');
              }}
            >
              <X size={20} />
              <span>CANCEL ROOM</span>
            </button>
          </div>
        )}

        {/* --- VIEW 4: JOIN ROOM INPUT MODE --- */}
        {!isSearching && !isCreateWaiting && menuMode === 'JOIN_INPUT' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, margin: '12px 0' }}>
            <input
              className="nickname-input"
              style={{ textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'center', fontSize: 20, fontWeight: 800 }}
              type="text"
              placeholder="ENTER ROOM CODE"
              maxLength={6}
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoinSubmit();
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="play-button"
                style={{ flex: 1, background: '#334155' }}
                onClick={() => setMenuMode('MAIN')}
              >
                <span>BACK</span>
              </button>
              <button
                className="play-button"
                style={{ flex: 2, background: '#f59e0b', color: '#0f172a' }}
                disabled={joinCodeInput.trim().length < 4 || connecting}
                onClick={handleJoinSubmit}
              >
                {connecting ? <Loader2 size={20} className="spin" /> : <LogIn size={20} />}
                <span>JOIN ROOM</span>
              </button>
            </div>
          </div>
        )}

        {/* --- VIEW 5: MAIN MENU MODE OPTIONS --- */}
        {!isSearching && !isCreateWaiting && menuMode === 'MAIN' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, margin: '10px 0' }}>
            {/* 1. PLAY NOW / VS BOT */}
            <button
              className="play-button"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)', color: '#0f172a' }}
              onClick={() => {
                audioManager.playClick();
                onPlayVsBot(nickname.trim() || 'Player');
              }}
            >
              <Bot size={22} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>⚡ PLAY NOW</span>
                <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>Play instantly against Bot</span>
              </div>
            </button>

            {/* 2. PLAY ONLINE */}
            <button
              className="play-button"
              style={{ background: '#2563eb' }}
              onClick={() => {
                audioManager.playClick();
                onPlayOnline(nickname.trim() || 'Player');
              }}
              disabled={connecting}
            >
              {connecting ? <Loader2 size={22} className="spin" /> : <Globe size={22} />}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>🌐 PLAY ONLINE</span>
                <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>Find a real player</span>
              </div>
            </button>

            {/* 3. CREATE ROOM */}
            <button
              className="play-button"
              style={{ background: '#7c3aed' }}
              onClick={() => {
                audioManager.playClick();
                onCreateRoom(nickname.trim() || 'Player');
              }}
              disabled={connecting}
            >
              <Lock size={22} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>🔒 CREATE ROOM</span>
                <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>Invite a friend</span>
              </div>
            </button>

            {/* 4. JOIN ROOM */}
            <button
              className="play-button"
              style={{ background: '#334155' }}
              onClick={() => {
                audioManager.playClick();
                setMenuMode('JOIN_INPUT');
              }}
              disabled={connecting}
            >
              <DoorOpen size={22} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>🚪 JOIN ROOM</span>
                <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>Enter a room code</span>
              </div>
            </button>

            {/* How To Play */}
            <button
              className="play-button"
              style={{ background: '#1e293b', border: '1px solid #475569', marginTop: 4 }}
              onClick={() => {
                audioManager.playClick();
                if (onOpenHowToPlay) onOpenHowToPlay();
              }}
            >
              <HelpCircle size={20} />
              <span>HOW TO PLAY</span>
            </button>
          </div>
        )}

        {/* Footer Note */}
        <div className="menu-footer">
          <span>CrazyGames Multiplayer • Server Authoritative • TypeScript</span>
        </div>
      </div>
    </div>
  );
};
