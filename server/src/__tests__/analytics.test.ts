import express from 'express';
import { createServer } from 'http';
import analyticsRoutes from '../routes/analytics.js';

const request = (await import('supertest')).default;

// Set test credentials
const TEST_USERNAME = 'test_admin';
const TEST_PASSWORD = 'test_password_123';

describe('Analytics Routes', () => {
  let app: express.Application;
  let httpServer: ReturnType<typeof createServer>;
  const originalEnv = { ...process.env };

  beforeAll((done) => {
    // Set required environment variables for tests
    process.env.ANALYTICS_USERNAME = TEST_USERNAME;
    process.env.ANALYTICS_PASSWORD = TEST_PASSWORD;
    
    app = express();
    app.use(express.json());
    app.use('/api/analytics', analyticsRoutes);
    httpServer = createServer(app);
    httpServer.listen(0, done);
  });

  afterAll((done) => {
    // Restore original environment
    process.env = originalEnv;
    httpServer.close(done);
  });

  describe('POST /login', () => {
    it('should return token for valid credentials', async () => {
      const response = await request(app)
        .post('/api/analytics/login')
        .send({ username: TEST_USERNAME, password: TEST_PASSWORD });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/analytics/login')
        .send({ username: 'wrong', password: 'wrong' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should return 401 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/analytics/login')
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe('GET / (analytics)', () => {
    let validToken: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/analytics/login')
        .send({ username: TEST_USERNAME, password: TEST_PASSWORD });
      validToken = response.body.token;
    });

    it('should return analytics for authenticated user', async () => {
      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overview');
      expect(response.body).toHaveProperty('breakdown');
      expect(response.body).toHaveProperty('topPlayers');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/analytics');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });

    it('should return 401 with expired token', async () => {
      // Create an expired token (expired 1 hour ago)
      const expiredPayload = JSON.stringify({ 
        username: 'admin', 
        exp: Date.now() - 60 * 60 * 1000 
      });
      const expiredToken = Buffer.from(expiredPayload).toString('base64');

      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should return 401 with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', 'NotBearer token');

      expect(response.status).toBe(401);
    });
  });

  describe('Unconfigured credentials', () => {
    let unconfiguredApp: express.Application;
    let unconfiguredServer: ReturnType<typeof createServer>;

    beforeAll((done) => {
      // Remove credentials to test unconfigured state
      delete process.env.ANALYTICS_USERNAME;
      delete process.env.ANALYTICS_PASSWORD;
      
      unconfiguredApp = express();
      unconfiguredApp.use(express.json());
      unconfiguredApp.use('/api/analytics', analyticsRoutes);
      unconfiguredServer = createServer(unconfiguredApp);
      unconfiguredServer.listen(0, done);
    });

    afterAll((done) => {
      // Restore credentials for any subsequent tests
      process.env.ANALYTICS_USERNAME = TEST_USERNAME;
      process.env.ANALYTICS_PASSWORD = TEST_PASSWORD;
      unconfiguredServer.close(done);
    });

    it('should return 503 when credentials are not configured', async () => {
      const response = await request(unconfiguredApp)
        .post('/api/analytics/login')
        .send({ username: 'any', password: 'any' });

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error', 'Analytics not configured');
    });
  });
});
