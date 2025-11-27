import express from 'express';
import { createServer } from 'http';
import { jest } from '@jest/globals';
import verifyRoutes from '../routes/verify.js';

const request = (await import('supertest')).default;

describe('Verify Routes', () => {
  let app: express.Application;
  let httpServer: ReturnType<typeof createServer>;

  beforeAll((done) => {
    app = express();
    app.use(express.json());
    app.use('/api/verify', verifyRoutes);
    httpServer = createServer(app);
    httpServer.listen(0, done);
  });

  afterAll((done) => {
    httpServer.close(done);
  });

  describe('GET / (verification landing page)', () => {
    it('should return verification landing page when no code is present', async () => {
      const response = await request(app)
        .get('/api/verify');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Qu-Zing! Verification');
      expect(response.text).toContain('Verify with Discord');
    });

    it('should show error page for invalid OAuth code', async () => {
      const response = await request(app)
        .get('/api/verify?code=invalid-code&state=test-state');

      expect(response.status).toBe(500);
      expect(response.text).toContain('Verification Failed');
    });

    it('should complete OAuth flow and show success page', async () => {
      const originalFetch = global.fetch;
      
      // Mock Discord API responses for successful OAuth flow
      global.fetch = jest.fn<typeof fetch>()
        .mockImplementation(async (url) => {
          const urlStr = url.toString();
          
          if (urlStr.includes('oauth2/token')) {
            // Token exchange success
            return {
              ok: true,
              json: async () => ({
                access_token: 'test-access-token',
                token_type: 'Bearer',
                scope: 'identify role_connections.write',
              }),
            } as Response;
          }
          
          if (urlStr.includes('users/@me') && !urlStr.includes('role-connection')) {
            // Get user info success
            return {
              ok: true,
              json: async () => ({
                id: '123456789',
                username: 'TestUser',
                discriminator: '0',
                avatar: null,
              }),
            } as Response;
          }
          
          if (urlStr.includes('role-connection')) {
            // Update role connection success
            return { ok: true, json: async () => ({}) } as Response;
          }
          
          return { ok: false } as Response;
        });

      const response = await request(app)
        .get('/api/verify?code=valid-code&state=test-state');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Verification Complete');
      expect(response.text).toContain('TestUser');

      global.fetch = originalFetch;
    });

    it('should show error page when user info fetch fails', async () => {
      const originalFetch = global.fetch;
      
      global.fetch = jest.fn<typeof fetch>()
        .mockImplementation(async (url) => {
          const urlStr = url.toString();
          
          if (urlStr.includes('oauth2/token')) {
            return {
              ok: true,
              json: async () => ({
                access_token: 'test-access-token',
                token_type: 'Bearer',
              }),
            } as Response;
          }
          
          if (urlStr.includes('users/@me')) {
            // User info fetch fails
            return { ok: false } as Response;
          }
          
          return { ok: false } as Response;
        });

      const response = await request(app)
        .get('/api/verify?code=valid-code&state=test-state');

      expect(response.status).toBe(500);
      expect(response.text).toContain('Verification Failed');

      global.fetch = originalFetch;
    });
  });

  describe('GET /start (OAuth flow)', () => {
    it('should redirect to Discord OAuth', async () => {
      const response = await request(app)
        .get('/api/verify/start');

      expect(response.status).toBe(302); // Redirect
      expect(response.headers.location).toContain('discord.com/oauth2/authorize');
      expect(response.headers.location).toContain('client_id=test-client-id');
      expect(response.headers.location).toContain('scope=identify');
    });
  });

  describe('POST /register-metadata', () => {
    it('should register linked role metadata with bot token', async () => {
      // Mock the fetch to return success
      const originalFetch = global.fetch;
      global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        json: async () => ([
          { key: 'verified', name: 'Verified Player' }
        ]),
      } as Response);

      const response = await request(app)
        .post('/api/verify/register-metadata');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      global.fetch = originalFetch;
    });

    it('should return 400 when bot token is not configured', async () => {
      // Temporarily remove bot token
      const originalToken = process.env.DISCORD_BOT_TOKEN;
      delete process.env.DISCORD_BOT_TOKEN;

      const response = await request(app)
        .post('/api/verify/register-metadata');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'DISCORD_BOT_TOKEN not configured');

      // Restore token
      process.env.DISCORD_BOT_TOKEN = originalToken;
    });

    it('should return 500 when Discord API fails', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
        ok: false,
        text: async () => 'Discord API Error',
      } as Response);

      const response = await request(app)
        .post('/api/verify/register-metadata');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to register metadata');

      global.fetch = originalFetch;
    });
  });
});
