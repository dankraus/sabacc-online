import request from 'supertest';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';

describe('Server Integration Tests', () => {
  let app: express.Application;
  let server: any;

  beforeAll(() => {
    // Create a test server similar to the main server
    app = express();
    server = createServer(app);
    
    app.use(cors());
    app.use(express.json());

    // Add the health endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('Health Endpoint', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String)
      });

      // Verify timestamp is a valid ISO string
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });

    it('should have correct content type', async () => {
      await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);
    });
  });

  describe('CORS Configuration', () => {
    it('should have CORS headers on health endpoint', async () => {
      await request(app)
        .get('/health')
        .expect('Access-Control-Allow-Origin', '*')
        .expect(200);
    });

    it('should handle OPTIONS preflight requests', async () => {
      await request(app)
        .options('/health')
        .expect(204);
    });
  });

  describe('JSON Parsing', () => {
    beforeAll(() => {
      // Add a test POST endpoint for JSON parsing
      app.post('/test-json', (req, res) => {
        res.json({ received: req.body });
      });
    });

    it('should parse JSON request bodies', async () => {
      const testData = { message: 'test', number: 123 };

      const response = await request(app)
        .post('/test-json')
        .send(testData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.received).toEqual(testData);
    });

    it('should handle empty JSON objects', async () => {
      const response = await request(app)
        .post('/test-json')
        .send({})
        .expect(200);

      expect(response.body.received).toEqual({});
    });

    it('should handle malformed JSON gracefully', async () => {
      await request(app)
        .post('/test-json')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });
  });

  describe('Error Handling', () => {
    beforeAll(() => {
      // Add an endpoint that throws an error
      app.get('/test-error', (req, res) => {
        throw new Error('Test error');
      });

      // Add error handling middleware
      app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        res.status(500).json({ error: 'Internal server error' });
      });
    });

    it('should handle server errors gracefully', async () => {
      const response = await request(app)
        .get('/test-error')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error'
      });
    });
  });

  describe('Non-existent Routes', () => {
    it('should return 404 for non-existent routes', async () => {
      await request(app)
        .get('/non-existent-route')
        .expect(404);
    });

    it('should return 404 for non-existent POST routes', async () => {
      await request(app)
        .post('/non-existent-route')
        .expect(404);
    });
  });

  describe('HTTP Methods', () => {
    it('should only allow GET for health endpoint', async () => {
      await request(app)
        .post('/health')
        .expect(404);

      await request(app)
        .put('/health')
        .expect(404);

      await request(app)
        .delete('/health')
        .expect(404);
    });
  });
});