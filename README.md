

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod

# generate the SQL migration files and run them against the database(if your are running it locally).
# change/create the DATABASE_URL env variable to reach the correct database 
$ npx prisma migrate dev --name init
```

## Docker

Build the Docker image:

```bash
# Generating app using docker
# Start both services and app runs(this uses port 3001 by default)
docker-compose up

# Build image
docker build -t google-calendar-api:latest .

# Run with external DB
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  google-calendar-api:latest

# Run migrations if needed
docker-compose exec api npx prisma migrate deploy

# Stop services
docker-compose down

```


## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Google Calendar integration

This API checks booking conflicts against Google Calendar using the `freebusy` endpoint.

### Important about `@google-cloud/local-auth`

`@google-cloud/local-auth` is for local interactive OAuth consent in scripts and CLI apps.
For this NestJS backend, use one of these server-friendly options instead:

1. OAuth2 refresh token (recommended for personal Gmail calendar access)
2. Service account credentials (recommended for Workspace/service calendars)

### Required variable

Set the target calendar:

```env
GOOGLE_CALENDAR_ID=your_calendar_id_or_email
```

### Option A: OAuth2 refresh token

Set all of these variables:

```env
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
GOOGLE_CALENDAR_ID=...
```

To get `GOOGLE_OAUTH_REFRESH_TOKEN`, run:

```bash
npm run google:refresh-token -- "C:/Users/frank/Downloads/client_secret_xxx.apps.googleusercontent.com.json"
```

If your client credentials are already in `.env`, you can run without a file path:

```bash
npm run google:refresh-token
```

The script will print a consent URL, then ask for the authorization code from the callback URL.
If refresh token is empty, remove previous app access at `https://myaccount.google.com/permissions`
and run again.

### Option B: Service account JSON file path

```env
GOOGLE_APPLICATION_CREDENTIALS=./secrets/service-account.json
GOOGLE_CALENDAR_ID=...
```

### Option C: Service account email + private key

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=...@...iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
GOOGLE_CALENDAR_ID=...
```

Do not use an API key in `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`.
