# TaskForge

TaskForge is a team workspace for planning projects and tracking day to day work. Teams can organize work into projects, move tasks through a shared board, coordinate ownership and deadlines, and see how work is progressing across the workspace.

## What you can do

- Create workspaces, invite teammates, and manage access with owner, admin, member, and viewer roles.
- Organize projects with statuses, dates, and project keys.
- Plan work on a task board with backlog, to do, in progress, in review, and done columns, or switch to a task list.
- Track task priority, assignee, deadline, estimate, labels, and dependencies.
- Discuss tasks with comments, attach files, and review task activity.
- Review project progress and team workload in overview and analytics pages.
- Get notifications for task and team activity.
- Ask the workspace AI assistant questions about project progress, tasks, and workload. The assistant supports a configured AI service and per-user API keys.
- Sign in with email and password. Google and GitHub sign in are available when OAuth credentials are configured.

## Run locally

### Requirements

- Docker Engine with Docker Compose
- Node.js 20 or newer and npm

### Start the backend and database

```sh
cp backend/.env.example backend/.env
docker compose up --build -d
```

The API container installs PHP dependencies, generates an app key when needed, runs migrations, and seeds demo data. Laravel API runs at `http://localhost:8000`; PostgreSQL is exposed at `localhost:5433`.

### Start the frontend

In another terminal:

```sh
cd frontend
npm install
npm run dev
```

Open `http://localhost:5174`.

### Demo account

Use `demo@taskforge.local` with password `password`. The seed also creates workspace members with different roles and sample projects, tasks, labels, comments, dependencies, and sprints.

## Project structure

- `frontend/` contains the React and TypeScript single page application.
- `backend/` contains the Laravel application and versioned JSON API at `/api/v1`.
- `compose.yaml` starts the API, frontend development server, and PostgreSQL database.

The frontend uses React Router for page navigation and calls Laravel through the `/api/v1` endpoints. Laravel uses Sanctum personal access tokens for API authentication and PostgreSQL for application data.

## Configuration

Local defaults live in `backend/.env.example`. OAuth and AI integrations are optional; configure the matching credentials and redirect URLs in `backend/.env` to enable them. The shipped database credentials are for local development only. Set secure credentials and an app key before deploying to a shared environment.

## Useful commands

```sh
# Backend feature and unit tests
docker compose exec api php artisan test

# Frontend production build and lint
cd frontend
npm run build
npm run lint
```
