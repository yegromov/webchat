import Redis from 'ioredis';
import { config } from '../config/index.js';

export const redis = new Redis(config.redisUrl);
export const redisSub = new Redis(config.redisUrl);

// Channel names for pub/sub
export const CHANNELS = {
  ROOM_MESSAGE: 'room:message',
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
};
