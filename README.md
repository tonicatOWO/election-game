# Campaign Sim 🎙️

多人即時選戰辯論淘汰遊戲。玩家扮演候選人與民眾，在即時回合制中辯論、投票、淘汰對手，直到最終勝者出線。

> 競選模擬器、嘴炮辯論、社交推理 —— 一局 10-30 分鐘。

---

## 遊戲流程

```
 lobby → topic_reveal → debate → voting → round_result → game_over
```

| 階段 | 說明 |
|------|------|
| **Lobby** | 開房、入場、設定規則、房主啟動 |
| **Topic Reveal** | 揭露本輪議題（附情境描述） |
| **Debate** | 存活候選人自由發言；可提前同意結束辯論 |
| **Voting** | 全體有資格者匿名投票 (可改票)，票數不公開 |
| **Round Result** | 只公開總票數、淘汰結果，不揭露個別票向 |
| **Game Over** | 最終勝者揭曉 |

---

## 架構

```
campaign-sim/
├── shared/          # 跨 workspace 共用型別與 Zod schema
│   └── src/
│       ├── config.ts     # 房間設定 schema
│       └── protocol.ts   # WS 通訊協定 (C2S / S2C)
├── server/          # Hono + Bun WebSocket 後端
│   └── src/
│       ├── auth.ts       # better-auth (anonymous only)
│       ├── env.ts        # 環境變數 Zod validate
│       ├── index.ts      # Bun serve entry
│       ├── db/           # Drizzle ORM + SQLite
│       ├── game/         # 房間狀態機 (FSM) + Room lifecycle
│       ├── http/         # RESTful routes
│       └── ws/           # WebSocket 收發處理
└── web/             # Svelte 5 + Vite + UnoCSS 前端
    └── src/
        ├── App.svelte        # 主畫面含階段路由
        ├── views/            # 各階段畫面
        │   ├── Lobby.svelte
        │   ├── Topic.svelte
        │   ├── Debate.svelte
        │   ├── Voting.svelte
        │   └── Result.svelte
        └── lib/              # 共用邏輯
            ├── api.ts        # REST client
            ├── auth.ts       # Anonymous session
            ├── game.svelte.ts # WS client + state machine
            └── voice.svelte.ts # LiveKit voice client
```

### Stack

| 層級 | 技術 |
|------|------|
| Runtime | Bun |
| HTTP Framework | Hono |
| Realtime | WebSocket (Bun原生) |
| Database | SQLite + Drizzle ORM |
| Auth | better-auth (anonymous session) |
| Voice | LiveKit SFU |
| Frontend | Svelte 5 (runes) + Vite + UnoCSS |
| Validation | Zod (shared between server & web) |

---

## 快速開始

```bash
# 安裝依賴
bun install

# 啟動後端 (Hono + WS)
bun dev:server

# 啟動前端 (Vite dev server)
bun dev:web

# 或同時啟動：
bun dev
```

### 環境變數

各 workspace 皆有 `.env.example` 樣板。複製為 `.env` 後調整：

```bash
cp server/.env.example server/.env
cp web/.env.example web/.env
```

---

## Production（Docker）

透過 nginx 反向代理，將前後端打包為單一服務入口（port 80）。

```
          ┌───────┐
  :80 ────│ nginx │
          └───┬───┘
         ┌────┴────┐
     ┌───┤ /api/*  ├───→ server:3000 (Hono)
     │   │ /ws     │───→ server:3000 (WebSocket)
     │   │ /       │───→ static files (Svelte SPA)
     │   └─────────┘
     │
  ┌──┴──────────┐
  │ livekit:7880 │  (選用，語音)
  └─────────────┘
```

### 啟動

```bash
# 一鍵啟動完整 stack
docker compose up -d

# 查看服務狀態
docker compose ps

# 查看日誌
docker compose logs -f

# 關閉
docker compose down
```

首次啟動時 `web-builder` 會先建置 Svelte SPA，nginx 確認完成後才上線。

### 訪問

開啟瀏覽器 → `http://localhost`

### 語音

LiveKit 為選用。若不需要語音，可先停用：

```bash
docker compose stop livekit
docker compose rm livekit
```

並在 `server/.env` 中註解或移除 `LIVEKIT_*` 變數。

### 架構檔案

| 檔案 | 用途 |
|------|------|
| `docker-compose.yml` | 完整 stack 定義 |
| `Dockerfile` | Server 容器 (Bun + Hono) |
| `Dockerfile.web` | 前端建置容器 (Bun + Vite) |
| `nginx.conf` | nginx 反向代理設定 |

---

## 開發指令

```bash
bun dev              # 啟動 web (Vite)
bun dev:server       # 啟動 server (Bun --watch)
bun dev:web          # 啟動 web (Vite)
bun check            # TypeScript 型別檢查 (全 workspace)
bun build            # 建置全 workspace
```

---

## 設計原則

- **Svelte 5 runes**：所有狀態管理使用 `$state` / `$derived` / `$effect`，無 store 耦合
- **Server authoritative**：所有遊戲邏輯在 server 端判定，client 只顯示狀態
- **單向 WS 通訊**：client 發送指令 (C2S)，server 推播完整 snapshot (S2C)
- **Drizzle 優先**：DB schema 即 source of truth，migration 透過 drizzle-kit 管理
- **Zod 共享**：shared workspace 定義共用的 config & protocol schema，前後端強型別一致

---

## License

MIT © tonicatowo
