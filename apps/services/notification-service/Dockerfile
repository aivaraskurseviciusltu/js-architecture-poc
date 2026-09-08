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

COPY --from=builder /app/dist/apps/services/notification-service ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3003
CMD ["node", "main.js"]
