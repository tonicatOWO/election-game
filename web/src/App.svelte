<script lang="ts">
  import { DoorOpen, Plus, Radio, RefreshCw } from 'lucide-svelte';
  import { createRoom, joinRoom } from './lib/api';
  import { ensureAnonymousSession } from './lib/auth';
  import { GameClient } from './lib/game.svelte';
  import Lobby from './views/Lobby.svelte';
  import Debate from './views/Debate.svelte';
  import Result from './views/Result.svelte';
  import Topic from './views/Topic.svelte';
  import Voting from './views/Voting.svelte';

  const game = new GameClient();

  let roomId = $state(readRoomId());
  let displayName = $state(localStorage.getItem('campaign-sim:name') ?? '');
  let busy = $state(false);
  let error = $state<string | null>(null);

  const phaseMeta = $derived(getPhaseMeta());
  const roomLabel = $derived(roomId || 'NEW');
  const players = $derived(game.snap?.players ?? []);
  const readyCount = $derived(players.filter((p) => p.ready || p.id === game.snap?.hostId).length);
  const progress = $derived(getProgress());

  $effect(() => {
    if (displayName.trim()) localStorage.setItem('campaign-sim:name', displayName.trim());
  });

  function readRoomId() {
    const match = location.pathname.match(/^\/r\/([^/]+)$/);
    return match?.[1] ?? '';
  }

  async function withSession<T>(fn: () => Promise<T>) {
    busy = true;
    error = null;
    try {
      await ensureAnonymousSession();
      return await fn();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
      throw e;
    } finally {
      busy = false;
    }
  }

  async function handleCreate() {
    await withSession(async () => {
      const created = await createRoom();
      roomId = created.roomId;
      history.pushState(null, '', `/r/${roomId}`);
      await handleJoin();
    });
  }

  async function handleJoin() {
    await withSession(async () => {
      const id = roomId.trim();
      if (!id) throw new Error('Room id required');
      const res = await joinRoom(id, displayName.trim());
      history.pushState(null, '', `/r/${id}`);
      game.connect(id, { lkUrl: res.lkUrl, voiceToken: res.voiceToken });
    });
  }

  function getPhaseMeta() {
    if (!game.snap) {
      return {
        badge: '待命',
        title: '節目上線前控台',
        copy: '輸入暱稱並開房，候選人與民眾進棚後即可開始災難公關辯論。',
      };
    }
    const topic = game.snap.round?.topic;
    const map = {
      lobby: {
        badge: '上線前',
        title: '節目上線前控台',
        copy: '候選人進棚、民眾測試連線，房主確認規則後開播。',
      },
      topic_reveal: {
        badge: '揭題',
        title: topic?.title ?? '政策危機揭露',
        copy: topic?.scenario ?? '本輪議題進場，候選人準備表態。',
      },
      debate: {
        badge: '辯論',
        title: topic?.title ?? '危機辯論',
        copy: '存活候選人自由發言；全體在線候選人同意即可提前進投票。',
      },
      voting: {
        badge: '投票',
        title: '匿名淘汰投票',
        copy: `已投 ${game.snap.round?.votedCount ?? 0} / ${game.snap.round?.eligibleVoters ?? 0}，截止前可改票。`,
      },
      round_result: {
        badge: '開票',
        title: '本輪開票結果',
        copy: '只公開合計票數與淘汰結果，不揭露個別票向。',
      },
      game_over: {
        badge: '總決選',
        title: '節目總決選完成',
        copy: '勝者、票數與本局結果整理在主舞台。',
      },
    };
    return map[game.snap.phase];
  }

  function getProgress() {
    if (!game.snap || players.length === 0) {
      return { label: '入場進度', text: '0 / 0', pct: 0, hint: '建立房間後，玩家會出現在右側導播欄。' };
    }
    if (game.snap.phase === 'lobby') {
      return {
        label: '準備進度',
        text: `${readyCount} / ${players.length}`,
        pct: Math.round((readyCount / players.length) * 100),
        hint: '房主可在候選人與民眾達標、玩家準備完成後開播。',
      };
    }
    if (game.snap.phase === 'debate') {
      const aliveOnline = players.filter((p) => p.role === 'candidate' && p.alive && p.connected).length;
      const agreed = game.snap.round?.earlyEndAgreed.length ?? 0;
      return {
        label: '提早結束',
        text: `${agreed} / ${aliveOnline}`,
        pct: aliveOnline ? Math.round((agreed / aliveOnline) * 100) : 0,
        hint: '所有在線存活候選人同意後，系統會立刻切入投票。',
      };
    }
    if (game.snap.phase === 'voting') {
      const total = game.snap.round?.eligibleVoters ?? 0;
      const voted = game.snap.round?.votedCount ?? 0;
      return {
        label: '投票進度',
        text: `${voted} / ${total}`,
        pct: total ? Math.round((voted / total) * 100) : 0,
        hint: '側欄只顯示投票進度；票向永遠不公開。',
      };
    }
    return {
      label: '回合狀態',
      text: phaseMeta.badge,
      pct: game.snap.phase === 'game_over' ? 100 : 65,
      hint: '主舞台會依照 server phase 自動切換。',
    };
  }
</script>

<main class="app">
  <header class="top-hud" aria-label="房間狀態">
    <section class="hud-block room-card" aria-label="房間代碼">
      <span class="label">房間代碼</span>
      <strong class="room-code mono">{roomLabel}</strong>
    </section>

    <section class="hud-block broadcast-bar" aria-live="polite">
      <div class="phase-badge">{phaseMeta.badge}</div>
      <div class="topic-strip">
        <h1>{phaseMeta.title}</h1>
        <p>{phaseMeta.copy}</p>
      </div>
      <div class="timer-card">
        <small>主倒數</small>
        <span>{game.snap?.phaseEndsAt ? game.clock : '待命'}</span>
      </div>
    </section>

    <section class="hud-block host-controls" aria-label="主持狀態">
      <span class="status-pill" class:is-success={game.connected}>
        <span class="dot"></span>
        {game.connected ? 'WS 在線' : '未連線'}
      </span>
      {#if game.voiceToken}
        {#if game.voice.connected && !game.voice.canPlaybackAudio}
          <button class="status-pill is-warn enable-audio-btn" onclick={() => game.voice.startAudio()}>
            <span class="dot"></span>
            啟用語音
          </button>
        {:else}
          <span class="status-pill" class:is-success={game.voice.connected} class:is-live={!game.voice.connected}>
            <span class="dot"></span>
            {game.voice.connected ? 'Voice On' : 'Voice...'}
          </span>
        {/if}
      {/if}
      <span class="status-pill is-warn"><span class="dot"></span>{players.length} 人進房</span>
    </section>
  </header>

  <div class="layout">
    <section class="stage" aria-label="主要舞台">
      <article class="phase-view">
        {#if !game.snap}
          <section class="join-panel">
            <div>
              <span class="kicker">候選人進棚</span>
              <h2 class="display-title">今晚要吵的不是政策，是誰能活到下一輪。</h2>
              <p class="lead">建立房間、邀請朋友，讓候選人和民眾進入同一個即時回合。</p>
            </div>
            <div class="join-form">
              <label>
                暱稱
                <input bind:value={displayName} placeholder="Guest" maxlength="40" />
              </label>
              <label>
                房號
                <input bind:value={roomId} placeholder="輸入 room id 或直接開新房" />
              </label>
            </div>
            <div class="actions">
              <button class="secondary" onclick={handleJoin} disabled={busy || !roomId.trim()}>
                <DoorOpen size={18} />
                加入
              </button>
              <button class="primary" onclick={handleCreate} disabled={busy}>
                {#if busy}
                  <RefreshCw size={18} class="spin" />
                {:else}
                  <Plus size={18} />
                {/if}
                開新房
              </button>
            </div>
          </section>
        {:else if game.snap.phase === 'lobby'}
          <Lobby {game} />
        {:else if game.snap.phase === 'topic_reveal'}
          <Topic {game} />
        {:else if game.snap.phase === 'debate'}
          <Debate {game} />
        {:else if game.snap.phase === 'voting'}
          <Voting {game} />
        {:else if game.snap.phase === 'round_result' || game.snap.phase === 'game_over'}
          <Result {game} />
        {:else}
          <Result {game} />
        {/if}
      </article>

      <div class="ticker" aria-hidden="true">
        <span>導播提醒：投票階段只公開進度，不公開票向；倒數與淘汰一律由 server 裁定。</span>
      </div>
    </section>

    <aside class="rail" aria-label="玩家與系統狀態">
      <section class="panel">
        <div class="panel-header">
          <h2 class="panel-title">玩家狀態</h2>
          <span class="status-pill is-speaking"><span class="dot"></span>即時</span>
        </div>
        <div class="panel-body player-list">
          {#if players.length === 0}
            <div class="player-row">
              <span class="player-name">等待玩家入場</span>
              <span class="mini-pill"><span class="dot"></span>待命</span>
            </div>
          {:else}
            {#each players as player (player.id)}
              <div class="player-row">
                <span class="player-name">{player.name}</span>
                <span
                  class="mini-pill"
                  class:is-ready={player.ready || player.id === game.snap?.hostId}
                  class:is-live={!player.connected}
                  class:is-speaking={player.role === 'candidate' && player.alive}
                >
                  <span class="dot"></span>
                  {player.id === game.snap?.hostId
                    ? '房主'
                    : player.connected
                      ? player.role === 'candidate'
                        ? '候選'
                        : '民眾'
                      : '離線'}
                </span>
              </div>
            {/each}
          {/if}
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2 class="panel-title">本輪壓力</h2>
          <span class="status-pill is-live"><span class="dot"></span>公開</span>
        </div>
        <div class="panel-body">
          <div class="consensus-wrap">
            <div class="consensus-label"><span>{progress.label}</span><span>{progress.text}</span></div>
            <div class="consensus-bar"><span style={`width: ${progress.pct}%`}></span></div>
          </div>
          <p class="lead rail-hint">{progress.hint}</p>
        </div>
      </section>

      <section class="panel log-panel">
        <div class="panel-header">
          <h2 class="panel-title">系統訊息</h2>
          <span class="status-pill"><span class="dot"></span>log</span>
        </div>
        <div class="panel-body">
          <ul class="rule-list compact">
            <li><Radio size={16} /> 導播台已準備接收玩家入場。</li>
            <li><Radio size={16} /> 回合倒數會在開播後自動切換。</li>
            {#if game.snap?.round?.topic}
              <li><Radio size={16} /> 本輪議題：{game.snap.round.topic.title}</li>
            {/if}
          </ul>
        </div>
      </section>
    </aside>
  </div>

  {#if error || game.lastError}
    <p class="error">{error ?? game.lastError}</p>
  {/if}
</main>
