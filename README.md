

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
$ npx prisma migrate dev --name init
```

## Docker

Build the Docker image:

```bash
# Generating app using docker
# Build image
docker build -t google-calendar-api:latest .

# Run with external DB
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  google-calendar-api:latest

# Start both services
docker-compose up

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
