import type { C2S, RoomSnapshot, S2C } from 'shared/protocol';
import { VoiceClient } from './voice.svelte';

export class GameClient {
  snap = $state<RoomSnapshot | null>(null);
  offset = $state(0);
  now = $state(Date.now());
  connected = $state(false);
  lastError = $state<string | null>(null);

  lkUrl = $state('');
  voiceToken = $state<string | null>(null);
  voice = new VoiceClient();

  me = $derived(this.snap?.players.find((p) => p.id === this.snap?.you) ?? null);
  isHost = $derived(!!this.snap && this.snap.you === this.snap.hostId);
  remainingMs = $derived(
    this.snap?.phaseEndsAt ? Math.max(0, this.snap.phaseEndsAt - (this.now + this.offset)) : 0,
  );
  clock = $derived(
    `${Math.floor(this.remainingMs / 60_000)}:${String(Math.floor((this.remainingMs % 60_000) / 1000)).padStart(2, '0')}`,
  );

  #ws: WebSocket | null = null;
  #tick: ReturnType<typeof setInterval> | null = null;

  connect(roomId: string, voiceOpts?: { lkUrl: string; voiceToken: string | null }) {
    this.destroy();
    this.lkUrl = voiceOpts?.lkUrl ?? '';
    this.voiceToken = voiceOpts?.voiceToken ?? null;

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const wsPath = import.meta.env.VITE_WS_PATH ?? '/ws';
    this.#ws = new WebSocket(`${protocol}://${location.host}${wsPath}?room=${roomId}`);
    this.#ws.onopen = () => {
      this.connected = true;
      this.lastError = null;
    };
    this.#ws.onclose = () => {
      this.connected = false;
    };
    this.#ws.onerror = () => {
      this.lastError = 'WebSocket connection failed';
    };
    this.#ws.onmessage = (e) => {
      const msg = JSON.parse(e.data) as S2C;
      if (msg.t === 'state') {
        this.snap = msg.state;
        this.offset = msg.state.serverNow - Date.now();
      }
      if (msg.t === 'error') this.lastError = msg.msg;
      if (msg.t === 'closed') {
        this.lastError = msg.msg;
        this.snap = null;
      }
    };
    this.#tick = setInterval(() => (this.now = Date.now()), 200);

    if (this.lkUrl && this.voiceToken) {
      this.voice.connect(this.lkUrl, this.voiceToken);
    }
  }

  send(m: C2S) {
    this.#ws?.send(JSON.stringify(m));
  }

  setRole(role: 'candidate' | 'voter') {
    this.send({ t: 'set_role', role });
  }

  ready(ready: boolean) {
    this.send({ t: 'ready', ready });
  }

  start() {
    this.send({ t: 'start' });
  }

  restart() {
    this.send({ t: 'restart' });
  }

  earlyEnd(agree: boolean) {
    this.send({ t: 'early_end', agree });
  }

  vote(candidateId: string) {
    this.send({ t: 'vote', candidateId });
  }

  quickConfig() {
    this.send({
      t: 'config',
      patch: {
        topicRevealMs: 2_000,
        debateMs: 300_000,
        tiebreakDebateMs: 120_000,
        votingMs: 20_000,
        resultMs: 2_000,
      },
    });
  }

  destroy() {
    this.#ws?.close();
    this.#ws = null;
    if (this.#tick) clearInterval(this.#tick);
    this.#tick = null;
    this.connected = false;
    this.voice.destroy();
  }
}
