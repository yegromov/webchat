import { FastifyInstance } from 'fastify';
import { prisma } from '../services/database';
import { nanoid } from 'nanoid';

export async function roomRoutes(fastify: FastifyInstance) {
  // Get all rooms
  fastify.get('/rooms', {
    onRequest: [fastify.authenticate],
  }, async () => {
    const rooms = await prisma.room.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return { rooms };
  });

  // Get or create a room by name
  fastify.post('/rooms', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { name } = request.body as { name: string };

    if (!name || name.length < 1 || name.length > 50) {
      reply.code(400).send({ error: 'Invalid room name' });
      return;
    }

    // Try to find existing room
    let room = await prisma.room.findFirst({
      where: { name },
    });

    if (!room) {
      room = await prisma.room.create({
        data: {
          id: nanoid(),
          name,
        },
      });
    }

    return { room };
  });

  // Get room messages
  fastify.get('/rooms/:roomId/messages', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { roomId } = request.params as { roomId: string };
    const { limit = '50', before } = request.query as { limit?: string; before?: string };

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
      take: parseInt(limit, 10),
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
  });
}
