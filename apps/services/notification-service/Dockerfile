# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npx nx build notification-service --configuration=production

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

RUN apk upgrade --no-cache

# Create non-root user/group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/dist/apps/services/notification-service ./
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

# Switch to non-root user
USER appuser

EXPOSE 3003
CMD ["node", "main.js"]
