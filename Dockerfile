# Build stage
FROM node:24-alpine AS builder

# Install openssl for Prisma Client to run correctly on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Generate Prisma Client and build NestJS app
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:24-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Copy built application and required production pieces
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# Install ONLY production dependencies to keep image lean
RUN npm ci --only=production && npm cache clean --force

# Expose the application port
EXPOSE 3001

# Start the production application directly
CMD ["npm", "run", "start:prod"]

