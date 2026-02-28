# Backend Dockerfile
FROM node:20-alpine AS base

RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Build stage
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Copy production dependencies
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json

# Copy prisma
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p uploads

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs && \
    chown -R appuser:nodejs /app
USER appuser

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
