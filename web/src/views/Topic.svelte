<script lang="ts">
  import { Clock } from 'lucide-svelte';
  import type { GameClient } from '../lib/game.svelte';

  let { game }: { game: GameClient } = $props();
</script>

<section class="topic-billboard">
  <div class="breaking">政策危機發生 · 全國媒體正在追問</div>
  <span class="kicker">第 {game.snap?.round?.n ?? 1} 輪 / 即時議題</span>
  <h2>{game.snap?.round?.topic?.title}</h2>
  <p class="lead">{game.snap?.round?.topic?.scenario}</p>
  <div class="tags">
    {#each game.snap?.round?.topic?.tags ?? [] as tag}
      <span>{tag}</span>
    {/each}
  </div>
  <div class="timer-tower small">
    <Clock size={22} />
    <strong>{game.clock}</strong>
  </div>
</section>
