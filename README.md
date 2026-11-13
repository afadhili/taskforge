# TaskForge

TaskForge is a Laravel + React task and project management app. PostgreSQL and the Laravel API run in Docker; Vite runs locally for fast frontend iteration.

## Requirements

- Node.js 20+, npm
- Docker Engine with Compose

## Start

1. Copy the local environment file and start the API + PostgreSQL:

   ```sh
   cp backend/.env.example backend/.env
   docker compose up --build -d
   ```

   The API container installs PHP dependencies, creates the local key, applies migrations and seeds demo data on first start.
2. Start the React app:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

Open `http://localhost:5174`. Demo login: `demo@taskforge.local` / `password`.

## Stack and API

- Laravel 13, Sanctum, PostgreSQL, Pest
- React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Axios
- Versioned JSON API under `/api/v1`; see [API documentation](API.md) and the ERD/decisions in [ARCHITECTURE.md](ARCHITECTURE.md).

`backend/.env.example` contains local-only defaults. Change credentials and the app key before any shared deployment. PostgreSQL is exposed on host port `5433` because `5432` was already occupied in the inspected environment. Data persists in the `taskforge-postgres` Docker volume.

## Checks

```sh
docker compose exec api php artisan test
docker compose exec api vendor/bin/pint --format agent
cd frontend && npm run build && npm run lint
```
