import { CrazyGamesSDK, CrazyGamesSettings } from './CrazyGamesTypes';
import { audioManager } from '../../audio/audioManager';

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
        const rawSdk = window.CrazyGames.SDK;
        const env = rawSdk.environment;

        // The SDK environment will be 'local', 'crazygames', or 'disabled' on normal domains (such as Vercel).
        // If SDK is present and environment is NOT 'disabled', initialize the SDK!
        if (env !== 'disabled') {
          this.sdk = rawSdk;
          if (typeof this.sdk.init === 'function') {
            await this.sdk.init();
          }
          this.isInitialized = true;
          console.log(`[CrazyGames] SDK v3 initialized successfully (environment: "${env || 'active'}")`);

          // Fetch username if available
          if (this.sdk.user?.getUsername) {
            this.username = await this.sdk.user.getUsername().catch(() => null);
          }

          // Initialize settings & listen for live changes
          if (this.sdk.game?.getSettings) {
            this.currentSettings = { ...this.currentSettings, ...this.sdk.game.getSettings() };
            if (typeof this.currentSettings.muteAudio === 'boolean') {
              audioManager.setMuted(this.currentSettings.muteAudio);
            }
          }

          if (this.sdk.game?.onSettingsChange) {
            this.sdk.game.onSettingsChange((newSettings) => {
              this.currentSettings = { ...this.currentSettings, ...newSettings };
              if (typeof newSettings.muteAudio === 'boolean') {
                audioManager.setMuted(newSettings.muteAudio);
              }
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
          console.log(`[CrazyGames] SDK environment is "${env || 'disabled'}" — skipping SDK initialization for standard web deployment.`);
          this.sdk = null;
          this.isInitialized = true;
        }
      } else {
        console.log('[CrazyGames] Running in standalone web mode (SDK script unavailable)');
        this.sdk = null;
        this.isInitialized = true;
      }
    } catch (err) {
      console.warn('[CrazyGames] SDK initialization failed or was disabled:', err);
      this.sdk = null;
      this.isInitialized = true;
    }
  }

  public isAvailable(): boolean {
    return this.isInitialized && this.sdk !== null;
  }

  public isCrazyGames(): boolean {
    return this.isAvailable();
  }

  public getUsername(): string | null {
    return this.username;
  }

  public updateRoom(roomId: string | null, isJoinable: boolean): void {
    if (!roomId || !this.isAvailable() || !this.sdk?.game?.updateRoom) return;
    try {
      console.log(`[CrazyGames] updateRoom -> roomId=${roomId}, isJoinable=${isJoinable}`);
      this.sdk.game.updateRoom({ roomId, isJoinable });
    } catch (err) {
      console.warn('[CrazyGames] updateRoom error:', err);
    }
  }

  public createInviteLink(roomCode: string): string {
    if (this.isAvailable() && this.sdk?.game?.inviteLink) {
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
    // 1. Check CrazyGames SDK data module if available
    if (this.isAvailable() && this.sdk?.data?.getInviteParam) {
      try {
        const param = this.sdk.data.getInviteParam('room') || this.sdk.data.getInviteParam('roomId');
        if (param) return param.trim().toUpperCase();
      } catch {}
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
    if (this.isAvailable() && this.sdk?.data?.isInstantMultiplayer) {
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
    if (this.isAvailable() && this.sdk?.game?.gameplayStart) {
      try {
        this.sdk.game.gameplayStart();
      } catch (err) {
        console.warn('[CrazyGames] gameplayStart error:', err);
      }
    }
  }

  public gameplayStop(): void {
    if (this.isAvailable() && this.sdk?.game?.gameplayStop) {
      try {
        this.sdk.game.gameplayStop();
      } catch (err) {
        console.warn('[CrazyGames] gameplayStop error:', err);
      }
    }
  }

  public loadingStart(): void {
    if (this.isAvailable() && this.sdk?.game?.loadingStart) {
      try {
        this.sdk.game.loadingStart();
      } catch (err) {
        console.warn('[CrazyGames] loadingStart error:', err);
      }
    }
  }

  public loadingStop(): void {
    if (this.isAvailable() && this.sdk?.game?.loadingStop) {
      try {
        this.sdk.game.loadingStop();
      } catch (err) {
        console.warn('[CrazyGames] loadingStop error:', err);
      }
    }
  }

  public async requestAd(adType: 'midgame' | 'rewarded' = 'midgame'): Promise<void> {
    if (!this.isAvailable() || !this.sdk?.ad?.requestAd) return;
    const wasMuted = audioManager.isMuted();
    audioManager.setMuted(true);

    return new Promise((resolve) => {
      try {
        this.sdk!.ad!.requestAd(adType, {
          adStarted: () => console.log(`[CrazyGames] ${adType} ad started`),
          adFinished: () => {
            console.log(`[CrazyGames] ${adType} ad finished`);
            audioManager.setMuted(wasMuted);
            resolve();
          },
          adError: (error) => {
            console.warn(`[CrazyGames] ${adType} ad error:`, error);
            audioManager.setMuted(wasMuted);
            resolve();
          },
        });
      } catch (err) {
        console.warn(`[CrazyGames] ${adType} ad exception:`, err);
        audioManager.setMuted(wasMuted);
        resolve();
      }
    });
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
