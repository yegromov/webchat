# Build stage
FROM node:25-alpine AS builder

# Install pnpm using npm
RUN npm install -g pnpm@latest

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/server ./apps/server
COPY packages/shared ./packages/shared

# Generate Prisma client
RUN pnpm --filter @webchat/server prisma:generate

# Build shared package first (required dependency)
WORKDIR /app
RUN pnpm --filter @webchat/shared build

# Build the application
RUN pnpm --filter @webchat/server build

# Production stage
FROM node:25-alpine AS production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install pnpm using npm
RUN npm install -g pnpm@latest

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/

# Set CI environment variable for pnpm
ENV CI=true

# Copy prisma schema before installing dependencies
COPY apps/server/prisma ./apps/server/prisma

# Install all dependencies (we need to keep prisma CLI for migrations)
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @webchat/server prisma:generate

# Copy built files from builder
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

WORKDIR /app/apps/server

# Expose the port
EXPOSE 3001

# Start the application
CMD ["pnpm", "start"]
