# flowci-demo-backend

A small but real NestJS 11 service used as the flagship example for the
FlowCI CI/CD product. It exists to give a pipeline something genuine to
build, test, lint, scan, containerize, and deploy — not to demonstrate any
particular backend pattern. See the parent
[`examples/demo-app/README.md`](../README.md) for how this app's generated
GitHub Actions workflows (Access -> Quality -> Package gates) actually wire
up and deploy it.

This is a **standalone app** with its own `package.json` — it is not part of
the FlowCI product backend (`cicd-workflow-be/`) and shares no code or
dependencies with it.

## Stack

- NestJS 11, Node.js 22 LTS, TypeScript 5 (strict mode)
- Global route prefix: `api/v1` (set in `src/main.ts`)
- No database, no auth, no external calls — task storage is an in-memory
  array that resets on every restart. This keeps the example small enough to
  read in one sitting while still being a real, runnable service.

## API surface

| Method | Path | Description |
|--------|------|--------------|
| `GET` | `/api/v1` | Returns a hello-world string from `AppService` |
| `GET` | `/api/v1/health` | Health check — `{ "status": "ok" }`. This is the path Render's health check and the Dockerfile's `HEALTHCHECK` both probe. |
| `GET` | `/api/v1/tasks` | List all tasks |
| `GET` | `/api/v1/tasks/:id` | Get one task by numeric id, `404` if not found |
| `POST` | `/api/v1/tasks` | Create a task from `{ "title": string }`, returns `201` with the created task (`done: false`) |

## Run locally

```bash
npm install
npm run start:dev      # Nest in watch mode, http://localhost:3000/api/v1
```

```bash
# example requests once it's running
curl http://localhost:3000/api/v1/health
curl http://localhost:3000/api/v1/tasks
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Try the demo"}'
```

## Build

```bash
npm run build           # compiles to dist/ via `nest build`
npm run start:prod       # node dist/main — same entrypoint the Docker image runs
```

## Test

```bash
npm run lint             # eslint src
npm test                 # jest unit tests
npm run test:cov         # jest --coverage
```

Coverage is currently 100% across statements/branches/functions/lines (6
suites, 15 tests) — comfortably above the 80% gate the `test` branch
enforces, and the 90% gate `uat`/`main` enforce, per the central pipeline's
branch-policy job (see `examples/demo-app/README.md`).

## Environment variables

See [`.env.example`](./.env.example). In short: none are required.
`PORT` defaults to `3000` if unset; Render injects its own `PORT` in
production, so don't hardcode one anywhere deploy-related.

## Docker

```bash
docker build -t flowci-demo-backend .
docker run --rm -p 3000:3000 flowci-demo-backend
curl http://localhost:3000/api/v1/health
```

The `Dockerfile` is a three-stage build (`deps` -> `builder` -> `runner`)
producing a non-root `nestjs` user on `node:22-alpine`, with a container
`HEALTHCHECK` against `/api/v1/health`.

## Deploy

`render.yaml` documents the Render Blueprint shape for this service (Docker
web service, `free` plan, `oregon` region, `healthCheckPath:
/api/v1/health`, `autoDeploy: false`). The FlowCI-generated pipeline does
not read this file directly — it deploys via a Render deploy-hook URL plus a
post-deploy health check (see `.github/workflows/20-flowci-package.yml`).
Deploy target is resolved from branch, following the platform's
`test -> uat -> main` promotion model:

| Branch | Render environment |
|--------|---------------------|
| `test` | `test` |
| `uat` | `uat` |
| `main` | `production` |

## Quality scanning

`sonar-project.properties` is preconfigured with
`sonar.projectKey=flowci-demo-backend` /
`sonar.organization=cicd-external-project` for the pipeline's optional
SonarCloud step. That step is skipped cleanly (not failed) if
`SONAR_TOKEN`/`SONAR_ORGANIZATION`/`SONAR_PROJECT_KEY` aren't all set as
repo secrets.

## What's intentionally out of scope

- No database/persistence — tasks live in memory and reset on restart.
- No request validation library (`class-validator`) on `CreateTaskDto` — the
  DTO is type-only. Adding real validation would be a reasonable next step
  for anyone forking this into something more than a pipeline example.
- No auth/authorization on any route.
- No `.github/workflows/` editing happens from this directory — those files
  are generated/owned by the FlowCI pipeline tooling, not hand-maintained
  here.
