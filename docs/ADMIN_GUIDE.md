# WebChat Administrator Guide

Complete guide for administrators to deploy, manage, and maintain the WebChat application.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Installation & Deployment](#installation--deployment)
4. [Configuration](#configuration)
5. [Database Management](#database-management)
6. [User Management](#user-management)
7. [Monitoring & Logs](#monitoring--logs)
8. [Security](#security)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)
11. [Scaling](#scaling)

---

## System Overview

### What is WebChat?

WebChat is a real-time chat application with the following features:

- **Multi-room chat** - Public chat rooms
- **Direct messaging** - Private 1-on-1 conversations
- **User profiles** - Username, age, sex, country
- **Optional registration** - Anonymous or password-protected accounts
- **User blocking** - Privacy controls
- **Online status** - Real-time user presence

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite (build tool)
- Zustand (state management)
- Tailwind CSS (styling)

**Backend:**
- Node.js (v25+)
- Fastify (web framework)
- WebSocket (ws library)
- PostgreSQL (database)
- Redis (pub/sub for scaling)
- Prisma (ORM)

**Infrastructure:**
- Docker & Docker Compose
- pnpm (package manager)

---

## Architecture

### System Components

```
┌─────────────┐
│   Client    │ (React SPA)
│  (Browser)  │
└──────┬──────┘
       │ HTTP/WS
       ▼
┌─────────────┐
│   Server    │ (Fastify + WebSocket)
│  (Node.js)  │
└──────┬──────┘
       │
   ┌───┴────┐
   ▼        ▼
┌──────┐ ┌───────┐
│ DB   │ │ Redis │
│(PG)  │ │(Pub/  │
│      │ │Sub)   │
└──────┘ └───────┘
```

### Data Flow

**Room Messages:**
1. Client sends message via WebSocket
2. Server validates and sanitizes
3. Saved to PostgreSQL
4. Published to Redis channel
5. All connected servers receive
6. Broadcast to clients in room

**Direct Messages:**
1. Client sends DM via WebSocket
2. Server checks blocking status
3. Saved to PostgreSQL
4. Published to Redis (receiver's channel)
5. Delivered to receiver's socket

**Online Users:**
1. User connects via WebSocket
2. User profile fetched from database
3. Broadcast to all connected clients
4. Updated on connect/disconnect

### Database Schema

**Tables:**
- `users` - User profiles and credentials
- `rooms` - Chat rooms
- `messages` - Room messages
- `direct_messages` - Private messages
- `blocked_users` - Blocking relationships

**Indexes:**
- User lookup: `username` (unique)
- Message queries: `roomId`, `createdAt`
- DM queries: `senderId`, `receiverId`
- Blocking: `blockerId`, `blockedId`

### Redis Channels

- `room:message` - Room message broadcasts
- `user:joined` - User join events
- `user:left` - User leave events
- `direct:message` - Direct message delivery
- `online:users` - Online user list updates

---

## Installation & Deployment

### Prerequisites

- **Node.js** v25 or higher
- **pnpm** v10.22 or higher
- **PostgreSQL** 14+ (or Docker)
- **Redis** 7+ (or Docker)
- **Docker** and **Docker Compose** (recommended)

### Quick Start with Docker

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd webchat
   ```

2. **Configure environment:**
   ```bash
   cp apps/server/.env.example apps/server/.env
   # Edit .env with your settings
   ```

3. **Start services:**
   ```bash
   docker-compose up -d
   ```

4. **Run migrations:**
   ```bash
   docker-compose exec server pnpm prisma migrate deploy
   ```

5. **Access the application:**
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:3001`
   - WebSocket: `ws://localhost:3001/ws`

### Manual Installation

#### 1. Install Dependencies

```bash
pnpm install
```

#### 2. Set Up PostgreSQL

Create database:
```sql
CREATE DATABASE webchat;
CREATE USER webchat_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE webchat TO webchat_user;
```

#### 3. Set Up Redis

```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis
```

#### 4. Configure Environment

Create `apps/server/.env`:
```env
# Server
PORT=3001
NODE_ENV=production

# Database
DATABASE_URL="postgresql://webchat_user:your_password@localhost:5432/webchat"

# Redis
REDIS_URL="redis://localhost:6379"

# Security
JWT_SECRET="your-super-secret-jwt-key-change-this"

# CORS
CORS_ORIGIN="http://localhost:3000,https://yourdomain.com"
```

Create `apps/client/.env`:
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001/ws
```

#### 5. Build Application

```bash
# Build shared package
pnpm --filter @webchat/shared build

# Build server
pnpm --filter @webchat/server build

# Build client
pnpm --filter @webchat/client build
```

#### 6. Run Database Migrations

```bash
cd apps/server
pnpm prisma migrate deploy
```

#### 7. Start Services

**Development:**
```bash
# Terminal 1 - Server
pnpm --filter @webchat/server dev

# Terminal 2 - Client
pnpm --filter @webchat/client dev
```

**Production:**
```bash
# Server
pnpm --filter @webchat/server start

# Client (serve static files with nginx/apache)
```

---

## Configuration

### Environment Variables

#### Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3001 | Server port |
| `NODE_ENV` | No | development | Environment mode |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `JWT_SECRET` | Yes | - | Secret for JWT tokens |
| `CORS_ORIGIN` | No | * | Allowed CORS origins |

#### Client Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | http://localhost:3001 | Backend API URL |
| `VITE_WS_URL` | No | ws://localhost:3001/ws | WebSocket URL |

### JWT Configuration

JWT tokens expire after **24 hours**. To modify:

Edit `apps/server/src/routes/auth.ts`:
```typescript
const token = fastify.jwt.sign({
  userId: user.id,
  username: user.username,
}, {
  expiresIn: '24h', // Change this value
});
```

Options: `'1h'`, `'7d'`, `'30d'`, etc.

### Message Length Limits

**Room Messages:**
- Edit `apps/server/src/routes/websocket.ts`
- Line ~211: `if (trimmedContent.length > 5000)`

**Direct Messages:**
- Edit `apps/server/src/routes/websocket.ts`
- Line ~360: `if (trimmedContent.length > 1000)`

### WebSocket Reconnection

Configure in `apps/client/src/services/websocket.ts`:
```typescript
private maxReconnectAttempts = 5;  // Max reconnection attempts
private reconnectDelay = 1000;     // Initial delay (ms)
```

---

## Database Management

### Accessing the Database

**Via Docker:**
```bash
docker-compose exec postgres psql -U webchat_user -d webchat
```

**Direct:**
```bash
psql -U webchat_user -d webchat
```

### Common Queries

**View all users:**
```sql
SELECT id, username, age, sex, country, "createdAt"
FROM users
ORDER BY "createdAt" DESC;
```

**View registered users only:**
```sql
SELECT username, age, sex, country, "createdAt"
FROM users
WHERE password IS NOT NULL
ORDER BY "createdAt" DESC;
```

**View all rooms:**
```sql
SELECT id, name, "createdAt",
  (SELECT COUNT(*) FROM messages WHERE "roomId" = rooms.id) as message_count
FROM rooms
ORDER BY "createdAt" DESC;
```

**View recent room messages:**
```sql
SELECT m.content, u.username, m."createdAt", r.name as room
FROM messages m
JOIN users u ON m."userId" = u.id
JOIN rooms r ON m."roomId" = r.id
ORDER BY m."createdAt" DESC
LIMIT 50;
```

**View direct messages between users:**
```sql
SELECT dm.content,
  s.username as sender,
  r.username as receiver,
  dm."createdAt"
FROM direct_messages dm
JOIN users s ON dm."senderId" = s.id
JOIN users r ON dm."receiverId" = r.id
WHERE (dm."senderId" = 'user1_id' AND dm."receiverId" = 'user2_id')
   OR (dm."senderId" = 'user2_id' AND dm."receiverId" = 'user1_id')
ORDER BY dm."createdAt" ASC;
```

**View blocked relationships:**
```sql
SELECT b.username as blocker, u.username as blocked, bu."createdAt"
FROM blocked_users bu
JOIN users b ON bu."blockerId" = b.id
JOIN users u ON bu."blockedId" = u.id
ORDER BY bu."createdAt" DESC;
```

### Database Migrations

**Create a new migration:**
```bash
cd apps/server
pnpm prisma migrate dev --name your_migration_name
```

**Apply migrations (production):**
```bash
pnpm prisma migrate deploy
```

**Reset database (WARNING: Deletes all data):**
```bash
pnpm prisma migrate reset
```

**Generate Prisma client:**
```bash
pnpm prisma generate
```

### Database Maintenance

**Vacuum (cleanup):**
```sql
VACUUM ANALYZE;
```

**Reindex:**
```sql
REINDEX DATABASE webchat;
```

**Check database size:**
```sql
SELECT pg_size_pretty(pg_database_size('webchat'));
```

**Check table sizes:**
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## User Management

### Viewing Users

**All users:**
```sql
SELECT username, age, sex, country,
  CASE WHEN password IS NULL THEN 'Anonymous' ELSE 'Registered' END as type,
  "createdAt"
FROM users
ORDER BY "createdAt" DESC;
```

**Online users (via API):**
- Currently online users are managed in memory
- Check server logs for connection events

### Deleting Users

**Delete specific user:**
```sql
DELETE FROM users WHERE username = 'baduser';
```

**Delete anonymous users older than 30 days:**
```sql
DELETE FROM users
WHERE password IS NULL
  AND "createdAt" < NOW() - INTERVAL '30 days';
```

### Resetting User Passwords

**Cannot reset via SQL** (passwords are hashed with bcrypt)

**Options:**
1. Delete the user account (they can re-register)
2. Add a password reset feature (requires development)
3. Manually update password hash (advanced)

### Banning Users

**Currently no built-in ban system.**

**Workarounds:**
1. Delete their account
2. Add IP blocking at firewall level
3. Implement a ban table (requires development)

**Recommended implementation:**
```sql
CREATE TABLE banned_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  reason TEXT,
  banned_at TIMESTAMP DEFAULT NOW(),
  banned_by TEXT
);
```

---

## Monitoring & Logs

### Server Logs

**Docker:**
```bash
docker-compose logs -f server
```

**PM2 (if using):**
```bash
pm2 logs webchat-server
```

**Direct:**
```bash
# Logs printed to stdout/stderr
```

### Log Levels

Configured in `apps/server/src/index.ts`:
```typescript
logger: {
  level: config.nodeEnv === 'development' ? 'info' : 'error',
}
```

Levels: `'trace'`, `'debug'`, `'info'`, `'warn'`, `'error'`, `'fatal'`

### Key Events to Monitor

**Connection Events:**
- `WebSocket connected`
- `WebSocket disconnected`
- Token verification failures

**Error Events:**
- `Login error:`
- `WebSocket message error:`
- Database connection errors
- Redis connection errors

**Application Events:**
- Server start: `Server listening on port`
- Shutdown: `Shutting down gracefully...`

### Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-14T12:00:00.000Z"
}
```

**Monitoring script:**
```bash
#!/bin/bash
while true; do
  status=$(curl -s http://localhost:3001/health | jq -r '.status')
  if [ "$status" != "ok" ]; then
    echo "ALERT: Server unhealthy!"
    # Send alert email/notification
  fi
  sleep 60
done
```

### Performance Monitoring

**Database connections:**
```sql
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE datname = 'webchat';
```

**Redis info:**
```bash
redis-cli INFO stats
```

**Memory usage:**
```bash
docker stats webchat-server-1
```

---

## Security

### Authentication

**JWT Tokens:**
- 24-hour expiration
- Signed with `JWT_SECRET`
- Contains: `userId`, `username`

**Password Hashing:**
- bcrypt with 10 salt rounds
- Stored in `users.password` (hashed)

### Input Validation

**Server-side validation (Zod):**
- Username: 3-20 characters
- Age: 13-120 years
- Sex: 'F' or 'M' only
- Password: 6-100 characters (optional)

**XSS Protection:**
- All messages sanitized with `sanitizeHtml()`
- HTML entities escaped: `&<>"`

### SQL Injection Protection

- **Prisma ORM** prevents SQL injection
- Parameterized queries only
- No raw SQL in application code

### WebSocket Security

- Token required for connection
- Invalid/missing tokens rejected (code 4001)
- All message types validated

### CORS Configuration

Edit `apps/server/src/index.ts`:
```typescript
fastify.register(cors, {
  origin: config.nodeEnv === 'development'
    ? '*'
    : config.corsOrigin.split(','),
  credentials: true,
});
```

**Production:** Set specific origins in `CORS_ORIGIN` env var

### Rate Limiting (Recommended)

**Not currently implemented**

Add `@fastify/rate-limit`:
```bash
pnpm add @fastify/rate-limit
```

Configure:
```typescript
import rateLimit from '@fastify/rate-limit';

fastify.register(rateLimit, {
  max: 100,           // Max 100 requests
  timeWindow: '1 minute'
});
```

### Security Headers

Add helmet for security headers:
```bash
pnpm add @fastify/helmet
```

```typescript
import helmet from '@fastify/helmet';
fastify.register(helmet);
```

---

## Backup & Recovery

### Database Backups

**Manual backup:**
```bash
pg_dump -U webchat_user webchat > backup_$(date +%Y%m%d).sql
```

**Restore backup:**
```bash
psql -U webchat_user webchat < backup_20251114.sql
```

**Automated daily backups (cron):**
```bash
0 2 * * * pg_dump -U webchat_user webchat > /backups/webchat_$(date +\%Y\%m\%d).sql
```

**Docker backup:**
```bash
docker-compose exec postgres pg_dump -U webchat_user webchat > backup.sql
```

### Redis Persistence

Redis configuration in docker-compose.yml includes:
- AOF (Append Only File) persistence
- Automatic saves every 60 seconds

**Manual save:**
```bash
redis-cli SAVE
```

### Backup Strategy

**Recommended:**
1. **Daily** PostgreSQL dumps
2. **Weekly** full system backups
3. **Monthly** archival to off-site storage
4. Keep last **30 days** of daily backups
5. Keep last **12 months** of monthly backups

### Disaster Recovery

**Complete system failure:**
1. Restore PostgreSQL from latest backup
2. Restore Redis data (if needed)
3. Rebuild and deploy application
4. Test all functionality

**Recovery Time Objective (RTO):** 1-2 hours
**Recovery Point Objective (RPO):** 24 hours (with daily backups)

---

## Troubleshooting

### Common Issues

#### Server Won't Start

**Error:** `EADDRINUSE` (Port already in use)
```bash
# Find process using port 3001
lsof -i :3001
# Kill process
kill -9 <PID>
```

**Error:** Database connection failed
- Check PostgreSQL is running
- Verify `DATABASE_URL` is correct
- Check database exists and user has permissions

**Error:** Redis connection failed
- Check Redis is running: `redis-cli PING`
- Verify `REDIS_URL` is correct

#### WebSocket Connection Fails

**Client error:** "WebSocket connection failed"
- Check server is running
- Verify WebSocket URL is correct
- Check firewall allows WebSocket connections
- Ensure JWT token is valid

**Server closes connection (4001):**
- Token missing or invalid
- User regenerate token (re-login)

#### Messages Not Delivering

**Room messages:**
- Check user is in room
- Verify message within length limit
- Check database connection
- Review server logs for errors

**Direct messages:**
- Check recipient is online
- Verify sender is not blocked
- Check database connection

#### Database Performance Issues

**Slow queries:**
```sql
-- Find slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

**Solution:**
- Add indexes if needed
- Optimize queries
- Increase PostgreSQL resources

### Debug Mode

Enable detailed logging:

```typescript
// apps/server/src/index.ts
const fastify = Fastify({
  logger: {
    level: 'debug',  // Change to debug
  },
});
```

### Checking Connections

**Active WebSocket connections:**
- Check server logs
- Currently stored in memory (Map)

**Database connections:**
```sql
SELECT * FROM pg_stat_activity WHERE datname = 'webchat';
```

**Redis connections:**
```bash
redis-cli CLIENT LIST
```

---

## Scaling

### Horizontal Scaling

WebChat supports horizontal scaling via Redis pub/sub:

**Architecture:**
```
     ┌─────────┐     ┌─────────┐     ┌─────────┐
     │ Server1 │     │ Server2 │     │ Server3 │
     └────┬────┘     └────┬────┘     └────┬────┘
          │               │               │
          └───────┬───────┴───────┬───────┘
                  │               │
              ┌───▼───┐       ┌───▼────┐
              │ Redis │       │   DB   │
              │Pub/Sub│       │  (PG)  │
              └───────┘       └────────┘
```

**Setup:**
1. Deploy multiple server instances
2. All connect to same PostgreSQL and Redis
3. Load balancer distributes connections
4. Messages broadcast via Redis

**Load Balancer Configuration (nginx):**
```nginx
upstream websocket_backend {
    ip_hash;  # Sticky sessions for WebSocket
    server server1:3001;
    server server2:3001;
    server server3:3001;
}

server {
    listen 80;

    location /ws {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /api {
        proxy_pass http://websocket_backend;
    }
}
```

### Vertical Scaling

**Database:**
- Increase PostgreSQL memory and CPU
- Add read replicas for read-heavy workloads
- Partition large tables

**Redis:**
- Increase Redis memory
- Use Redis Cluster for persistence

**Application Servers:**
- Increase Node.js heap size:
  ```bash
  NODE_OPTIONS="--max-old-space-size=4096" npm start
  ```

### Performance Optimization

**Database:**
- Add indexes on frequently queried columns
- Implement connection pooling
- Archive old messages

**Redis:**
- Monitor memory usage
- Set eviction policies
- Use Redis pipelining for bulk operations

**Application:**
- Enable gzip compression
- Implement caching (Redis)
- Optimize message serialization

### Capacity Planning

**Per server instance (estimated):**
- **CPU:** 2-4 cores
- **RAM:** 2-4 GB
- **Concurrent connections:** 1,000-5,000
- **Messages/second:** 100-500

**Database:**
- **Initial:** 10 GB storage
- **Growth:** ~100-500 MB/month (depends on usage)

**Redis:**
- **Memory:** 512 MB - 2 GB
- **Persistence:** 1-5 GB disk

---

## Maintenance Tasks

### Daily
- [ ] Check server health (`/health` endpoint)
- [ ] Monitor error logs
- [ ] Verify backup completed

### Weekly
- [ ] Review database size
- [ ] Check slow queries
- [ ] Review user reports (if any)
- [ ] Update dependencies (security patches)

### Monthly
- [ ] Database vacuum and analyze
- [ ] Archive old messages (optional)
- [ ] Review and clean up old backups
- [ ] Security audit
- [ ] Performance review

### Quarterly
- [ ] Major version updates
- [ ] Capacity planning review
- [ ] Disaster recovery test
- [ ] Security penetration testing

---

## API Reference

### REST Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login/register user |
| POST | `/api/auth/check-username` | No | Check username availability |
| GET | `/api/auth/verify` | Yes | Verify JWT token |
| GET | `/api/rooms` | Yes | List all rooms |
| POST | `/api/rooms` | Yes | Create room |
| GET | `/api/rooms/:id/messages` | Yes | Get room messages |
| GET | `/api/dms` | Yes | Get all DM conversations |
| GET | `/api/dms/:userId` | Yes | Get DM with specific user |
| POST | `/api/users/:userId/block` | Yes | Block user |
| DELETE | `/api/users/:userId/block` | Yes | Unblock user |
| GET | `/api/blocked-users` | Yes | Get blocked users |

### WebSocket Messages

**Client → Server:**
- `JOIN_ROOM` - Join a chat room
- `LEAVE_ROOM` - Leave a chat room
- `SEND_MESSAGE` - Send room message
- `SEND_DM` - Send direct message

**Server → Client:**
- `MESSAGE_RECEIVED` - New room message
- `DM_RECEIVED` - New direct message
- `ONLINE_USERS` - Online users list
- `ROOM_USERS` - Users in specific room
- `USER_JOINED` - User joined room
- `USER_LEFT` - User left room
- `ERROR` - Error message

---

## Support & Resources

### Documentation
- User Guide: `docs/USER_GUIDE.md`
- Admin Guide: `docs/ADMIN_GUIDE.md` (this file)
- Deployment Guide: `docs/DEPLOYMENT.md`

### Technical Resources
- Fastify: https://www.fastify.io/
- Prisma: https://www.prisma.io/
- React: https://react.dev/
- PostgreSQL: https://www.postgresql.org/
- Redis: https://redis.io/

### Getting Help
- Check server logs first
- Review this documentation
- Check GitHub issues
- Contact development team

---

**Last Updated:** November 2025
**Version:** 1.0.0

This guide covers all aspects of administering WebChat. For questions or suggestions, please contact the development team.
