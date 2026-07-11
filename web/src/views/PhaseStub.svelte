<script lang="ts">
  import { Clock } from 'lucide-svelte';
  import type { GameClient } from '../lib/game.svelte';

  let { game }: { game: GameClient } = $props();
</script>

<section class="panel phase-panel">
  <p class="eyebrow">{game.snap?.phase}</p>
  <h2>{game.snap?.round?.topic?.title ?? '回合已建立'}</h2>
  <p>{game.snap?.round?.topic?.scenario ?? 'M1 會接上完整 FSM、抽題、投票與淘汰流程。'}</p>
  <div class="clock">
    <Clock size={22} />
    {game.clock}
  </div>
</section>
