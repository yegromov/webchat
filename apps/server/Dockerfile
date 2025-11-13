# Build stage
FROM node:18-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

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
WORKDIR /app/apps/server
RUN pnpm prisma:generate

# Build shared package first (required dependency)
WORKDIR /app
RUN pnpm --filter @webchat/shared build

# Build the application
RUN pnpm --filter @webchat/server build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files and source from builder
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/node_modules/.prisma ./apps/server/node_modules/.prisma
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

WORKDIR /app/apps/server

# Expose the port
EXPOSE 3001

# Start the application
CMD ["pnpm", "start"]
