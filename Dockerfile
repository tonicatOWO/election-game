# Campaign Sim — Server container
# Runs Hono + WebSocket backend on Bun

FROM oven/bun:latest

WORKDIR /app

# Dependency manifests (layer-cached)
COPY package.json bun.lock ./
COPY tsconfig.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY web/package.json ./web/

RUN bun install --frozen-lockfile

# Source code
COPY shared/ ./shared/
COPY server/ ./server/

EXPOSE 3000

# Run migration + seed on startup, then start server
CMD ["sh", "-c", "bun run server/src/db/migrate.ts && bun run server/src/db/seed.ts && bun run server/src/index.ts"]
