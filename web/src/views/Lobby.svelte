<script lang="ts">
  import { Check, Crown, Gauge, Radio, UserRound, UsersRound } from 'lucide-svelte';
  import type { GameClient } from '../lib/game.svelte';

  let { game }: { game: GameClient } = $props();

  const candidates = $derived(game.snap?.players.filter((p) => p.role === 'candidate') ?? []);
  const voters = $derived(game.snap?.players.filter((p) => p.role === 'voter') ?? []);
  const canStart = $derived(
    !!game.snap &&
      game.isHost &&
      candidates.length >= game.snap.config.minCandidates &&
      voters.length >= 1 &&
      game.snap.players.every((p) => p.id === game.snap?.hostId || p.ready),
  );
</script>

<section class="lobby-layout">
  <div>
    <span class="kicker">候選人進棚</span>
    <h2 class="display-title">今晚要吵的不是政策，是誰能活到下一輪。</h2>
    <p class="lead">房主確認候選人席、民眾席與 ready 狀態。所有玩家準備後，節目才能進入議題揭露。</p>

    <div class="role-switch">
      <button class:active={game.me?.role === 'candidate'} onclick={() => game.setRole('candidate')}>
        <UserRound size={18} />
        候選人
      </button>
      <button class:active={game.me?.role === 'voter'} onclick={() => game.setRole('voter')}>
        <UsersRound size={18} />
        民眾
      </button>
    </div>

    <div class="candidate-grid">
      {#each game.snap?.players ?? [] as player, i (player.id)}
        <article class="candidate-card" data-number={String(i + 1).padStart(2, '0')}>
          <div class="candidate-top">
            <div class="avatar">{player.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <h3 class="candidate-name">
                {player.name}
                {#if player.id === game.snap?.hostId}
                  <Crown size={18} aria-label="host" />
                {/if}
              </h3>
              <p class="candidate-slogan">
                {player.role === 'candidate' ? '候選人席' : '民眾席'} · {player.connected ? '連線正常' : '暫時離線'}
              </p>
            </div>
          </div>
          <div class="candidate-meta">
            <span
              class="mini-pill"
              class:is-ready={player.ready || player.id === game.snap?.hostId}
              class:is-live={!player.connected}
            >
              <span class="dot"></span>
              {player.id === game.snap?.hostId ? '房主待命' : player.ready ? '已準備' : '等待準備'}
            </span>
            <div class="meter is-warn" aria-label="ready meter">
              <span style={`--value: ${player.ready || player.id === game.snap?.hostId ? 100 : 35}%`}></span>
            </div>
          </div>
        </article>
      {/each}
    </div>
  </div>

  <aside class="panel checklist-panel">
    <div class="panel-header">
      <div>
        <p class="eyebrow">Lobby</p>
        <h2>候選人與民眾</h2>
    </div>
    <div class="status" data-on={game.connected}>
      <Radio size={16} />
      {game.connected ? 'online' : 'offline'}
    </div>
    </div>
    <div class="panel-body">
      <button class="primary-action" onclick={() => game.ready(!game.me?.ready)} disabled={game.isHost}>
        <Check size={20} />
        {game.isHost ? '房主待命' : game.me?.ready ? '取消 ready' : '我已準備'}
      </button>
      <ul class="rule-list">
        <li>
          <span class="mini-pill" class:is-success={candidates.length >= (game.snap?.config.minCandidates ?? 2)}>
            <span class="dot"></span>候選
          </span>
          {candidates.length} / {game.snap?.config.minCandidates ?? 2} 候選人
        </li>
        <li>
          <span class="mini-pill" class:is-success={voters.length >= 1}><span class="dot"></span>民眾</span>
          {voters.length} 人在民眾席
        </li>
        <li>
          <span class="mini-pill" class:is-success={canStart}><span class="dot"></span>開播</span>
          非房主玩家需完成 ready
        </li>
      </ul>
      <div class="action-row">
        {#if game.isHost}
          <button class="secondary-action" onclick={() => game.quickConfig()}>
            <Gauge size={18} />
            快速測試
          </button>
        {/if}
        <button class="primary-action ready" onclick={() => game.start()} disabled={!canStart}>
          <Radio size={20} />
          開始
        </button>
      </div>
    </div>
  </aside>
</section>
