import { Room, RoomEvent, Track, type Participant, type TrackPublication } from 'livekit-client';

export class VoiceClient {
  #room: Room | null = null;

  connected = $state(false);
  micEnabled = $state(false);
  canPlaybackAudio = $state(true);
  activeSpeakers = $state<Set<string>>(new Set());
  error = $state<string | null>(null);

  async connect(lkUrl: string, token: string) {
    this.destroy();
    this.error = null;

    if (!lkUrl || !token) {
      this.error = 'Voice not configured';
      return;
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    room.on(RoomEvent.Connected, () => {
      this.connected = true;
      this.micEnabled = room.localParticipant.isMicrophoneEnabled;
    });

    room.on(RoomEvent.Disconnected, () => {
      this.connected = false;
      this.micEnabled = false;
      this.activeSpeakers = new Set();
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      this.activeSpeakers = new Set(speakers.map((s) => s.identity));
    });

    room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      this.canPlaybackAudio = room.canPlaybackAudio;
    });

    // 當有 remote audio track 被訂閱時，嘗試播放（初始 startAudio 可能空跑）
    room.on(RoomEvent.TrackSubscribed, (track: any) => {
      if (track.kind === Track.Kind.Audio) {
        this.startAudio();
      }
    });

    room.on(RoomEvent.TrackMuted, () => {
      this.micEnabled = room.localParticipant.isMicrophoneEnabled;
    });
    room.on(RoomEvent.TrackUnmuted, () => {
      this.micEnabled = room.localParticipant.isMicrophoneEnabled;
    });

    try {
      await room.connect(lkUrl, token);
      this.#room = room;
      this.canPlaybackAudio = room.canPlaybackAudio;

      // 預設開啟麥克風（AudioContext 由 user gesture 喚醒）
      await room.localParticipant.setMicrophoneEnabled(true).catch(() => {});
      this.micEnabled = true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Voice connection failed';
      room.disconnect();
    }
  }

  async startAudio() {
    try {
      await this.#room?.startAudio();
    } catch (e) {
      console.warn('[Voice] startAudio failed — browser may block autoplay:', e);
    }
  }

  async toggleMic() {
    if (!this.#room) return;
    try {
      await this.startAudio();
      const next = !this.micEnabled;
      await this.#room.localParticipant.setMicrophoneEnabled(next);
      this.micEnabled = next;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Mic toggle failed';
    }
  }

  destroy() {
    if (this.#room) {
      this.#room.disconnect();
      this.#room = null;
    }
    this.connected = false;
    this.micEnabled = false;
    this.activeSpeakers = new Set();
    this.error = null;
  }
}
