import { FastifyInstance } from 'fastify';
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../services/database.js';
import { loginSchema } from '@webchat/shared';
import { nanoid } from 'nanoid';

export async function authRoutes(fastify: FastifyInstance) {
  // Login/Register (anonymous users)
  fastify.post('/auth/login', async (request, reply) => {
    try {
      const { username, age, sex, country } = loginSchema.parse(request.body);

      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { username },
      });

      if (user) {
        // Username already exists
        reply.code(409).send({ error: 'Username already exists' });
        return;
      }

      // Create new user
      user = await prisma.user.create({
        data: {
          id: nanoid(),
          username,
          age,
          sex,
          country,
        },
      });

      // Generate JWT with 24-hour expiration
      const token = fastify.jwt.sign({
        userId: user.id,
        username: user.username,
      }, {
        expiresIn: '24h',
      });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          age: user.age,
          sex: user.sex,
          country: user.country,
          createdAt: user.createdAt,
        },
      };
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.name === 'ZodError') {
        reply.code(400).send({ error: 'Invalid input format', details: error.errors });
      } else {
        reply.code(500).send({ error: 'Internal server error' });
      }
    }
  });

  // Verify token
  fastify.get('/auth/verify', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
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
          age: user.age,
          sex: user.sex,
          country: user.country,
          createdAt: user.createdAt,
        },
      };
    } catch (error) {
      console.error('Token verification error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
