import { FastifyInstance } from 'fastify';
import { prisma } from '../services/database.js';
import { nanoid } from 'nanoid';

export async function dmRoutes(fastify: FastifyInstance) {
  // Get DM conversations
  fastify.get('/dms', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { userId } = request.user as any;

      const messages = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              age: true,
              sex: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              age: true,
              sex: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });

      return { messages };
    } catch (error) {
      console.error('Get DMs error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get DM conversation with a specific user
  fastify.get('/dms/:userId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { userId } = request.user as any;
      const { userId: otherUserId } = request.params as { userId: string };

      const messages = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              age: true,
              sex: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              age: true,
              sex: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 50,
      });

      // Mark messages as read
      await prisma.directMessage.updateMany({
        where: {
          senderId: otherUserId,
          receiverId: userId,
          read: false,
        },
        data: {
          read: true,
        },
      });

      return { messages };
    } catch (error) {
      console.error('Get DM conversation error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Block a user
  fastify.post('/users/:userId/block', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { userId } = request.user as any;
      const { userId: blockedUserId } = request.params as { userId: string };

      if (userId === blockedUserId) {
        reply.code(400).send({ error: 'Cannot block yourself' });
        return;
      }

      // Check if already blocked
      const existing = await prisma.blockedUser.findFirst({
        where: {
          blockerId: userId,
          blockedId: blockedUserId,
        },
      });

      if (existing) {
        return { success: true };
      }

      await prisma.blockedUser.create({
        data: {
          id: nanoid(),
          blockerId: userId,
          blockedId: blockedUserId,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Block user error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Unblock a user
  fastify.delete('/users/:userId/block', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { userId } = request.user as any;
      const { userId: blockedUserId } = request.params as { userId: string };

      await prisma.blockedUser.deleteMany({
        where: {
          blockerId: userId,
          blockedId: blockedUserId,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Unblock user error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get blocked users
  fastify.get('/blocked-users', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { userId } = request.user as any;

      const blockedUsers = await prisma.blockedUser.findMany({
        where: {
          blockerId: userId,
        },
        include: {
          blocked: {
            select: {
              id: true,
              username: true,
              age: true,
              sex: true,
            },
          },
        },
      });

      return { blockedUsers: blockedUsers.map(b => b.blocked) };
    } catch (error) {
      console.error('Get blocked users error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
