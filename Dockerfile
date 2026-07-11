# Campaign Sim — Server container
# Runs Hono + WebSocket backend on Bun

FROM oven/bun:latest

WORKDIR /app

# Dependency manifests (layer-cached)
COPY package.json bun.lock ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY web/package.json ./web/

RUN bun install --frozen-lockfile

# Source code
COPY shared/ ./shared/
COPY server/ ./server/

EXPOSE 3000

CMD ["bun", "run", "server/src/index.ts"]
