<script lang="ts">
  import { RotateCcw, Trophy } from 'lucide-svelte';
  import type { GameClient } from '../lib/game.svelte';

  let { game }: { game: GameClient } = $props();

  const tally = $derived(game.snap?.round?.tally ?? {});
  const rows = $derived(
    Object.entries(tally).map(([id, votes]) => ({
      id,
      votes,
      player: game.snap?.players.find((p) => p.id === id),
    })),
  );
  const maxVotes = $derived(Math.max(1, ...rows.map((row) => row.votes)));
  const winner = $derived(game.snap?.players.find((p) => p.id === game.snap?.winnerId));
</script>

<section class="result-layout">
  <span class="kicker">{game.snap?.phase === 'game_over' ? '總決選' : '開票棚'}</span>
  <h2 class="display-title">
    {#if winner}
      勝者：{winner.name}
    {:else}
      最低票者熄燈，下一輪繼續直播。
    {/if}
  </h2>
  <p class="lead">開票只呈現總數與淘汰結果，不揭露個別玩家投票。</p>

  <div class="result-board">
    {#each rows as row (row.id)}
      <div class="result-row">
        <strong>{row.player?.name ?? row.id}</strong>
        <div class="result-bar"><span style={`width: ${(row.votes / maxVotes) * 100}%`}></span></div>
        <span class="mono">{row.votes} 票</span>
      </div>
    {/each}
  </div>

  {#if winner}
    <div class="winner-card">
      <div class="winner-portrait">{winner.name.slice(0, 1).toUpperCase()}</div>
      <div>
        <span class="status-pill is-warn"><span class="dot"></span>最終勝者</span>
        <h3>{winner.name}</h3>
        <p class="lead">存活到最後的候選人，成功撐過所有危機追問。</p>
        <div class="winner"><Trophy size={22} /> {winner.name}</div>
        <div class="replay-callout">
          <p>房間將在 {game.clock} 後關閉。房主可在倒數內再開一局。</p>
          <button class="primary-action ready" disabled={!game.isHost} onclick={() => game.restart()}>
            <RotateCcw size={20} />
            再來一輪
          </button>
        </div>
      </div>
    </div>
  {:else}
    <div class="stamp">下一階段 {game.clock}</div>
  {/if}
</section>
