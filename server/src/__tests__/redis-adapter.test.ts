import { jest } from '@jest/globals';

// Mock redis and socket.io-redis-adapter before importing the module
jest.unstable_mockModule('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    quit: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    on: jest.fn(),
    duplicate: jest.fn(() => ({
      connect: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      quit: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      on: jest.fn(),
    })),
  })),
}));

jest.unstable_mockModule('@socket.io/redis-adapter', () => ({
  createAdapter: jest.fn(() => ({})),
}));

// Import after mocking
const { setupRedisAdapter, closeRedisAdapter } = await import('../lib/redis-adapter.js');
const { createClient } = await import('redis');
const { createAdapter } = await import('@socket.io/redis-adapter');

describe('Redis Adapter', () => {
  const originalEnv = process.env;
  let mockIo: { adapter: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockIo = {
      adapter: jest.fn(),
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('setupRedisAdapter', () => {
    it('should skip setup when REDIS_URL is not set', async () => {
      delete process.env.REDIS_URL;

      await setupRedisAdapter(mockIo as unknown as import('socket.io').Server);

      expect(createClient).not.toHaveBeenCalled();
      expect(mockIo.adapter).not.toHaveBeenCalled();
    });

    it('should setup Redis adapter when REDIS_URL is set', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      await setupRedisAdapter(mockIo as unknown as import('socket.io').Server);

      expect(createClient).toHaveBeenCalledWith({ url: 'redis://localhost:6379' });
      expect(createAdapter).toHaveBeenCalled();
      expect(mockIo.adapter).toHaveBeenCalled();
    });

    it('should handle Redis connection errors gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      
      // Mock connection failure
      (createClient as jest.Mock).mockImplementationOnce(() => ({
        connect: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Connection failed')),
        on: jest.fn(),
        duplicate: jest.fn(() => ({
          connect: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Connection failed')),
          on: jest.fn(),
        })),
      }));

      // Should not throw, just log warning
      await expect(setupRedisAdapter(mockIo as unknown as import('socket.io').Server))
        .resolves.not.toThrow();
    });
  });

  describe('closeRedisAdapter', () => {
    it('should close Redis connections gracefully', async () => {
      // Setup first to create connections
      process.env.REDIS_URL = 'redis://localhost:6379';
      await setupRedisAdapter(mockIo as unknown as import('socket.io').Server);

      // Close connections
      await expect(closeRedisAdapter()).resolves.not.toThrow();
    });

    it('should handle close errors gracefully', async () => {
      // Should not throw even if connections are null
      await expect(closeRedisAdapter()).resolves.not.toThrow();
    });
  });
});
