import { IGameEngine, GameStateData, PlayerChoice, Peeker, StateChangeListener, EmoteId } from './types';
import { getCarrotBox } from './gameLogic';
import { generateBluff, decideAiChoice } from './aiOpponent';
import { audioManager } from '../audio/audioManager';
import confetti from 'canvas-confetti';

export class LocalGameEngine implements IGameEngine {
  private state: GameStateData;
  private listeners: Set<StateChangeListener> = new Set();
  private timerIds: number[] = [];

  constructor() {
    this.state = {
      status: 'MENU',
      peeker: 'OPPONENT',
      playerBox: 'BOX_B',
      opponentBox: 'BOX_A',
      carrotBox: 'BOX_A',
      bluffText: '',
      playerBluffIndex: null,
      opponentSawCarrot: false,
      playerSawCarrot: false,
      playerChoice: null,
      aiChoice: null,
      winner: null,
      round: 1,
      score: {
        player: 0,
        opponent: 0
      },
      isMuted: audioManager.isMuted(),
      debugVisibility: false,
      activeEmote: null,
      playerName: 'You',
      opponentName: 'BOT',
      roomCode: null,
      lobbyState: 'MAIN_MENU',
      voiceState: 'OFF',
      voiceSetupStatus: 'GRANTED',
      isMicMuted: false,
      peerMicMuted: false,
      chatMessages: [],
      unreadChatCount: 0,
      isChatOpen: false,
      showTutorial: false,
      phaseSecondsRemaining: null,
      playerBoxHasCarrot: null,
      isRevealed: false
    };
  }

  /**
   * Local engine derives the player's private peek result from carrotBox,
   * but ONLY for the player's own box (never leaks opponent box contents).
   */
  private computePlayerBoxHasCarrot(): boolean {
    return this.state.carrotBox === this.state.playerBox;
  }

  public setPlayerName(name: string): void {
    this.state.playerName = name || 'You';
    this.notify();
  }

  public returnToLobby(): void {
    this.clearTimers();
    this.state = {
      ...this.state,
      status: 'MENU',
      lobbyState: 'MAIN_MENU',
      round: 1,
      score: { player: 0, opponent: 0 },
    };
    this.notify();
  }

  public getState(): GameStateData {
    return { ...this.state };
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => listener(currentState));
  }

  private clearTimers() {
    this.timerIds.forEach((id) => clearTimeout(id));
    this.timerIds = [];
  }

  public startGame(): void {
    this.startRoundPipeline(1, { player: 0, opponent: 0 });
  }

  public resetRound(): void {
    this.startRoundPipeline(this.state.round + 1, this.state.score);
  }

  private startRoundPipeline(roundNumber: number, currentScore: { player: number; opponent: number }) {
    this.clearTimers();
    audioManager.playClick();

    // 50/50 Coin Flip to determine who peeks this round
    const peeker: Peeker = Math.random() < 0.5 ? 'PLAYER' : 'OPPONENT';
    const carrotBox = getCarrotBox();
    const opponentBox = 'BOX_A';
    const playerBox = 'BOX_B';

    const opponentSawCarrot = peeker === 'OPPONENT' && carrotBox === opponentBox;
    const playerSawCarrot = peeker === 'PLAYER' && carrotBox === playerBox;
    const bluffText = peeker === 'OPPONENT' ? generateBluff(opponentSawCarrot) : '';

    // 1. DEALING Phase
    this.state = {
      ...this.state,
      status: 'DEALING',
      peeker,
      playerBox: 'BOX_B',
      opponentBox: 'BOX_A',
      carrotBox,
      bluffText,
      playerBluffIndex: null,
      opponentSawCarrot,
      playerSawCarrot,
      playerChoice: null,
      aiChoice: null,
      winner: null,
      round: roundNumber,
      score: currentScore,
      playerBoxHasCarrot: null,
      isRevealed: false
    };
    this.notify();

    if (peeker === 'OPPONENT') {
      // --- OPPONENT IS PEEKER BRANCH ---
      const t1 = window.setTimeout(() => {
        audioManager.playLidOpen();
        this.state = { ...this.state, status: 'PEEKING' };
        this.notify();

        const t2 = window.setTimeout(() => {
          audioManager.playClick();
          this.state = { ...this.state, status: 'BLUFF' };
          this.notify();

          const t3 = window.setTimeout(() => {
            this.state = { ...this.state, status: 'DECISION' };
            this.notify();
          }, 1800);
          this.timerIds.push(t3);
        }, 1600);
        this.timerIds.push(t2);
      }, 700);
      this.timerIds.push(t1);

    } else {
      // --- PLAYER IS PEEKER BRANCH ---
      const t1 = window.setTimeout(() => {
        audioManager.playLidOpen();
        // Player peeks their own box: reveal the PRIVATE result for their own box only.
        this.state = {
          ...this.state,
          status: 'PLAYER_PEEKING',
          playerBoxHasCarrot: this.computePlayerBoxHasCarrot()
        };
        this.notify();

        const t2 = window.setTimeout(() => {
          audioManager.playClick();
          this.state = { ...this.state, status: 'PLAYER_BLUFFING' };
          this.notify();
        }, 2200);
        this.timerIds.push(t2);
      }, 700);
      this.timerIds.push(t1);
    }
  }

  /**
   * Called when Player is the Chooser (Opponent peeked) and selects SWAP or KEEP
   */
  public makeChoice(choice: PlayerChoice): void {
    if (this.state.status !== 'DECISION') return;

    this.clearTimers();
    audioManager.playClick();

    const isSwap = choice === 'SWAP';
    const newPlayerBox = isSwap ? this.state.opponentBox : this.state.playerBox;
    const newOpponentBox = isSwap ? this.state.playerBox : this.state.opponentBox;

    this.state = {
      ...this.state,
      playerChoice: choice,
      playerBox: newPlayerBox,
      opponentBox: newOpponentBox,
      playerBoxHasCarrot: isSwap && this.state.playerBoxHasCarrot !== null ? (newPlayerBox === this.state.carrotBox) : this.state.playerBoxHasCarrot,
      status: isSwap ? 'SWAPPING' : 'REVEALING',
      isRevealed: !isSwap
    };
    this.notify();

    const swapDelay = isSwap ? 1000 : 0;

    const t1 = window.setTimeout(() => {
      audioManager.playLidOpen();
      if (isSwap) {
        this.state = { ...this.state, status: 'REVEALING', isRevealed: true };
        this.notify();
      }

      const t2 = window.setTimeout(() => {
        this.finishRound();
      }, 1200);
      this.timerIds.push(t2);
    }, swapDelay);

    this.timerIds.push(t1);
  }

  /**
   * Called when Player is the Peeker and selects a Bluff Statement to send to AI
   */
  public selectPlayerBluff(bluffIndex: number, statement: string): void {
    if (this.state.status !== 'PLAYER_BLUFFING') return;

    this.clearTimers();
    audioManager.playClick();

    this.state = {
      ...this.state,
      playerBluffIndex: bluffIndex,
      bluffText: statement,
      status: 'AI_THINKING'
    };
    this.notify();

    // 1. AI Contemplates Player's Bluff (~1600ms)
    const t1 = window.setTimeout(() => {
      const aiChoice = decideAiChoice(bluffIndex, this.state.playerSawCarrot);
      const isSwap = aiChoice === 'SWAP';
      const newPlayerBox = isSwap ? this.state.opponentBox : this.state.playerBox;
      const newOpponentBox = isSwap ? this.state.playerBox : this.state.opponentBox;

      audioManager.playClick();
      this.state = {
        ...this.state,
        aiChoice,
        playerBox: newPlayerBox,
        opponentBox: newOpponentBox,
        playerBoxHasCarrot: isSwap && this.state.playerBoxHasCarrot !== null ? (newPlayerBox === this.state.carrotBox) : this.state.playerBoxHasCarrot,
        status: 'AI_DECISION'
      };
      this.notify();

      // 2. AI Choice Announced -> Transition to SWAPPING or REVEALING
      const t2 = window.setTimeout(() => {
        if (isSwap) {
          this.state = { ...this.state, status: 'SWAPPING' };
          this.notify();
        }

        const swapDelay = isSwap ? 1000 : 0;

        const t3 = window.setTimeout(() => {
          audioManager.playLidOpen();
          this.state = { ...this.state, status: 'REVEALING', isRevealed: true };
          this.notify();

          const t4 = window.setTimeout(() => {
            this.finishRound();
          }, 1200);
          this.timerIds.push(t4);
        }, swapDelay);

        this.timerIds.push(t3);
      }, 1500);

      this.timerIds.push(t2);
    }, 1600);

    this.timerIds.push(t1);
  }

  private finishRound() {
    const isPlayerWinner = this.state.playerBox === this.state.carrotBox;
    const winner = isPlayerWinner ? 'PLAYER' : 'OPPONENT';

    if (isPlayerWinner) {
      audioManager.playCarrotReveal();
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.6 }
      });
    } else {
      audioManager.playEmptyReveal();
    }

    this.state = {
      ...this.state,
      status: 'RESULT',
      winner,
      isRevealed: true,
      score: {
        player: this.state.score.player + (isPlayerWinner ? 1 : 0),
        opponent: this.state.score.opponent + (isPlayerWinner ? 0 : 1)
      }
    };
    this.notify();
  }

  public sendEmote(emoteId: EmoteId): void {
    audioManager.playClick();
    this.state = {
      ...this.state,
      activeEmote: { sender: 'PLAYER', emoteId, timestamp: Date.now() },
    };
    this.notify();

    // AI Opponent subtle counter emote reaction (35% probability)
    if (Math.random() < 0.35) {
      window.setTimeout(() => {
        const aiEmotes: EmoteId[] = ['🤔', '😏', '😎', '🤥', '🥕', '🔥', '👀'];
        const randomEmote = aiEmotes[Math.floor(Math.random() * aiEmotes.length)];
        this.state = {
          ...this.state,
          activeEmote: { sender: 'OPPONENT', emoteId: randomEmote, timestamp: Date.now() },
        };
        this.notify();
      }, 1400);
    }
  }

  public toggleMute(): void {
    const isMuted = audioManager.toggleMute();
    this.state = {
      ...this.state,
      isMuted
    };
    this.notify();
  }

  public toggleDebugVisibility(): void {
    this.state = {
      ...this.state,
      debugVisibility: !this.state.debugVisibility
    };
    this.notify();
  }

  public getIsMuted(): boolean {
    return this.state.isMuted;
  }
}

export const localGameEngine = new LocalGameEngine();
