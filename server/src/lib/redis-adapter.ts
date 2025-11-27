import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from './logger.js';

let pubClient: ReturnType<typeof createClient> | null = null;
let subClient: ReturnType<typeof createClient> | null = null;

/**
 * Setup Redis adapter for Socket.IO horizontal scaling.
 * Falls back to single-instance mode if Redis is unavailable.
 */
export async function setupRedisAdapter(io: SocketIOServer) {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    logger.warn('⚠️  REDIS_URL not set - running in single-instance mode');
    logger.warn('⚠️  For multi-instance deployments, set REDIS_URL environment variable');
    return;
  }

  try {
    logger.info(`🔌 Connecting to Redis at ${redisUrl.replace(/:[^:]*@/, ':****@')}`);
    
    pubClient = createClient({ url: redisUrl });
    subClient = pubClient.duplicate();

    // Error handlers
    pubClient.on('error', (err: Error) => logger.error('Redis Pub Client Error:', err));
    subClient.on('error', (err: Error) => logger.error('Redis Sub Client Error:', err));

    await Promise.all([
      pubClient.connect(),
      subClient.connect()
    ]);

    io.adapter(createAdapter(pubClient, subClient));
    logger.info('✅ Redis adapter connected - multi-instance mode enabled');
    logger.info('📡 Socket.IO events will sync across all server instances');
  } catch (error) {
    logger.error('❌ Failed to connect Redis adapter:', error);
    logger.warn('⚠️  Falling back to single-instance mode');
    logger.warn('⚠️  Horizontal scaling will NOT work without Redis');
  }
}

export async function closeRedisAdapter() {
  try {
    if (pubClient) await pubClient.quit();
    if (subClient) await subClient.quit();
    logger.info('Redis connections closed');
  } catch (error) {
    logger.error('Error closing Redis connections:', error);
  }
}

// Graceful shutdown
/* istanbul ignore next */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing Redis connections...');
  await closeRedisAdapter();
});

/* istanbul ignore next */
process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing Redis connections...');
  await closeRedisAdapter();
  process.exit(0);
});
