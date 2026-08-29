import { crazyGamesService } from './crazygames/CrazyGamesService';
import { CrazyGamesSettings } from './crazygames/CrazyGamesTypes';

export type PlatformSettings = CrazyGamesSettings;

class PlatformService {
  public async init(): Promise<void> {
    await crazyGamesService.init();
  }

  public isCrazyGames(): boolean {
    return crazyGamesService.isCrazyGames();
  }

  public getUsername(): string | null {
    return crazyGamesService.getUsername();
  }

  public updateRoom(roomId: string | null, isJoinable: boolean): void {
    crazyGamesService.updateRoom(roomId, isJoinable);
  }

  public createInviteLink(roomCode: string): string {
    return crazyGamesService.createInviteLink(roomCode);
  }

  public getInviteRoomCode(): string | null {
    return crazyGamesService.getInviteRoomCode();
  }

  public isInstantMultiplayer(): boolean {
    return crazyGamesService.isInstantMultiplayer();
  }

  public listenForRoomJoin(callback: (roomCode: string) => void): () => void {
    return crazyGamesService.listenForRoomJoin(callback);
  }

  public gameplayStart(): void {
    crazyGamesService.gameplayStart();
  }

  public gameplayStop(): void {
    crazyGamesService.gameplayStop();
  }

  public getSettings(): PlatformSettings {
    return crazyGamesService.getSettings();
  }

  public subscribeSettings(callback: (settings: PlatformSettings) => void): () => void {
    return crazyGamesService.subscribeSettings(callback);
  }
}

export const platformService = new PlatformService();
