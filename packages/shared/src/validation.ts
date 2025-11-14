import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3).max(20),
  age: z.number().int().min(13).max(120),
  sex: z.enum(['F', 'M']),
  country: z.string().min(2).max(100),
});

export const createMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  roomId: z.string().uuid(),
});

export const joinRoomSchema = z.object({
  roomId: z.string().uuid(),
});
