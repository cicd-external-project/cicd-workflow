# =============================================================================
# flowci-demo-backend — Example Dockerfile
#
# Demonstrates the multi-stage build pattern FlowCI expects for a NestJS
# service: deps -> build -> runtime, non-root user, healthcheck. Mirrors the
# house style used by cicd-workflow-be/Dockerfile, minus the template-clone
# step that app doesn't need here.
# =============================================================================

# ── Stage 1: install deps ────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
# Fresh FlowCI scaffolds may not have a package-lock.json yet (the customer
# generates it on first install) — fall back to npm install in that case,
# same as the generated workflow's own build job does.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ── Stage 2: compile TypeScript ──────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json tsconfig*.json nest-cli.json ./
COPY src/ ./src/
RUN npm run build

# ── Stage 3: production runtime ──────────────────────────────────────────────
FROM node:22-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs

COPY --chown=nestjs:nodejs --from=builder /app/dist ./dist

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/v1/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "dist/main"]
