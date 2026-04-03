FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
# Copy root package.json dan patch: hapus workspace "contract" yang tidak ada di image
COPY package.json ./
RUN sed -i '/"contract"/d' package.json
COPY apps/server/package.json ./apps/server/package.json
COPY packages/ ./packages/
RUN bun install

# Production image
FROM base AS runner
WORKDIR /app

# Copy installed node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules 2>/dev/null || true

# Copy source
COPY --from=deps /app/package.json ./
COPY apps/server ./apps/server
COPY packages/ ./packages/

# Non-sensitive env defaults (safe to bake into image)
ENV SOLANA_RPC_URL=https://api.devnet.solana.com
ENV PUBLIC_RPC_URL=https://api.devnet.solana.com
ENV ANCHOR_PROGRAM_ID=HQN9wauX94q7gTA7m9dy2XuErZJjGibVVcE5z3X5oryt
ENV SERVER_AGENT_NAME=Kinko
ENV SERVER_AGENT_ASSET_ADDRESS=""
ENV AI_MODEL=openai/gpt-4o-mini
ENV PORT=3001
ENV SERVER_URL=http://localhost:3001
ENV FRONTEND_URL=http://localhost:3000
ENV COST_PER_REQUEST_LAMPORTS=100000
ENV KINKO_PRICES_ASSET_ADDRESS=""

# Sensitive vars — no default, MUST be set at runtime:
# SERVER_AGENT_PRIVATE_KEY, OPENROUTER_API_KEY, JWT_SECRET
# Optional: SERVER_AGENT_IMAGE_URL, HELIUS_API_KEY

EXPOSE 3001

CMD ["bun", "run", "--cwd", "apps/server", "start"]
