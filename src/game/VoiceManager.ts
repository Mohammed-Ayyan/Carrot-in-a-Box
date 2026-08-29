import { VoiceState } from './types';

export interface VoiceCallbacks {
  onSignalOffer: (sdp: RTCSessionDescriptionInit) => void;
  onSignalAnswer: (sdp: RTCSessionDescriptionInit) => void;
  onSignalIceCandidate: (candidate: RTCIceCandidateInit) => void;
  onVoiceStateChange: (state: VoiceState) => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class VoiceManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private isMuted = false;
  private callbacks: VoiceCallbacks | null = null;
  private state: VoiceState = 'OFF';
  private pendingIceCandidates: RTCIceCandidateInit[] = [];

  public setCallbacks(callbacks: VoiceCallbacks): void {
    this.callbacks = callbacks;
  }

  private updateState(newState: VoiceState): void {
    this.state = newState;
    if (this.callbacks) {
      this.callbacks.onVoiceStateChange(newState);
    }
  }

  public getState(): VoiceState {
    return this.state;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Initialize microphone capture and create RTCPeerConnection.
   */
  public async startVoice(isInitiator: boolean): Promise<void> {
    if (this.peerConnection) {
      this.stopVoice();
    }

    this.updateState('CONNECTING');

    try {
      // 1. Request microphone stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (err) {
      console.warn('[VoiceManager] Microphone access denied or unavailable:', err);
      this.updateState('PERMISSION_DENIED');
      return;
    }

    try {
      // 2. Create RTCPeerConnection
      this.peerConnection = new RTCPeerConnection(RTC_CONFIG);
      this.pendingIceCandidates = [];

      // Add local audio track to connection
      this.localStream.getAudioTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // 3. Handle remote track
      this.peerConnection.ontrack = (event) => {
        console.log('[VoiceManager] Remote audio track received', event.streams);
        if (!this.remoteAudioElement) {
          this.remoteAudioElement = document.createElement('audio');
          this.remoteAudioElement.autoplay = true;
          (this.remoteAudioElement as any).playsInline = true;
          this.remoteAudioElement.style.display = 'none';
          document.body.appendChild(this.remoteAudioElement);
        }
        if (event.streams && event.streams[0]) {
          this.remoteAudioElement.srcObject = event.streams[0];
          this.remoteAudioElement.play().catch((err) => {
            console.warn('[VoiceManager] Audio autoplay deferred:', err);
          });
        }
      };

      // 4. Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.callbacks) {
          this.callbacks.onSignalIceCandidate(event.candidate.toJSON());
        }
      };

      // 5. Connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const connectionState = this.peerConnection?.connectionState;
        console.log('[VoiceManager] PeerConnection state:', connectionState);
        if (connectionState === 'connected') {
          this.updateState(this.isMuted ? 'MUTED' : 'CONNECTED');
        } else if (connectionState === 'failed') {
          this.updateState('FAILED');
        } else if (connectionState === 'disconnected') {
          this.updateState('OFF');
        }
      };

      // 6. If initiator, create offer
      if (isInitiator) {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        if (this.callbacks && this.peerConnection.localDescription) {
          this.callbacks.onSignalOffer(this.peerConnection.localDescription);
        }
      }
    } catch (err) {
      console.error('[VoiceManager] WebRTC setup error:', err);
      this.updateState('FAILED');
    }
  }

  public async handleOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      await this.startVoice(false);
    }
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      await this.flushPendingIceCandidates();
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      if (this.callbacks && this.peerConnection.localDescription) {
        this.callbacks.onSignalAnswer(this.peerConnection.localDescription);
      }
    } catch (err) {
      console.error('[VoiceManager] Failed to handle offer:', err);
      this.updateState('FAILED');
    }
  }

  public async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      await this.flushPendingIceCandidates();
    } catch (err) {
      console.error('[VoiceManager] Failed to handle answer:', err);
    }
  }

  public async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.pendingIceCandidates.push(candidate);
      return;
    }
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('[VoiceManager] Failed to add ICE candidate:', err);
    }
  }

  private async flushPendingIceCandidates(): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[VoiceManager] Failed to add queued ICE candidate:', err);
        }
      }
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
    }
    if (this.state === 'CONNECTED' || this.state === 'MUTED') {
      this.updateState(this.isMuted ? 'MUTED' : 'CONNECTED');
    }
    return this.isMuted;
  }

  public stopVoice(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.remoteAudioElement) {
      this.remoteAudioElement.pause();
      this.remoteAudioElement.srcObject = null;
      this.remoteAudioElement.remove();
      this.remoteAudioElement = null;
    }
    this.pendingIceCandidates = [];
    this.isMuted = false;
    this.updateState('OFF');
  }
}

export const voiceManager = new VoiceManager();
