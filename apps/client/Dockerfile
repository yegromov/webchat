# Build stage
FROM node:25-alpine AS builder

# Install pnpm using npm
RUN npm install -g pnpm@latest

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json ./apps/client/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/client ./apps/client
COPY packages/shared ./packages/shared

# Set environment variables for build
ARG VITE_API_URL=http://localhost:3001
ARG VITE_WS_URL=ws://localhost:3001/ws
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Build shared package first (required dependency)
WORKDIR /app
RUN pnpm --filter @webchat/shared build

# Build the application
RUN pnpm --filter @webchat/client build

# Production stage - serve with nginx
FROM nginx:alpine AS production

# Copy built files
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
