import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { securityMiddlewares, sanitizeBody } from '../../middleware/requestValidator.js';
import generalLimiter from '../../middleware/rateLimiter.js';
import errorHandler from '../../middleware/errorHandler.js';
import facultyRoutes from '../../routes/faculty.js';
import { startDb, stopDb, clearDb, seedTestData } from '../setup.js';
import Attendance from '../../models/Attendance.js';

process.env.JWT_SECRET = 'test_jwt_secret_min_32_chars_long_!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_min_32_chars_long_!';

const createApp = () => {
  const app = express();
  securityMiddlewares.forEach((mw) => app.use(mw));
  app.use(sanitizeBody);
  app.use(generalLimiter);
  app.use('/api/v1/faculty', facultyRoutes);
  app.use(errorHandler);
  return app;
};

const getToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });

describe('Faculty Routes', () => {
  let app;
  let facultyToken;
  let faculty;
  let student;

  beforeAll(async () => {
    await startDb();
    const data = await seedTestData();
    faculty = data.faculty;
    student = data.student;
    facultyToken = getToken(faculty._id);
    app = createApp();
  });

  afterAll(async () => { await stopDb(); });

  afterEach(async () => { await clearDb(); });

  describe('GET /api/v1/faculty/students', () => {
    it('returns paginated students', async () => {
      const res = await request(app)
        .get('/api/v1/faculty/students')
        .set('Authorization', `Bearer ${facultyToken}`)
        .query({ page: 1, limit: 20 });

      expect(res.status).toBe(200);
      expect(res.body.meta).toBeDefined();
    });
  });

  describe('POST /api/v1/faculty/attendance', () => {
    it('marks attendance for students', async () => {
      const res = await request(app)
        .post('/api/v1/faculty/attendance')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          date: '2026-07-29',
          subject: 'Data Structures',
          records: [{ studentId: student._id.toString(), status: 'present' }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.processed).toBe(1);
    });

    it('rejects invalid records', async () => {
      const res = await request(app)
        .post('/api/v1/faculty/attendance')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          date: '2026-07-29',
          subject: 'Data Structures',
          records: [{ studentId: 'invalid', status: 'present' }],
        });

      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/faculty/defaulters', () => {
    it('returns defaulters list', async () => {
      const res = await request(app)
        .get('/api/v1/faculty/defaulters')
        .set('Authorization', `Bearer ${facultyToken}`)
        .query({ threshold: 75 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
