import { FastifyInstance } from 'fastify';
import { prisma } from '../services/database';
import { loginSchema } from '@webchat/shared';
import { nanoid } from 'nanoid';

export async function authRoutes(fastify: FastifyInstance) {
  // Login/Register (anonymous users)
  fastify.post('/auth/login', async (request, reply) => {
    try {
      const { username } = loginSchema.parse(request.body);

      // Check if user exists, create if not
      let user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            id: nanoid(),
            username,
          },
        });
      }

      // Generate JWT
      const token = fastify.jwt.sign({
        userId: user.id,
        username: user.username,
      });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          createdAt: user.createdAt,
        },
      };
    } catch (error: any) {
      reply.code(400).send({ error: error.message || 'Invalid request' });
    }
  });

  // Verify token
  fastify.get('/auth/verify', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { userId, username } = request.user as any;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      reply.code(404).send({ error: 'User not found' });
      return;
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      },
    };
  });
}
