import { z } from 'zod';

// Security: Strong password validation
// Requires at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password must not exceed 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const checkUsernameSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
});

export const loginSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  age: z.number().int().min(13).max(120),
  sex: z.enum(['F', 'M']),
  country: z.string().min(2).max(100),
  password: passwordSchema.optional(),
});

export const createMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  roomId: z.string().uuid(),
});

export const joinRoomSchema = z.object({
  roomId: z.string().uuid(),
});

export const sendDMSchema = z.object({
  receiverId: z.string().uuid(),
  content: z.string().min(1).max(1000),
});
