import type { Room, RoundState } from './room';
import type { Topic } from 'shared/protocol';

const TOPICS: Topic[] = [
  {
    id: 1,
    title: '深夜大眾運輸收班爭議',
    scenario: '跨年夜大量民眾滯留車站，輿論質疑末班車收班過早。請提出你的都市交通政策回應。',
    tags: ['交通', '都市治理'],
  },
  {
    id: 2,
    title: 'AI 客服全面取代真人',
    scenario: '大型電信商裁撤全部真人客服改用 AI，申訴量暴增。是否立法要求保留真人窗口？',
    tags: ['科技', '勞動'],
  },
  {
    id: 3,
    title: '颱風假認定標準',
    scenario: '兩鄰近縣市同風雨不同調，一邊上班一邊放假，民怨沸騰。你主張的決策機制是什麼？',
    tags: ['防災', '行政'],
  },
  {
    id: 4,
    title: '外送平台抽成上限',
    scenario: '店家聯合抗議平台抽成過高、醞釀集體罷送。政府是否應介入管制？',
    tags: ['經濟', '平台治理'],
  },
  {
    id: 5,
    title: '老屋都更與居住權',
    scenario: '危老都更因少數不同意戶卡關，工程延宕十年。請提出兼顧效率與居住權的解方。',
    tags: ['居住', '都市計畫'],
  },
];

let notifyRoom: (roomId: string) => void = () => {};
let finalizeRoom: (roomId: string) => void = () => {};

export function setFsmNotifier(notifier: (roomId: string) => void) {
  notifyRoom = notifier;
}

export function setFsmFinalizer(finalizer: (roomId: string) => void) {
  finalizeRoom = finalizer;
}

export function startGame(room: Room) {
  room.roundNo = 1;
  room.replayCount = 0;
  startRound(room, 'normal', aliveCandidateIds(room));
}

export function advance(room: Room) {
  clearTimeout(room.timer);
  switch (room.phase) {
    case 'topic_reveal':
      return enter(room, 'debate');
    case 'debate':
      return enter(room, 'voting');
    case 'voting':
      settle(room);
      return enter(room, 'round_result');
    case 'round_result':
      return nextRoundOrEnd(room);
    case 'game_over':
      return finalizeRoom(room.id);
    default:
      notifyRoom(room.id);
  }
}

export function forceVotingIfConsensus(room: Room) {
  if (room.phase !== 'debate') return;
  const candidates = [...room.players.values()].filter(
    (p) => p.role === 'candidate' && p.alive && p.connected,
  );
  if (candidates.length > 0 && candidates.every((p) => p.earlyEndAgree)) {
    advance(room);
  }
}

function startRound(room: Room, kind: RoundState['kind'], votableIds: string[]) {
  for (const player of room.players.values()) {
    player.earlyEndAgree = false;
  }
  room.round = {
    n: room.roundNo,
    kind,
    topic: drawTopic(room),
    votableIds,
    votes: new Map(),
    tally: null,
  };
  enter(room, 'topic_reveal');
}

function enter(room: Room, phase: Room['phase']) {
  clearTimeout(room.timer);
  room.phase = phase;
  const ms = phaseMs(room, phase);
  room.phaseEndsAt = ms == null ? null : Date.now() + ms;
  room.updatedAt = Date.now();
  notifyRoom(room.id);

  if (ms != null) {
    room.timer = setTimeout(() => advance(room), ms);
  }
}

function phaseMs(room: Room, phase: Room['phase']) {
  switch (phase) {
    case 'topic_reveal':
      return room.config.topicRevealMs;
    case 'debate':
      return room.round?.kind === 'tiebreak' ? room.config.tiebreakDebateMs : room.config.debateMs;
    case 'voting':
      return room.config.votingMs;
    case 'round_result':
      return room.config.resultMs;
    case 'game_over':
      return 10_000;
    default:
      return null;
  }
}

function settle(room: Room) {
  if (!room.round) return;
  const tally = Object.fromEntries(room.round.votableIds.map((id) => [id, 0]));
  for (const candidateId of room.round.votes.values()) {
    tally[candidateId] = (tally[candidateId] ?? 0) + 1;
  }
  room.round.tally = tally;

  const entries = Object.entries(tally);
  if (entries.length <= 1) return;

  const counts = entries.map(([, votes]) => votes);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const lowest = entries.filter(([, votes]) => votes === min).map(([id]) => id);

  if (min === max) {
    room.replayCount += 1;
    if (room.replayCount > room.config.maxReplays) {
      eliminate(room, pickFinalTiebreakLoser(room, entries.map(([id]) => id)));
    }
    return;
  }

  if (lowest.length === 1) {
    eliminate(room, lowest[0]);
    room.replayCount = 0;
  }
}

function nextRoundOrEnd(room: Room) {
  const alive = aliveCandidateIds(room);
  if (alive.length <= 1) {
    room.winnerId = alive[0] ?? null;
    enter(room, 'game_over');
    return;
  }

  if (!room.round?.tally) return;
  const entries = Object.entries(room.round.tally);
  const counts = entries.map(([, votes]) => votes);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const lowest = entries.filter(([, votes]) => votes === min).map(([id]) => id);

  room.roundNo += 1;
  if (min === max) {
    startRound(room, 'replay', alive);
    return;
  }
  if (lowest.length > 1) {
    startRound(room, 'tiebreak', lowest);
    return;
  }
  startRound(room, 'normal', alive);
}

function eliminate(room: Room, candidateId: string) {
  const player = room.players.get(candidateId);
  if (!player) return;
  player.alive = false;
  player.role = room.config.eliminatedCanVote ? 'voter' : player.role;
  player.earlyEndAgree = false;
}

function drawTopic(room: Room) {
  if (room.usedTopicIds.size >= TOPICS.length) room.usedTopicIds.clear();
  const available = TOPICS.filter((topic) => !room.usedTopicIds.has(topic.id));
  const topic = available[Math.floor(Math.random() * available.length)] ?? TOPICS[0];
  room.usedTopicIds.add(topic.id);
  return topic;
}

function aliveCandidateIds(room: Room) {
  return [...room.players.values()]
    .filter((p) => p.role === 'candidate' && p.alive)
    .map((p) => p.id);
}

function pickFinalTiebreakLoser(room: Room, ids: string[]) {
  if (room.config.finalTiebreak === 'host' && ids.includes(room.hostId)) {
    return ids.find((id) => id !== room.hostId) ?? ids[0];
  }
  return ids[Math.floor(Math.random() * ids.length)];
}
