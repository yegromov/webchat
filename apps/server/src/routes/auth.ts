import { FastifyInstance } from 'fastify';
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../services/database.js';
import { loginSchema, checkUsernameSchema } from '@webchat/shared';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';

export async function authRoutes(fastify: FastifyInstance) {
  // Security: Stricter rate limiting for auth endpoints to prevent brute force attacks
  const authRateLimitConfig = {
    config: {
      rateLimit: {
        max: 10, // Maximum 10 requests
        timeWindow: '1 minute', // Per minute
      },
    },
  };

  // Check username availability
  fastify.post('/auth/check-username', authRateLimitConfig, async (request, reply) => {
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
      // Security: Log validation errors (but not sensitive details)
      fastify.log.warn({ type: 'validation_error', endpoint: '/auth/check-username' }, 'Username check validation failed');
      if (error.name === 'ZodError') {
        reply.code(400).send({ error: 'Invalid username format', details: error.errors });
      } else {
        reply.code(500).send({ error: 'Internal server error' });
      }
    }
  });

  // Login/Register - Security: Strict rate limiting for login attempts
  fastify.post('/auth/login', {
    config: {
      rateLimit: {
        max: 5, // Maximum 5 login attempts
        timeWindow: '5 minutes', // Per 5 minutes
      },
    },
  }, async (request, reply) => {
    const clientIp = request.ip;
    const startTime = Date.now();

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
            // Security: Log failed login attempts for monitoring
            fastify.log.warn({
              type: 'failed_login',
              username,
              ip: clientIp,
              reason: 'invalid_password',
            }, 'Failed login attempt');
            reply.code(401).send({ error: 'Invalid password' });
            return;
          }

          user = existingUser;
          // Security: Log successful authentication
          fastify.log.info({
            type: 'successful_login',
            username,
            ip: clientIp,
          }, 'User logged in successfully');
        } else {
          // Anonymous user - username taken
          reply.code(409).send({ error: 'Username is already taken by an anonymous user' });
          return;
        }
      } else {
        // New user - create account
        let hashedPassword = null;
        if (password) {
          // Security: Use bcrypt with cost factor 12 for stronger hashing
          hashedPassword = await bcrypt.hash(password, 12);
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

        // Security: Log user registration for monitoring
        fastify.log.info({
          type: 'user_registered',
          username,
          ip: clientIp,
          hasPassword: !!password,
        }, 'New user registered');
      }

      // Security: Generate JWT with 8-hour expiration (reduced from 24h)
      const token = fastify.jwt.sign({
        userId: user.id,
        username: user.username,
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
      const duration = Date.now() - startTime;
      // Security: Log authentication errors for monitoring
      fastify.log.error({
        type: 'auth_error',
        ip: clientIp,
        duration,
        errorType: error.name,
      }, 'Authentication error occurred');

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
