# JS Fullstack Architecture PoC

An Nx monorepo demonstrating a fullstack architecture with a React frontend, NestJS BFF, NestJS microservice, and MongoDB.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + TypeScript |
| BFF | NestJS + TypeScript |
| Order Service | NestJS + TypeScript + Mongoose |
| Database | MongoDB 7 |
| Monorepo | Nx (integrated, npm) |

## Structure

```
apps/
  frontend/           React + Vite app
  bff/                NestJS BFF (aggregation gateway)
  services/
    order-service/    NestJS microservice (persists to MongoDB)
libs/
  shared-types/       Shared TS types & DTOs
```

## Quick Start (Docker)

```bash
# 1. Copy and edit env
cp .env.example .env

# 2. Start everything
docker compose up --build

# Frontend:       http://localhost:3002
# BFF:            http://localhost:3000
# Order Service:  http://localhost:3001
# MongoDB:        localhost:27017
```

## Local Development

```bash
# Install dependencies
npm install

# Serve all apps concurrently (requires MongoDB running locally)
nx run-many -t serve

# Build all projects
nx run-many -t build
```

## API Reference

### BFF (`http://localhost:3000`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/orders` | Create an order |
| `GET` | `/api/orders/:id` | Get order by ID |
| `GET` | `/health` | Health check |
| `GET` | `/ready` | Readiness (checks order-service) |

### Order Service (`http://localhost:3001`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/orders` | Create an order |
| `GET` | `/orders/:id` | Get order by ID |
| `GET` | `/health` | Health check |
| `GET` | `/ready` | Readiness (checks MongoDB) |

## Environment Variables

See [`.env.example`](.env.example) for all required variables. **Never commit `.env`.**
