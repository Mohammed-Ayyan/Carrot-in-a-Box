/**
 * TypeScript definitions for CrazyGames HTML5 SDK v3
 */

export interface CrazyGamesUser {
  username: string;
  profilePictureUrl?: string;
}

export interface CrazyGamesRoomOptions {
  roomId: string;
  isJoinable: boolean;
}

export interface CrazyGamesSettings {
  muteAudio: boolean;
  disableChat: boolean;
}

export interface CrazyGamesSDK {
  init?: () => Promise<void>;
  user?: {
    isUserLoggedIn: () => Promise<boolean>;
    getUsername: () => Promise<string | null>;
    getSystemInfo?: () => any;
  };
  game?: {
    gameplayStart: () => void;
    gameplayStop: () => void;
    updateRoom: (options: CrazyGamesRoomOptions) => void;
    inviteLink: (params: Record<string, string>) => string;
    showInviteButton: (params: Record<string, string>) => void;
    hideInviteButton: () => void;
    onRoomJoin: (callback: (data: { roomId?: string; roomCode?: string }) => void) => () => void;
    onSettingsChange: (callback: (settings: Partial<CrazyGamesSettings>) => void) => () => void;
    getSettings: () => CrazyGamesSettings;
  };
  data?: {
    getInviteParam: (key: string) => string | null;
    getInviteParams: () => Record<string, string>;
    isInstantMultiplayer: () => boolean;
  };
}

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: CrazyGamesSDK;
    };
  }
}
