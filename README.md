# WebChat

A full-stack, production-ready TypeScript chat application built with modern web technologies.

## Features

- 🚀 **Real-time messaging** via WebSocket
- 🔐 **JWT authentication** for secure sessions
- 📦 **Monorepo structure** with pnpm workspaces
- 💾 **PostgreSQL** database with Prisma ORM
- 🔄 **Redis Pub/Sub** for horizontal scalability
- ⚡ **Fast backend** with Fastify
- 🎨 **Modern UI** with React, Vite, and Tailwind CSS
- 📊 **State management** with Zustand
- 🌐 **WebRTC-ready** signaling architecture (future support)

## Tech Stack

### Backend (apps/server)
- **Fastify** - Fast and low overhead web framework
- **TypeScript** - Type-safe development
- **PostgreSQL** - Relational database
- **Prisma** - Modern ORM
- **Redis** - Pub/Sub for message broadcasting
- **ws** - WebSocket library
- **JWT** - Secure authentication

### Frontend (apps/client)
- **React** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - State management
- **WebSocket** - Real-time communication

### Shared (packages/shared)
- Common types and interfaces
- Validation schemas with Zod
- WebSocket message types

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 14
- Redis >= 6

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yegromov/webchat.git
cd webchat
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

#### Server (.env)
```bash
cd apps/server
cp .env.example .env
```

Edit `apps/server/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/webchat?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key-change-in-production"
PORT=3001
NODE_ENV=development
```

#### Client (.env)
```bash
cd apps/client
cp .env.example .env
```

### 4. Set up the database

```bash
# Generate Prisma client
cd apps/server
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# (Optional) Open Prisma Studio to view data
pnpm prisma:studio
```

### 5. Start the development servers

From the root directory:

```bash
# Start both client and server in development mode
pnpm dev
```

Or start them separately:

```bash
# Terminal 1 - Server
cd apps/server
pnpm dev

# Terminal 2 - Client
cd apps/client
pnpm dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- WebSocket: ws://localhost:3001/ws

## Project Structure

```
webchat/
├── apps/
│   ├── client/              # React frontend
│   │   ├── src/
│   │   │   ├── components/  # React components
│   │   │   ├── services/    # API and WebSocket services
│   │   │   ├── store/       # Zustand state management
│   │   │   └── main.tsx     # Entry point
│   │   └── package.json
│   │
│   └── server/              # Fastify backend
│       ├── prisma/          # Database schema
│       ├── src/
│       │   ├── config/      # Configuration
│       │   ├── middleware/  # Auth middleware
│       │   ├── routes/      # API routes
│       │   ├── services/    # Database and Redis
│       │   └── index.ts     # Entry point
│       └── package.json
│
├── packages/
│   └── shared/              # Shared types and utilities
│       ├── src/
│       │   ├── types.ts     # TypeScript interfaces
│       │   ├── validation.ts # Zod schemas
│       │   └── index.ts
│       └── package.json
│
├── pnpm-workspace.yaml      # Workspace configuration
└── package.json             # Root package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login or register a user
- `GET /api/auth/verify` - Verify JWT token

### Rooms
- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create a new room
- `GET /api/rooms/:roomId/messages` - Get room messages

### WebSocket
- `ws://localhost:3001/ws` - WebSocket connection endpoint

### WebSocket Message Types

```typescript
enum WSMessageType {
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  SEND_MESSAGE = 'SEND_MESSAGE',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  USER_JOINED = 'USER_JOINED',
  USER_LEFT = 'USER_LEFT',
  ROOM_USERS = 'ROOM_USERS',
  ERROR = 'ERROR',
  // Future WebRTC support
  WEBRTC_OFFER = 'WEBRTC_OFFER',
  WEBRTC_ANSWER = 'WEBRTC_ANSWER',
  WEBRTC_ICE_CANDIDATE = 'WEBRTC_ICE_CANDIDATE',
}
```

## Development

### Build all packages

```bash
pnpm build
```

### Lint code

```bash
pnpm lint
```

### Clean build artifacts

```bash
pnpm clean
```

## Database Management

### Create a new migration

```bash
cd apps/server
pnpm prisma:migrate
```

### Reset the database

```bash
cd apps/server
npx prisma migrate reset
```

### View database with Prisma Studio

```bash
cd apps/server
pnpm prisma:studio
```

## Architecture Highlights

### Scalability
- **Redis Pub/Sub**: Messages are published to Redis channels, allowing multiple server instances to share messages
- **Stateless authentication**: JWT tokens enable horizontal scaling without session storage
- **Database indexing**: Optimized queries with proper indexes on foreign keys

### Real-time Communication
- **WebSocket**: Persistent connections for instant message delivery
- **Room-based messaging**: Users can join multiple rooms simultaneously
- **Online presence**: Track users in real-time per room

### Future WebRTC Support
The architecture includes placeholder message types and handlers for WebRTC signaling:
- Offer/Answer SDP exchange
- ICE candidate exchange
- Ready for peer-to-peer audio/video calls

## Security

- JWT tokens for authentication
- Password hashing ready (currently anonymous)
- CORS configuration for production
- Environment-based secrets
- SQL injection protection via Prisma
- WebSocket authentication

## Production Deployment

### Build for production

```bash
pnpm build
```

### Environment variables

Ensure all production environment variables are set:
- Update `JWT_SECRET` to a secure random string
- Configure production database URL
- Configure production Redis URL
- Set `NODE_ENV=production`
- Update CORS origin in server config

### Run in production

```bash
# Server
cd apps/server
pnpm start

# Client (serve build folder with nginx, caddy, etc.)
cd apps/client
pnpm build
# Serve the dist/ folder
```

## Docker Support (Coming Soon)

Docker and docker-compose configurations for easy deployment.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
