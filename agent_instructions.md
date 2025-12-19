# Copilot / AI Agent Instructions

This repository is an Express + TypeScript backend template for a loyalty B2B service. The file below collects concise, actionable knowledge for AI agents working in this codebase.

1) Big picture
- Entrypoint: `src/server.ts` — mounts routers from `src/routes/*`, initializes MQ (`src/mq/mqService.ts`) and master cache (`src/utils/masterCache.ts`).
- HTTP layer: `src/routes/*` → `src/controllers/*` → `src/services/*` → `src/config/db.ts` (Drizzle ORM). Use `BaseService` in `src/services/baseService.ts` for common DB patterns.
- Data modeling: Drizzle schema files under `drizzle/` and `src/schema` (tables are referenced from `src/schema`). CRUD uses `drizzle-orm` and Zod for validations (services often supply a Zod schema).
- Caching / sessions: Redis is used for sessions/caches (`src/config/redis.ts`, `src/auth/authService.ts`, `src/middlewares/auth.ts`).
- Messaging: MQ connectors live under `src/mq/` with multiple drivers (BullMQ, RabbitMQ, SQS). `initMQ()` is invoked from `src/server.ts` and is a no-op if no driver configured.
- External vendors: `src/communications/vendors/*` and `src/connectors/*` implement third-party integrations (SendGrid, Twilio, S3/GCS/FTP).

2) Auth & security patterns (explicit, important)
- `src/middlewares/auth.ts` supports three credential sources: `Authorization: Bearer <jwt>`, `x-api-key` header, or a session id (`sessionId` cookie or `x-session-id` header).
- JWT helpers are in `src/config/jwt.ts` and used by `src/controllers/auth.controller.ts` (login/register). Login also stores a Redis session id (`sess:<userId>:<ts>`).
- API key check is a simple header == `process.env.API_KEY` (see `authenticate` middleware). No role-based checks are applied automatically — controllers/middlewares must enforce them.

3) Coding conventions & patterns
- Services: extend or instantiate `BaseService` (see `src/services/baseService.ts`). Common methods: `create`, `findOne`, `update`, `delete`, `findManyPaginated`. Use `where` args either as Drizzle SQL or plain objects — `BaseService.whereObj` converts objects to SQL.
- Validation: optional Zod schemas passed to `new BaseService(table, schema)`. If provided, `create`/`update` call `schema.parse(...)`.
- Controllers: keep business logic thin — call services and return `success()` responses using `src/utils/response.ts`.
- Transactions: use `BaseService.transaction` or `withTx` for multi-table ops.
- Background jobs: queue code is in `src/mq/*` and connectors; scheduling and initiation are centralized in `src/mq/mqService.ts` and `src/server.ts`.

4) Project-specific developer workflows
- Run locally (dev): `yarn dev` (uses `nodemon src/server.ts`).
- Build: `yarn build` (runs `tsc`). Production start expects compiled output: `yarn start` → `node dist/server.js`.
- Linting: `yarn lint` (ESLint run against `src`).
- DB migrations / schema: project includes `drizzle/` and `drizzle.config.ts` — use `drizzle-kit` (devDependency) for migrations; check `drizzle.config.ts` before running any migrate commands.

5) Files to open first when diagnosing or adding features
- `src/server.ts` — server wiring, route mounts, MQ & cache init.
- `src/middlewares/auth.ts` — credential logic (JWT / API key / session). Necessary when debugging auth failures.
- `src/services/baseService.ts` — central DB access patterns and transaction helpers.
- `src/controllers/auth.controller.ts` and `src/services/userService.ts` — simple, canonical examples of controller → service flow.
- `src/config/*.ts` — `db.ts`, `redis.ts`, `jwt.ts` for environment-driven integrations.

6) How to add a new HTTP resource (example pattern)
- Create service in `src/services/` (prefer extending `BaseService` and define a Zod schema if validation is needed).
- Add controller in `src/controllers/` that uses the service, returning `success()` from `src/utils/response.ts`.
- Add router in `src/routes/` and export default Router. Mount the router in `src/server.ts` under `/api/v1/<resource>`.

7) Integration & environment notes
- Environment controls critical behavior: `API_KEY`, MQ driver env vars, Postgres connection in `src/config/db.ts`, Redis connection in `src/config/redis.ts`.
- Many connectors are conditional — code checks DRIVER or presence of env vars and does a noop if not configured (safe to run without every external system in dev).

8) Tests & CI
- No test scripts detected in `package.json`. There are no explicit tests in the repository — add tests under a `test/` folder and a `test` script if required by CI.

9) What not to change without checking with maintainers
- Do not change auth contract surface (headers/cookie names) without coordination — many clients rely on `Authorization`, `x-api-key`, or `sessionId` cookie.
- Avoid altering `BaseService` behavior without running any DB scripts or test harness — it is core to many services.

10) Active Implementation Plan (TODOs)
- [ ] Onboarding & KYC
    - [ ] Create generic `OnboardingService` (User creation + Role specific tables).
    - [ ] Implement `KYCService` (Doc verification for Aadhar, PAN, GST).
- [ ] Scanning (Earning)
    - [ ] Create `EarningService` with generic QR scan logic.
    - [ ] 3-Layer Logic:
        1. Base: Validation, Point Lookup, Txn/Ledger update.
        2. Optional: Location/Region checks, User Mapping.
        3. Business Logic: Cross-user checks (Counter vs Retailer).

