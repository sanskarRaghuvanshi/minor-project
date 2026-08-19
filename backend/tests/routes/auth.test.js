import request from 'supertest';
import express from 'express';
import { securityMiddlewares, sanitizeBody } from '../../middleware/requestValidator.js';
import generalLimiter from '../../middleware/rateLimiter.js';
import errorHandler from '../../middleware/errorHandler.js';
import authRoutes from '../../routes/auth.js';
import { startDb, stopDb, clearDb, seedTestData } from '../setup.js';

const createApp = () => {
  const app = express();
  securityMiddlewares.forEach((mw) => app.use(mw));
  app.use(sanitizeBody);
  app.use(generalLimiter);
  app.use('/api/v1/auth', authRoutes);
  app.use(errorHandler);
  return app;
};

process.env.JWT_SECRET = 'test_jwt_secret_min_32_chars_long_!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_min_32_chars_long_!';

describe('Auth Routes', () => {
  let app;

  beforeAll(async () => {
    await startDb();
    await seedTestData();
    app = createApp();
  });

  afterAll(async () => { await stopDb(); });

  describe('POST /api/v1/auth/register', () => {
    it('registers a new student', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'New Student',
          email: 'newstudent@test.com',
          password: 'student123',
          role: 'student',
          branch: 'Computer Science Engineering',
          className: 'First Year',
          section: 'CS1',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.token).toBeDefined();
    });

    it('registers a new coordinator', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'New Coordinator',
          email: 'newcoordinator@test.com',
          password: 'coordinator123',
          role: 'coordinator',
          branch: 'Computer Science Engineering',
          className: 'First Year',
          section: 'CS1',
          subjects: ['Data Structures'],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('coordinator');
      expect(res.body.data.user.section).toBe('CS1');
      expect(res.body.data.token).toBeDefined();
    });

    it('rejects registration without a section', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'No Section',
          email: 'nosection@test.com',
          password: 'student123',
          role: 'student',
          branch: 'Computer Science Engineering',
          className: 'First Year',
        });

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects duplicate email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Duplicate',
          email: 'student@test.com',
          password: 'student123',
          role: 'student',
          branch: 'Computer Science Engineering',
          className: 'First Year',
        });

      expect(res.status).toBe(409);
    });

    it('rejects invalid input', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: '' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'student@test.com', password: 'student123' });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });

    it('rejects invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'student@test.com', password: 'wrong' });

      expect(res.status).toBe(401);
    });

    it('logs in a coordinator', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'coordinator@test.com', password: 'coordinator123' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('coordinator');
      expect(res.body.data.token).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('refreshes tokens', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'student@test.com', password: 'student123' });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginRes.body.data.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });
  });
});
