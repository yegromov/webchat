import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocketPlugin from '@fastify/websocket';
import { config } from './config/index.js';
import { authenticate } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { roomRoutes } from './routes/rooms.js';
import { websocketRoutes } from './routes/websocket.js';
import { prisma } from './services/database.js';
import { redis, redisSub } from './services/redis.js';

const fastify = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'info' : 'error',
  },
});

// Register plugins
fastify.register(cors, {
  origin: config.nodeEnv === 'development' ? '*' : config.corsOrigin.split(','),
  credentials: true,
});

fastify.register(jwt, {
  secret: config.jwtSecret,
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
