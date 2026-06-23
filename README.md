# Google Calendar API

NestJS + Prisma API for authenticated bookings with conflict checks against:

1. Existing local bookings in PostgreSQL
2. Google Calendar free/busy availability

The service is designed for quick verification in interview/demo environments and includes unit tests for core booking and auth logic.

## Stack

- NestJS 11
- Prisma 7 + PostgreSQL (via `@prisma/adapter-pg`)
- JWT authentication (`passport-jwt`)
- Google Calendar API (`googleapis`)
- Jest for unit/e2e tests

## Prerequisites

- Node.js >= 24
- npm >= 11
- PostgreSQL 16+ (or Docker)

## Quick Start (Local)

1. Install dependencies:

```bash
npm install
```

2. Create your `.env` file (minimal working example):

```env
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/google_calendar_api
JWT_SECRET=replace_with_a_strong_secret
JWT_EXPIRES_IN=86400

# Optional Google fallback calendar when user-specific calendar is not set
GOOGLE_CALENDAR_ID=primary

# Optional service-account credentials (recommended for backend checks)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
```

3. Apply migrations:

```bash
npx prisma migrate dev
```

4. Start the API:

```bash
npm run start:dev
```

5. Health check:

```bash
curl http://localhost:3001
```

Expected response:

```json
{
  "status": "ok",
  "service": "google-calendar-api"
}
```

## API Flow (Prove It in 2 Minutes)

### 1) Register user

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","name":"Demo User"}'
```

Response includes:

```json
{ "accessToken": "..." }
```

### 2) Create a booking

Use the token from previous step:

```bash
curl -X POST http://localhost:3001/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"title":"Planning Session","startsAt":"2026-06-24T10:00:00.000Z","endsAt":"2026-06-24T11:00:00.000Z"}'
```

Optional request header for user-scoped Google check:

```text
x-google-access-token: <GOOGLE_OAUTH_ACCESS_TOKEN>
```

### 3) Verify lists

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:3001/bookings
curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:3001/bookings/taken
```

### 4) Connect a calendar id to user

```bash
curl -X PATCH http://localhost:3001/bookings/calendar/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"calendarId":"primary"}'
```

## Endpoints

Public:

- `GET /` health status
- `POST /auth/register`
- `POST /auth/login`

Protected (Bearer token required):

- `GET /bookings`
- `POST /bookings`
- `DELETE /bookings/:bookingId`
- `GET /bookings/taken`
- `GET /bookings/calendar`
- `PATCH /bookings/calendar/connect`

## Validation and Constraints

Current enforced constraints:

- User email: max length 150
- User name: max length 150
- Booking title: min length 3, max length 250
- Booking time range: `startsAt < endsAt`

The constraints are enforced in:

1. DTO validation (request-level)
2. Prisma schema column types (`VARCHAR`) for persistence

## Google Calendar Integration

Bookings are checked against Google Calendar `freebusy`.

Credential sources supported by this backend:

1. Request-scoped OAuth access token (`x-google-access-token` header)
2. Service account email + private key (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`)
3. Fallback calendar id via `GOOGLE_CALENDAR_ID` (defaults to `primary`)

Notes:

- If no Google credentials are available, Google conflict checks are skipped and only local DB conflicts are enforced.
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` must be a real private key block, not an API key.

## Docker

Start API + PostgreSQL using compose:

```bash
docker compose up --build
```

Run migrations in container(if neccessary):

```bash
docker compose exec api npx prisma migrate deploy
```

Stop services:

```bash
docker compose down --volumes
```

## Scripts

```bash
# Build
npm run build

# Local dev
npm run start
npm run start:dev
npm run start:prod

# Prisma client generation
npm run prisma:generate

# Tests
npm run test
npm run test:e2e
npm run test:cov
```

## Testing

Core logic is covered by unit tests, especially:

- `src/auth/auth.service.spec.ts`
- `src/bookings/bookings.service.spec.ts`

Run all unit tests:

```bash
npm run test
```

## Troubleshooting

`JWT_SECRET is not configured`

- Add `JWT_SECRET` to `.env`.

`DATABASE_URL is not configured`

- Add `DATABASE_URL` and ensure PostgreSQL is reachable.

Google checks not happening:

- Provide `x-google-access-token` per request, or
- Configure service-account env vars.

Prisma/client mismatch after schema changes:

```bash
npx prisma migrate dev
npm run prisma:generate
```
