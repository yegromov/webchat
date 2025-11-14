import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocketPlugin from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { config } from './config/index.js';
import { authenticate } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { roomRoutes } from './routes/rooms.js';
import { dmRoutes } from './routes/dms.js';
import { websocketRoutes } from './routes/websocket.js';
import { prisma } from './services/database.js';
import { redis, redisSub } from './services/redis.js';

const fastify = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'info' : 'error',
  },
});

// Security: Add security headers to protect against common vulnerabilities
fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: config.nodeEnv === 'production',
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

// Security: Register rate limiting to prevent brute force and DoS attacks
fastify.register(rateLimit, {
  max: 100, // Maximum 100 requests
  timeWindow: '1 minute', // Per 1 minute window
  cache: 10000, // Cache up to 10000 different IPs
  allowList: config.nodeEnv === 'development' ? ['127.0.0.1'] : [], // Allow localhost in dev
  redis: redis, // Use Redis for distributed rate limiting across instances
  nameSpace: 'rate-limit:',
  continueExceeding: true,
  skipOnError: false, // Don't skip rate limiting on errors
});

// Register plugins
fastify.register(cors, {
  origin: config.nodeEnv === 'development' ? '*' : config.corsOrigin.split(','),
  credentials: true,
});

fastify.register(jwt, {
  secret: config.jwtSecret,
  sign: {
    expiresIn: '8h', // Reduced from 24h to 8h for better security
  },
});

fastify.register(websocketPlugin);

// Add authenticate decorator
fastify.decorate('authenticate', authenticate);

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
fastify.register(authRoutes, { prefix: '/api' });
fastify.register(roomRoutes, { prefix: '/api' });
fastify.register(dmRoutes, { prefix: '/api' });
fastify.register(websocketRoutes);

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');

  try {
    await fastify.close();
    await prisma.$disconnect();
    await redis.quit();
    await redisSub.quit();
    console.log('Server closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`Server listening on port ${config.port}`);
    console.log(`WebSocket endpoint: ws://localhost:${config.port}/ws`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
