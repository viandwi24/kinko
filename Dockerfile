FROM oven/bun:1-alpine
WORKDIR /app

# Copy manifests
COPY package.json ./
COPY apps/server/package.json ./apps/server/package.json
COPY packages/ ./packages/

# Patch: remove "contract" workspace (not present in image)
RUN sed -i '/"contract"/d' package.json

# Install all deps
RUN bun install && bun install --cwd apps/server

# Copy source
COPY apps/server ./apps/server
COPY assets ./assets

# Non-sensitive defaults
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

# Sensitive — set at runtime: SERVER_AGENT_PRIVATE_KEY, OPENROUTER_API_KEY, JWT_SECRET

EXPOSE 3001

CMD ["bun", "run", "--cwd", "apps/server", "start"]
