FROM node:18-alpine AS base

# ── Dependencies ──
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Build ──
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Production base ──
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init

COPY --from=builder /app/.next/standalone/sov-dashboard ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# ── Web Service (default) ──
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# dumb-init forwards signals properly to Node.js
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
