# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

ARG VITE_BFF_URL=http://localhost:3000
ENV VITE_BFF_URL=$VITE_BFF_URL

RUN npx nx build frontend --configuration=production

# ── Runtime stage ─────────────────────────────────────────────────────────────
# nginx:1.27-alpine runs as root by default; use the unprivileged variant
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# Copy built assets
COPY --from=builder /app/dist/apps/frontend /usr/share/nginx/html

# SPA fallback: serve index.html for all routes (listen on 8080 — unprivileged default)
RUN printf 'server {\n  listen 8080;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / { try_files $uri $uri/ /index.html; }\n}\n' \
    > /etc/nginx/conf.d/default.conf

EXPOSE 8080
