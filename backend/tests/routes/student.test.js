import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { securityMiddlewares, sanitizeBody } from '../../middleware/requestValidator.js';
import generalLimiter from '../../middleware/rateLimiter.js';
import errorHandler from '../../middleware/errorHandler.js';
import studentRoutes from '../../routes/student.js';
import { startDb, stopDb, clearDb, seedTestData } from '../setup.js';
import Attendance from '../../models/Attendance.js';

process.env.JWT_SECRET = 'test_jwt_secret_min_32_chars_long_!!';

const createApp = () => {
  const app = express();
  securityMiddlewares.forEach((mw) => app.use(mw));
  app.use(sanitizeBody);
  app.use(generalLimiter);
  app.use('/api/v1/student', studentRoutes);
  app.use(errorHandler);
  return app;
};

const getToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });

describe('Student Routes', () => {
  let app;
  let studentToken;
  let faculty;
  let student;

  beforeAll(async () => {
    await startDb();
    const data = await seedTestData();
    faculty = data.faculty;
    student = data.student;
    studentToken = getToken(student._id);

    await Attendance.create([
      { student: student._id, subject: 'Data Structures', date: new Date('2026-07-01'), status: 'present', markedBy: faculty._id },
      { student: student._id, subject: 'Data Structures', date: new Date('2026-07-02'), status: 'absent', markedBy: faculty._id },
      { student: student._id, subject: 'Algorithms', date: new Date('2026-07-01'), status: 'present', markedBy: faculty._id },
      { student: student._id, subject: 'Algorithms', date: new Date('2026-07-02'), status: 'present', markedBy: faculty._id },
    ]);

    app = createApp();
  });

  afterAll(async () => { await stopDb(); });

  describe('GET /api/v1/student/my-attendance', () => {
    it('returns paginated attendance', async () => {
      const res = await request(app)
        .get('/api/v1/student/my-attendance')
        .set('Authorization', `Bearer ${studentToken}`)
        .query({ page: 1, limit: 20 });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(4);
    });

    it('filters by subject', async () => {
      const res = await request(app)
        .get('/api/v1/student/my-attendance')
        .set('Authorization', `Bearer ${studentToken}`)
        .query({ subject: 'Data Structures' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/v1/student/stats', () => {
    it('returns correct stats', async () => {
      const res = await request(app)
        .get('/api/v1/student/stats')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subjectWise).toHaveLength(2);
      expect(res.body.data.overall.total).toBe(4);
      expect(res.body.data.overall.present).toBe(3);
    });
  });

  describe('GET /api/v1/student/eligibility', () => {
    it('returns eligibility data', async () => {
      const res = await request(app)
        .get('/api/v1/student/eligibility')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].currentPercentage).toBeDefined();
    });
  });
});
