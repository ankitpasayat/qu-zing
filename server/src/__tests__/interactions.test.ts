import express from 'express';
import { createServer } from 'http';
import interactionsRoutes from '../routes/interactions.js';

const request = (await import('supertest')).default;

describe('Interactions Routes', () => {
  let app: express.Application;
  let httpServer: ReturnType<typeof createServer>;

  beforeAll((done) => {
    app = express();
    app.use(express.json());
    app.use('/api/interactions', interactionsRoutes);
    httpServer = createServer(app);
    httpServer.listen(0, done);
  });

  afterAll((done) => {
    httpServer.close(done);
  });

  describe('POST / (Discord Interactions)', () => {
    it('should respond with PONG for PING interaction', async () => {
      const response = await request(app)
        .post('/api/interactions')
        .set('x-signature-ed25519', 'valid-signature')
        .set('x-signature-timestamp', Date.now().toString())
        .send({ type: 1, id: 'test-id', application_id: 'test-app' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ type: 1 }); // PONG
    });

    it('should handle /play command', async () => {
      const response = await request(app)
        .post('/api/interactions')
        .set('x-signature-ed25519', 'valid-signature')
        .set('x-signature-timestamp', Date.now().toString())
        .send({
          type: 2, // APPLICATION_COMMAND
          id: 'test-id',
          application_id: 'test-app',
          data: { id: 'cmd-id', name: 'play' },
          token: 'test-token',
          version: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe(4); // CHANNEL_MESSAGE_WITH_SOURCE
      expect(response.body.data.content).toContain('Qu-Zing!');
    });

    it('should handle /help command', async () => {
      const response = await request(app)
        .post('/api/interactions')
        .set('x-signature-ed25519', 'valid-signature')
        .set('x-signature-timestamp', Date.now().toString())
        .send({
          type: 2,
          id: 'test-id',
          application_id: 'test-app',
          data: { id: 'cmd-id', name: 'help' },
          token: 'test-token',
          version: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe(4);
      expect(response.body.data.content).toContain('Help');
    });

    it('should handle /stats command', async () => {
      const response = await request(app)
        .post('/api/interactions')
        .set('x-signature-ed25519', 'valid-signature')
        .set('x-signature-timestamp', Date.now().toString())
        .send({
          type: 2,
          id: 'test-id',
          application_id: 'test-app',
          data: { id: 'cmd-id', name: 'stats' },
          token: 'test-token',
          version: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe(4);
      expect(response.body.data.content).toContain('Stats');
    });

    it('should handle unknown command', async () => {
      const response = await request(app)
        .post('/api/interactions')
        .set('x-signature-ed25519', 'valid-signature')
        .set('x-signature-timestamp', Date.now().toString())
        .send({
          type: 2,
          id: 'test-id',
          application_id: 'test-app',
          data: { id: 'cmd-id', name: 'unknown_command' },
          token: 'test-token',
          version: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe(4);
      expect(response.body.data.content).toContain('Unknown command');
    });

    it('should handle MESSAGE_COMPONENT interaction', async () => {
      const response = await request(app)
        .post('/api/interactions')
        .set('x-signature-ed25519', 'valid-signature')
        .set('x-signature-timestamp', Date.now().toString())
        .send({
          type: 3, // MESSAGE_COMPONENT
          id: 'test-id',
          application_id: 'test-app',
          data: { custom_id: 'button_1', component_type: 2 },
          token: 'test-token',
          version: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe(7); // UPDATE_MESSAGE
    });

    it('should handle MODAL_SUBMIT interaction', async () => {
      const response = await request(app)
        .post('/api/interactions')
        .set('x-signature-ed25519', 'valid-signature')
        .set('x-signature-timestamp', Date.now().toString())
        .send({
          type: 5, // MODAL_SUBMIT
          id: 'test-id',
          application_id: 'test-app',
          data: { custom_id: 'modal_1' },
          token: 'test-token',
          version: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe(4);
      expect(response.body.data.content).toContain('submitted');
    });

    it('should return 400 for unknown interaction type', async () => {
      const response = await request(app)
        .post('/api/interactions')
        .set('x-signature-ed25519', 'valid-signature')
        .set('x-signature-timestamp', Date.now().toString())
        .send({
          type: 999, // Unknown type
          id: 'test-id',
          application_id: 'test-app',
          token: 'test-token',
          version: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Unknown interaction type');
    });

    it('should return 401 for missing signature', async () => {
      const response = await request(app)
        .post('/api/interactions')
        .set('x-signature-timestamp', Date.now().toString())
        .send({ type: 1 });

      expect(response.status).toBe(401);
    });

    it('should return 401 for missing timestamp', async () => {
      const response = await request(app)
        .post('/api/interactions')
        .set('x-signature-ed25519', 'valid-signature')
        .send({ type: 1 });

      expect(response.status).toBe(401);
    });
  });
});
