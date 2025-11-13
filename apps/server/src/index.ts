import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { config } from './config';
import { authenticate } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { roomRoutes } from './routes/rooms';
import { websocketRoutes } from './routes/websocket';
import { prisma } from './services/database';
import { redis, redisSub } from './services/redis';

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

fastify.register(websocket);

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
