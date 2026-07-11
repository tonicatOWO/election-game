<script lang="ts">
  import { Mic, MicOff, TimerOff, Volume2 } from 'lucide-svelte';
  import type { GameClient } from '../lib/game.svelte';

  let { game }: { game: GameClient } = $props();

  const candidates = $derived(
    game.snap?.players.filter((p) => p.role === 'candidate' && p.alive) ?? [],
  );
  const agreed = $derived(new Set(game.snap?.round?.earlyEndAgreed ?? []));
  const canAgree = $derived(game.me?.role === 'candidate' && game.me.alive);
  const voiceOn = $derived(!!game.lkUrl && !!game.voiceToken);
  const canSpeak = $derived(game.me?.role === 'candidate' && game.me?.alive && voiceOn);

  function isSpeaking(playerId: string) {
    return game.voice.connected && game.voice.activeSpeakers.has(playerId);
  }

  function statusLabel(playerId: string, wsConnected: boolean) {
    if (!wsConnected) return '離線保席';
    if (isSpeaking(playerId)) return '正在發言';
    return '在席聆聽';
  }

  function pillLabel(playerId: string, wsConnected: boolean) {
    if (!wsConnected) return '離線';
    if (isSpeaking(playerId)) return '發言中';
    return '在席';
  }

  function onlineCandidates() {
    return candidates.filter((p) => p.connected).length;
  }
</script>

<section class="debate-layout">
  <div>
    <span class="kicker">辯論開打</span>
    <h2 class="display-title">{game.snap?.round?.topic?.title ?? '誰的危機處理聽起來最不像臨時掰的？'}</h2>
    <p class="lead">{game.snap?.round?.topic?.scenario}</p>
  </div>

  <div class="debate-core">
    <div class="timer-tower">
      <div>
        <span class="status-pill is-live"><span class="dot"></span>倒數壓力</span>
        <strong>{game.clock}</strong>
        <p class="lead">時間歸零後 server 會切入匿名投票。</p>
      </div>
    </div>

    {#each candidates as player, i (player.id)}
      <article
        class="candidate-card"
        class:speaking={isSpeaking(player.id)}
        data-number={String(i + 1).padStart(2, '0')}
      >
        <div class="candidate-top">
          <div class="avatar">
            {#if isSpeaking(player.id)}
              <Volume2 size={22} />
            {:else}
              <Mic size={22} />
            {/if}
          </div>
          <div>
            <h3 class="candidate-name">{player.name}</h3>
            <p class="candidate-slogan">{statusLabel(player.id, player.connected)}</p>
          </div>
        </div>
        <div class="candidate-meta">
          <span class="mini-pill" class:is-speaking={isSpeaking(player.id)}>
            <span class="dot"></span>{pillLabel(player.id, player.connected)}
          </span>
          <span class="mini-pill" class:is-success={agreed.has(player.id)}>
            <span class="dot"></span>{agreed.has(player.id) ? '同意結束' : '尚未同意'}
          </span>
        </div>
      </article>
    {/each}
  </div>

  <div>
    <div class="consensus-wrap">
      <div class="consensus-label">
        <span>提早結束共識</span>
        <span>{agreed.size} / {onlineCandidates()} 已同意</span>
      </div>
      <div class="consensus-bar">
        <span style={`width: ${onlineCandidates() ? (agreed.size / onlineCandidates()) * 100 : 0}%`}></span>
      </div>
    </div>
    <div class="action-row debate-actions">
      {#if canSpeak}
        <button
          class="secondary-action voice-btn"
          class:active={game.voice.micEnabled}
          onclick={() => game.voice.toggleMic()}
          disabled={!game.voice.connected}
        >
          {#if game.voice.micEnabled}
            <Mic size={18} />
            麥克風開啟
          {:else}
            <MicOff size={18} />
            麥克風關閉
          {/if}
        </button>
      {/if}
      <button
        class="secondary-action"
        class:active={agreed.has(game.snap?.you ?? '')}
        disabled={!canAgree}
        onclick={() => game.earlyEnd(!agreed.has(game.snap?.you ?? ''))}
      >
        <TimerOff size={18} />
        {agreed.has(game.snap?.you ?? '') ? '撤回提早結束' : '同意提早結束'}
      </button>
    </div>
  </div>
</section>
