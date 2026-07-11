<script lang="ts">
  import { CheckCircle2, Vote } from 'lucide-svelte';
  import type { GameClient } from '../lib/game.svelte';

  let { game }: { game: GameClient } = $props();

  const votable = $derived(
    game.snap?.players.filter((p) => game.snap?.round?.votableIds.includes(p.id)) ?? [],
  );
</script>

<section class="vote-layout">
  <div class="vote-header">
    <div>
      <span class="kicker">匿名投票</span>
      <h2 class="display-title">選出最站不住腳的候選人。</h2>
      <p class="lead">系統只公開投票進度，不公開任何人的票向。投票截止前可以改票。</p>
    </div>
    <span class="status-pill is-warn"><span class="dot"></span>{game.snap?.round?.votedCount ?? 0} / {game.snap?.round?.eligibleVoters ?? 0} 已投 · {game.clock}</span>
  </div>

  <div class="vote-grid">
    {#each votable as player (player.id)}
      <button
        class="vote-card"
        aria-pressed={game.snap?.round?.myVote === player.id}
        onclick={() => game.vote(player.id)}
      >
        <span class="vote-mark">
        {#if game.snap?.round?.myVote === player.id}
          <CheckCircle2 size={18} /> 已選擇
        {:else}
          <Vote size={18} /> 可投票
        {/if}
        </span>
        <span class="mini-pill is-speaking"><span class="dot"></span>候選人</span>
        <h3>{player.name}</h3>
        <p>{player.connected ? '目前在線，接受民眾投票檢驗。' : '目前離線，缺席也是政治風險。'}</p>
      </button>
    {/each}
  </div>
</section>
