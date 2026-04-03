FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies (monorepo root + server)
FROM base AS deps
COPY package.json bun.lockb* ./
COPY apps/server/package.json ./apps/server/package.json
# Copy any packages used by server
COPY packages/ ./packages/
RUN bun install --frozen-lockfile

# Production image
FROM base AS runner
WORKDIR /app

# Copy installed node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules 2>/dev/null || true

# Copy source
COPY package.json ./
COPY apps/server ./apps/server
COPY packages/ ./packages/

# Environment variables — all values below are overridable at runtime
# Solana
ENV SOLANA_RPC_URL=https://api.devnet.solana.com
ENV PUBLIC_RPC_URL=https://api.devnet.solana.com
ENV ANCHOR_PROGRAM_ID=HQN9wauX94q7gTA7m9dy2XuErZJjGibVVcE5z3X5oryt

# Agent identity (must be overridden in production)
ENV SERVER_AGENT_NAME=Kinko
ENV SERVER_AGENT_IMAGE_URL=""
ENV SERVER_AGENT_PRIVATE_KEY=""
ENV SERVER_AGENT_ASSET_ADDRESS=""

# AI
ENV OPENROUTER_API_KEY=""
ENV AI_MODEL=openai/gpt-4o-mini

# Server
ENV PORT=3001
ENV SERVER_URL=http://localhost:3001
ENV FRONTEND_URL=http://localhost:3000

# Auth
ENV JWT_SECRET=change-this-in-production

# Cost
ENV COST_PER_REQUEST_LAMPORTS=100000

# A2A
ENV KINKO_PRICES_ASSET_ADDRESS=""

# Metaplex / Helius (optional)
ENV HELIUS_API_KEY=""

EXPOSE 3001

CMD ["bun", "run", "--cwd", "apps/server", "start"]
