# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npx nx build order-service --configuration=production

# ── Prod-deps stage: install only production dependencies ─────────────────────
FROM node:24-alpine AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --omit=dev

# ── Runtime stage ─────────────────────────────────────────────────────────────
# Start from a clean base — copy only what's needed so no package manifests
# end up in any image layer (Trivy scans all layers including deleted files).
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Upgrade Alpine packages and npm to pick up OS-level security patches
RUN apk upgrade --no-cache && \
    npm install -g npm@latest --ignore-scripts && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy compiled app (no package.json/lock from dist) and production node_modules only
COPY --from=builder   --chown=appuser:appgroup /app/dist/apps/services/order-service/main.js ./main.js
COPY --from=builder   --chown=appuser:appgroup /app/dist/apps/services/order-service/main.js.map ./main.js.map
COPY --from=prod-deps --chown=appuser:appgroup /app/node_modules ./node_modules

USER appuser

EXPOSE 3001
CMD ["node", "main.js"]
