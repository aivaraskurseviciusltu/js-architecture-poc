# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npx nx build notification-service --configuration=production

# ── Prod-deps stage: install only production dependencies ─────────────────────
FROM node:24-alpine AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --omit=dev

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

RUN apk upgrade --no-cache && \
    npm install -g npm@latest --ignore-scripts && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder   --chown=appuser:appgroup /app/dist/apps/services/notification-service/main.js ./main.js
COPY --from=builder   --chown=appuser:appgroup /app/dist/apps/services/notification-service/main.js.map ./main.js.map
COPY --from=prod-deps --chown=appuser:appgroup /app/node_modules ./node_modules

USER appuser

EXPOSE 3003
CMD ["node", "main.js"]
