import { FastifyInstance } from 'fastify';
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../services/database.js';
import { loginSchema, checkUsernameSchema } from '@webchat/shared';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';

export async function authRoutes(fastify: FastifyInstance) {
  // Check username availability
  fastify.post('/auth/check-username', async (request, reply) => {
    try {
      const { username } = checkUsernameSchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: { username },
        select: { password: true },
      });

      if (!user) {
        return { available: true };
      }

      return {
        available: false,
        registered: !!user.password,
      };
    } catch (error: any) {
      console.error('Check username error:', error);
      if (error.name === 'ZodError') {
        reply.code(400).send({ error: 'Invalid username format', details: error.errors });
      } else {
        reply.code(500).send({ error: 'Internal server error' });
      }
    }
  });

  // Login/Register
  fastify.post('/auth/login', async (request, reply) => {
    try {
      const { username, age, sex, country, password } = loginSchema.parse(request.body);

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      let user;

      if (existingUser) {
        // User exists
        if (existingUser.password) {
          // Registered user - password required
          if (!password) {
            reply.code(401).send({ error: 'Password required for this username' });
            return;
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(password, existingUser.password);
          if (!isValidPassword) {
            reply.code(401).send({ error: 'Invalid password' });
            return;
          }

          user = existingUser;
        } else {
          // Anonymous user - username taken
          reply.code(409).send({ error: 'Username is already taken by an anonymous user' });
          return;
        }
      } else {
        // New user - create account
        let hashedPassword = null;
        if (password) {
          hashedPassword = await bcrypt.hash(password, 10);
        }

        user = await prisma.user.create({
          data: {
            id: nanoid(),
            username,
            password: hashedPassword,
            age,
            sex,
            country,
          },
        });
      }

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
