import { CrazyGamesSDK, CrazyGamesSettings } from './CrazyGamesTypes';

class CrazyGamesService {
  private sdk: CrazyGamesSDK | null = null;
  private isInitialized = false;
  private username: string | null = null;
  private currentSettings: CrazyGamesSettings = {
    muteAudio: false,
    disableChat: false,
  };
  private settingsListeners: Set<(settings: CrazyGamesSettings) => void> = new Set();
  private roomJoinListeners: Set<(roomCode: string) => void> = new Set();

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (typeof window !== 'undefined' && window.CrazyGames?.SDK) {
        this.sdk = window.CrazyGames.SDK;
        if (this.sdk.init) {
          await this.sdk.init();
        }
        this.isInitialized = true;
        console.log('[CrazyGames] SDK v3 initialized successfully');

        // Fetch username if available
        if (this.sdk.user?.getUsername) {
          this.username = await this.sdk.user.getUsername().catch(() => null);
        }

        // Initialize settings & listen for live changes
        if (this.sdk.game?.getSettings) {
          this.currentSettings = { ...this.currentSettings, ...this.sdk.game.getSettings() };
        }

        if (this.sdk.game?.onSettingsChange) {
          this.sdk.game.onSettingsChange((newSettings) => {
            this.currentSettings = { ...this.currentSettings, ...newSettings };
            this.notifySettings();
          });
        }

        // Listen for live room join events when invited while in-game
        if (this.sdk.game?.onRoomJoin) {
          this.sdk.game.onRoomJoin((data) => {
            const targetCode = data.roomCode || data.roomId;
            if (targetCode) {
              console.log('[CrazyGames] Live room join event received:', targetCode);
              this.roomJoinListeners.forEach((fn) => fn(targetCode));
            }
          });
        }
      } else {
        console.log('[CrazyGames] Running in standalone web mode (SDK unavailable)');
      }
    } catch (err) {
      console.warn('[CrazyGames] Failed to initialize SDK:', err);
    }
  }

  public isCrazyGames(): boolean {
    return this.sdk !== null;
  }

  public getUsername(): string | null {
    return this.username;
  }

  public updateRoom(roomId: string | null, isJoinable: boolean): void {
    if (!roomId || !this.sdk?.game?.updateRoom) return;
    try {
      console.log(`[CrazyGames] updateRoom -> roomId=${roomId}, isJoinable=${isJoinable}`);
      this.sdk.game.updateRoom({ roomId, isJoinable });
    } catch (err) {
      console.warn('[CrazyGames] updateRoom error:', err);
    }
  }

  public createInviteLink(roomCode: string): string {
    if (this.sdk?.game?.inviteLink) {
      try {
        return this.sdk.game.inviteLink({ room: roomCode });
      } catch {}
    }
    // Fallback standard URL with room query parameter
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomCode);
      return url.toString();
    }
    return roomCode;
  }

  public getInviteRoomCode(): string | null {
    // 1. Check CrazyGames SDK data module
    if (this.sdk?.data?.getInviteParam) {
      const param = this.sdk.data.getInviteParam('room') || this.sdk.data.getInviteParam('roomId');
      if (param) return param.trim().toUpperCase();
    }

    // 2. Check URL query parameters (?room=CODE or ?invite=CODE)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('room') || params.get('invite') || params.get('roomId');
      if (code) return code.trim().toUpperCase();
    }

    return null;
  }

  public isInstantMultiplayer(): boolean {
    if (this.sdk?.data?.isInstantMultiplayer) {
      try {
        return this.sdk.data.isInstantMultiplayer();
      } catch {}
    }
    // Fallback check URL parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('instant') === 'true';
    }
    return false;
  }

  public listenForRoomJoin(callback: (roomCode: string) => void): () => void {
    this.roomJoinListeners.add(callback);
    return () => {
      this.roomJoinListeners.delete(callback);
    };
  }

  public gameplayStart(): void {
    if (this.sdk?.game?.gameplayStart) {
      try {
        this.sdk.game.gameplayStart();
      } catch {}
    }
  }

  public gameplayStop(): void {
    if (this.sdk?.game?.gameplayStop) {
      try {
        this.sdk.game.gameplayStop();
      } catch {}
    }
  }

  public getSettings(): CrazyGamesSettings {
    return { ...this.currentSettings };
  }

  public subscribeSettings(callback: (settings: CrazyGamesSettings) => void): () => void {
    this.settingsListeners.add(callback);
    callback(this.getSettings());
    return () => {
      this.settingsListeners.delete(callback);
    };
  }

  private notifySettings(): void {
    const settings = this.getSettings();
    this.settingsListeners.forEach((fn) => fn(settings));
  }
}

export const crazyGamesService = new CrazyGamesService();
