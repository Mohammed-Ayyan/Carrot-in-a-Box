import React, { useEffect, useRef, useState } from 'react';
import { localGameEngine } from './game/LocalGameEngine';
import { remoteGameEngine } from './game/RemoteGameEngine';
import { IGameEngine, GameStateData } from './game/types';
import { createSession, isMultiplayerEnabled, getServerUrl } from './game/sessionApi';
import { SceneCanvas } from './components/scene/SceneCanvas';
import { MainMenu } from './components/ui/MainMenu';
import { GameHUD } from './components/ui/GameHUD';
import { ResultOverlay } from './components/ui/ResultOverlay';
import './styles/main.css';

import { HowToPlayModal } from './components/ui/HowToPlayModal';
import { VoiceSetupModal } from './components/ui/VoiceSetupModal';
import { platformService } from './platform/PlatformService';

const MULTIPLAYER = isMultiplayerEnabled();

export const App: React.FC = () => {
  const [activeEngine, setActiveEngine] = useState<IGameEngine>(
    MULTIPLAYER ? remoteGameEngine : localGameEngine
  );
  const [gameState, setGameState] = useState<GameStateData>(activeEngine.getState());
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Matchmaking Bot Fallback states
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [showBotFallbackPrompt, setShowBotFallbackPrompt] = useState(false);
  const searchTimerRef = useRef<number | null>(null);
  const currentNicknameRef = useRef<string>('Player');

  const connectedRef = useRef(false);

  // Subscribe state updates to the currently active engine
  useEffect(() => {
    const unsub = activeEngine.subscribe((newState) => {
      setGameState(newState);
    });
    return unsub;
  }, [activeEngine]);

  useEffect(() => {
    platformService.loadingStart();
    platformService.init().then(() => {
      platformService.loadingStop();
      // 1. Instant Multiplayer launch
      if (platformService.isInstantMultiplayer() && MULTIPLAYER) {
        handleCreateRoom(platformService.getUsername() || 'Player');
        return;
      }

      // 2. Invite parameters launch
      const inviteCode = platformService.getInviteRoomCode();
      if (inviteCode && MULTIPLAYER) {
        handleJoinRoom(platformService.getUsername() || 'Player', inviteCode);
      }
    }).catch((err) => {
      platformService.loadingStop();
      console.warn('[App] Platform initialization completed with error fallback:', err);
    });

    // 3. Register live CrazyGames Room Join Listener
    const unsubJoin = platformService.listenForRoomJoin((targetRoomCode) => {
      if (targetRoomCode && MULTIPLAYER) {
        console.log('[App] Auto-joining room from live room join event:', targetRoomCode);
        handleJoinRoom(platformService.getUsername() || 'Player', targetRoomCode);
      }
    });

    return () => {
      unsubJoin();
    };
  }, []);

  // Prevent default scroll behavior for game control keys inside CrazyGames iframe
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) || [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (!isInput) {
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown, false);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, false);
  }, []);

  // Update CrazyGames Room Status (updateRoom API)
  useEffect(() => {
    const roomId = gameState.roomCode;
    const status = gameState.status;
    const lobbyState = gameState.lobbyState;

    const isJoinable =
      lobbyState === 'CREATE_WAITING' ||
      status === 'WAITING' ||
      status === 'RESULT';

    platformService.updateRoom(roomId, isJoinable);
  }, [gameState.roomCode, gameState.status, gameState.lobbyState]);

  // Handle Matchmaking timer for Bot Fallback Prompt
  const stopSearchTimer = () => {
    if (searchTimerRef.current) {
      clearInterval(searchTimerRef.current);
      searchTimerRef.current = null;
    }
  };

  const startSearchTimer = () => {
    stopSearchTimer();
    setSearchSeconds(0);
    setShowBotFallbackPrompt(false);

    searchTimerRef.current = window.setInterval(() => {
      setSearchSeconds((prev) => {
        const next = prev + 1;
        if (next >= 25) {
          setShowBotFallbackPrompt(true);
        }
        return next;
      });
    }, 1000);
  };

  useEffect(() => {
    if (gameState.lobbyState !== 'SEARCHING' && gameState.status !== 'WAITING') {
      stopSearchTimer();
      setShowBotFallbackPrompt(false);
    }
  }, [gameState.lobbyState, gameState.status]);

  const ensureConnected = async (nickname: string) => {
    if (!connectedRef.current) {
      try {
        const session = await createSession(nickname || 'Player');
        await remoteGameEngine.connect(getServerUrl(), session.sessionToken);
        connectedRef.current = true;

        remoteGameEngine.onError((err) => {
          setErrorMessage(err.message);
          setConnecting(false);
        });
      } catch (err) {
        connectedRef.current = false;
        throw err;
      }
    }
  };

  // Mode 1: PLAY VS BOT
  const handlePlayVsBot = (nickname: string) => {
    stopSearchTimer();
    setErrorMessage(null);
    setConnecting(false);
    currentNicknameRef.current = nickname;
    localGameEngine.setPlayerName(nickname);
    localGameEngine.startGame();
    setActiveEngine(localGameEngine);
  };

  // Mode 2: PLAY ONLINE
  const handlePlayOnline = async (nickname: string) => {
    setErrorMessage(null);
    setConnecting(true);
    currentNicknameRef.current = nickname;
    try {
      await ensureConnected(nickname);
      setActiveEngine(remoteGameEngine);
      remoteGameEngine.joinMatchmaking();
      startSearchTimer();
      setConnecting(false);
    } catch (err) {
      console.error('[App] Unable to connect to online matchmaking:', err);
      setConnecting(false);
      setErrorMessage('Unable to connect to online matchmaking. Please try again.');
    }
  };

  // Mode 3: CREATE ROOM
  const handleCreateRoom = async (nickname: string) => {
    if (!MULTIPLAYER) return;
    setErrorMessage(null);
    setConnecting(true);
    currentNicknameRef.current = nickname;
    try {
      await ensureConnected(nickname);
      setActiveEngine(remoteGameEngine);
      remoteGameEngine.createRoom();
      setConnecting(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create room');
      setConnecting(false);
    }
  };

  // Mode 4: JOIN ROOM
  const handleJoinRoom = async (nickname: string, roomCode: string) => {
    if (!MULTIPLAYER) return;
    setErrorMessage(null);
    setConnecting(true);
    currentNicknameRef.current = nickname;
    try {
      await ensureConnected(nickname);
      setActiveEngine(remoteGameEngine);
      remoteGameEngine.joinRoomByCode(roomCode);
      setConnecting(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to join room');
      setConnecting(false);
    }
  };

  const handleCancelSearch = () => {
    stopSearchTimer();
    if (MULTIPLAYER) {
      remoteGameEngine.leaveMatchmaking();
    }
    setConnecting(false);
  };

  const handleAcceptBotFallback = () => {
    stopSearchTimer();
    if (MULTIPLAYER) {
      remoteGameEngine.leaveMatchmaking();
    }
    handlePlayVsBot(currentNicknameRef.current);
  };

  const handleKeepWaiting = () => {
    setShowBotFallbackPrompt(false);
  };

  const onMenu =
    gameState.status === 'MENU' ||
    gameState.status === 'WAITING' ||
    gameState.lobbyState === 'CREATE_WAITING' ||
    gameState.lobbyState === 'SEARCHING' ||
    gameState.lobbyState === 'JOIN_INPUT';

  // Track CrazyGames gameplay lifecycle
  useEffect(() => {
    if (!onMenu) {
      platformService.gameplayStart();
      if (activeEngine === remoteGameEngine) {
        remoteGameEngine.checkTutorialNeeded();
      }
    } else {
      platformService.gameplayStop();
    }
  }, [onMenu, activeEngine]);

  const showVoiceSetup = MULTIPLAYER && !onMenu && activeEngine === remoteGameEngine && gameState.voiceSetupStatus === 'PENDING';

  return (
    <div className="app-container">
      {/* 3D Scene Layer */}
      <SceneCanvas gameState={gameState} />

      {/* 2D UI Overlays */}
      {onMenu && (
        <MainMenu
          gameState={gameState}
          onPlayVsBot={handlePlayVsBot}
          onPlayOnline={handlePlayOnline}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onCancelSearch={handleCancelSearch}
          onAcceptBotFallback={handleAcceptBotFallback}
          onKeepWaiting={handleKeepWaiting}
          showBotFallbackPrompt={showBotFallbackPrompt}
          searchSeconds={searchSeconds}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          isMuted={gameState.isMuted}
          onToggleMute={() => activeEngine.toggleMute()}
          connecting={connecting}
          errorMessage={errorMessage}
        />
      )}

      {/* How To Play Modal */}
      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}

      {/* Pre-game Voice Setup Modal */}
      {showVoiceSetup && (
        <VoiceSetupModal
          voiceSetupStatus={gameState.voiceSetupStatus}
          voiceState={gameState.voiceState}
          onEnableMic={() => remoteGameEngine.requestVoicePermission()}
          onSkipVoice={() => remoteGameEngine.skipVoiceSetup()}
        />
      )}

      {!onMenu && (
        <GameHUD
          gameState={gameState}
          onMakeChoice={(choice) => activeEngine.makeChoice(choice)}
          onSelectPlayerBluff={(index, statement) => activeEngine.selectPlayerBluff(index, statement)}
          onSendEmote={(emoteId) => activeEngine.sendEmote(emoteId)}
          onToggleMute={() => activeEngine.toggleMute()}
          onToggleDebugVisibility={() =>
            'toggleDebugVisibility' in activeEngine &&
            (activeEngine as { toggleDebugVisibility: () => void }).toggleDebugVisibility()
          }
          onToggleVoiceMic={() =>
            'toggleVoiceMic' in activeEngine &&
            (activeEngine as { toggleVoiceMic: () => void }).toggleVoiceMic()
          }
          onToggleChat={() =>
            'toggleChatPanel' in activeEngine &&
            (activeEngine as { toggleChatPanel: () => void }).toggleChatPanel()
          }
          onSendMessage={(text) =>
            'sendChatMessage' in activeEngine &&
            (activeEngine as { sendChatMessage: (t: string) => void }).sendChatMessage(text)
          }
          onCloseTutorial={() =>
            'closeTutorial' in activeEngine &&
            (activeEngine as { closeTutorial: () => void }).closeTutorial()
          }
        />
      )}

      {gameState.status === 'RESULT' && (
        <ResultOverlay
          gameState={gameState}
          onPlayAgain={() => activeEngine.resetRound()}
          onReturnToLobby={() => activeEngine.returnToLobby()}
        />
      )}
    </div>
  );
};

export default App;
