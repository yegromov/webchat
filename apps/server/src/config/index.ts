import { config as dotenvConfig } from 'dotenv';
import { randomBytes } from 'crypto';

dotenvConfig();

// Security: Validate JWT secret strength in production
const validateJwtSecret = (secret: string, env: string): string => {
  const isProduction = env === 'production';
  const isDefaultSecret = secret === 'your-secret-key-change-in-production';

  if (isProduction && isDefaultSecret) {
    throw new Error(
      'SECURITY ERROR: Default JWT secret detected in production! ' +
      'Set a strong JWT_SECRET environment variable. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }

  if (isProduction && secret.length < 32) {
    throw new Error(
      'SECURITY ERROR: JWT secret is too short! ' +
      'In production, JWT_SECRET must be at least 32 characters long.'
    );
  }

  // In development, generate a random secret if default is used
  if (!isProduction && isDefaultSecret) {
    console.warn('WARNING: Using auto-generated JWT secret for development. Set JWT_SECRET in .env for persistence.');
    return randomBytes(32).toString('hex');
  }

  return secret;
};

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv,
  jwtSecret: validateJwtSecret(jwtSecret, nodeEnv),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/webchat',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
