# TaskForge (backend)

TaskForge is a Laravel + React task and project management app. This `backend` directory is the
versioned JSON API (`/api/v1`) plus the workspace/project/task domain: PostgreSQL persistence,
Sanctum bearer authentication, workspace RBAC, projects, tasks, dependencies, sprints, comments,
attachments and notifications.

```mermaid
flowchart LR
  BROWSER -->|React SPA (Vite)| VITE[Vite dev server localhost:5174]
  VITE -->|proxies /api/v1*| API[Laravel API localhost:8000]
  API -->|PostgreSQL 17| POSTGRES[(PostgreSQL)]
```

## Requirements

- Docker Engine + Docker Compose (runs the API and PostgreSQL)
- Node.js 20+ and npm (frontend only)

## Quick start (fresh machine)

```bash
# 1. Copy the local environment file (run once per clone)
cp backend/.env.example backend/.env

# 2. Build and start the API + PostgreSQL
docker compose up --build -d

# 3. Install and run the React frontend
cd frontend && npm install && npm run dev
```

Open `http://localhost:5174` (frontend) and `http://localhost:8000` (API).

## Demo login

| Role | Email | Password |
| --- | --- | --- |
| Demo user | `demo@taskforge.local` | `password` |
| Super Admin | `superadmin@taskforge.local` | `SuperAdmin-1234` (created by the seed) |

Both accounts are created automatically by `php artisan db:seed`. Register a new account instead of
relying on static credentials by calling `POST /api/v1/auth/register`.

## PostgreSQL switch

The bundled `.env.example` ships with `DB_CONNECTION=pgsql`. To switch the app to another driver:

1. Stop the stack (`docker compose down`).
2. Edit `backend/.env` and set `DB_CONNECTION` to one of `pgsql`, `mysql`, `mariadb`, `sqlite`.
3. Confirm the matching PDO driver is installed in the `api` container. The shipped `Dockerfile`
   installs `pdo_pgsql`; for MySQL/MariaDB add `pdo_mysql` to `docker-php-ext-install` and rebuild.
4. Rebuild and start: `docker compose up -d --build`.

Migrations and seeders always use the `DB_CONNECTION` resolved from `backend/.env`. Run one-off
Artisan commands inside the API container:

```bash
docker compose exec api php artisan migrate:fresh --seed
```

## Architecture diagram reference

The authoritative architecture, ERD and decisions live in the repository root:

- `ARCHITECTURE.md` — Mermaid ERD, architecture decisions, delivery phases.
- `backend/routes/api.php` — authoritative route list for the v1 API.
- `backend/API.md` — full endpoint reference (method, path, request/response).

## Stack

- Laravel 13 / PHP 8.3+ / PostgreSQL 17 / Laravel Sanctum
- Pest feature+unit tests, Laravel Pint formatter, Vite + React + TypeScript + Tailwind (frontend)

## Checks

```bash
docker compose exec api php artisan test
docker compose exec api vendor/bin/pint --format agent
cd frontend && npm run build && npm run lint
```
