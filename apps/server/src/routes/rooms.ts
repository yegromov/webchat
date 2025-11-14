import { FastifyInstance } from 'fastify';
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../services/database.js';
import { nanoid } from 'nanoid';

export async function roomRoutes(fastify: FastifyInstance) {
  // Get all rooms
  fastify.get('/rooms', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const rooms = await prisma.room.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return { rooms };
    } catch (error) {
      console.error('Error fetching rooms:', error);
      reply.code(500).send({ error: 'Failed to fetch rooms' });
    }
  });

  // Get or create a room by name
  fastify.post('/rooms', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { name } = request.body as { name: string };

      // Security: Comprehensive room name validation
      if (!name || typeof name !== 'string') {
        reply.code(400).send({ error: 'Room name is required and must be a string' });
        return;
      }

      const trimmedName = name.trim();

      if (trimmedName.length < 1 || trimmedName.length > 50) {
        reply.code(400).send({ error: 'Room name must be 1-50 characters long' });
        return;
      }

      // Security: Prevent special characters and script injection in room names
      const validNamePattern = /^[a-zA-Z0-9\s\-_]+$/;
      if (!validNamePattern.test(trimmedName)) {
        reply.code(400).send({ error: 'Room name can only contain letters, numbers, spaces, hyphens, and underscores' });
        return;
      }

      // Security: Prevent SQL injection patterns
      const sqlInjectionPattern = /(union|select|insert|update|delete|drop|create|alter|exec|script)/i;
      if (sqlInjectionPattern.test(trimmedName)) {
        reply.code(400).send({ error: 'Invalid room name' });
        return;
      }

      // Try to find existing room
      let room = await prisma.room.findFirst({
        where: { name: trimmedName },
      });

      if (!room) {
        room = await prisma.room.create({
          data: {
            id: nanoid(),
            name: trimmedName,
          },
        });

        // Security: Log room creation for monitoring
        fastify.log.info({
          type: 'room_created',
          roomName: trimmedName,
          createdBy: (request.user as any)?.username,
        }, 'New room created');
      }

      return { room };
    } catch (error: any) {
      fastify.log.error({ type: 'room_error', error: error.message }, 'Error creating/fetching room');
      if (error.code === 'P2002') {
        // Prisma unique constraint violation
        reply.code(409).send({ error: 'Room name already exists' });
      } else {
        reply.code(500).send({ error: 'Failed to create room' });
      }
    }
  });

  // Get room messages
  fastify.get('/rooms/:roomId/messages', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { roomId } = request.params as { roomId: string };
      const { limit = '50', before } = request.query as { limit?: string; before?: string };

      // Security: Validate UUID format for roomId to prevent injection
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(roomId)) {
        reply.code(400).send({ error: 'Invalid room ID format' });
        return;
      }

      // Validate limit parameter
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        reply.code(400).send({ error: 'Invalid limit (must be 1-100)' });
        return;
      }

      // Validate date parameter if provided
      if (before) {
        const date = new Date(before);
        if (isNaN(date.getTime())) {
          reply.code(400).send({ error: 'Invalid date format for before parameter' });
          return;
        }
      }

      const messages = await prisma.message.findMany({
        where: {
          roomId,
          ...(before && { createdAt: { lt: new Date(before) } }),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limitNum,
      });

      return {
        messages: messages.map((m: any) => ({
          id: m.id,
          content: m.content,
          userId: m.userId,
          username: m.user.username,
          roomId: m.roomId,
          createdAt: m.createdAt,
        })).reverse(),
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      reply.code(500).send({ error: 'Failed to fetch messages' });
    }
  });
}
