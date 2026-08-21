import crypto from 'crypto';
import QrSession from '../models/QrSession.js';
import User from '../models/User.js';
import { bulkUpsertAttendance } from './attendanceService.js';
import { logAudit } from './auditService.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

export const createQrSession = async ({
  facultyId,
  subject,
  date,
  branch,
  className,
  section,
}) => {
  const sessionToken = crypto.randomUUID();

  const session = await QrSession.create({
    sessionToken,
    faculty: facultyId,
    subject,
    date: new Date(date),
    branch,
    className,
    section: section || '',
    scannedStudents: [],
    isActive: true,
  });

  logger.info({ sessionToken, facultyId, subject, date }, 'QR session created');

  return session;
};

export const getQrSessionByToken = async (sessionToken) => {
  const session = await QrSession.findOne({ sessionToken }).lean();
  return session;
};

export const getActiveSessionsByFaculty = async (facultyId) => {
  const sessions = await QrSession.find({ faculty: facultyId, isActive: true })
    .sort({ createdAt: -1 })
    .lean();
  return sessions;
};

export const scanAndMarkAttendance = async (sessionToken, studentId, ipAddress, userAgent) => {
  const session = await QrSession.findOne({ sessionToken, isActive: true });
  if (!session) {
    throw new ApiError('Invalid or expired QR code', 400, 'INVALID_QR');
  }

  const student = await User.findById(studentId);
  if (!student || !student.isActive) {
    throw new ApiError('Student not found or inactive', 404, 'NOT_FOUND');
  }

  if (student.role !== 'student') {
    throw new ApiError('Only students can scan attendance', 403, 'FORBIDDEN');
  }

  if (
    student.branch !== session.branch ||
    student.className !== session.className ||
    (session.section && student.section !== session.section)
  ) {
    throw new ApiError('Student does not belong to this class', 403, 'FORBIDDEN');
  }

  const alreadyScanned = session.scannedStudents.some(
    (s) => s.student.toString() === studentId.toString(),
  );
  if (alreadyScanned) {
    throw new ApiError('Attendance already marked for this session', 409, 'ALREADY_SCANNED');
  }

  const { results, errors } = await bulkUpsertAttendance({
    records: [{ studentId, status: 'present' }],
    date: session.date,
    subject: session.subject,
    markedBy: session.faculty,
    ipAddress,
    userAgent,
  });

  if (errors.length > 0) {
    throw new ApiError(errors[0].message, 422, 'VALIDATION_ERROR');
  }

  session.scannedStudents.push({
    student: studentId,
    scannedAt: new Date(),
  });
  await session.save();

  await logAudit({
    action: 'CREATE',
    collectionName: 'Attendance',
    documentId: results[0]._id,
    performedBy: studentId,
    newValue: {
      source: 'qr',
      qrSession: session._id,
      subject: session.subject,
      date: session.date,
      status: 'present',
    },
    ipAddress,
    userAgent,
  });

  logger.info({ sessionToken, studentId, subject: session.subject }, 'QR attendance marked');

  return {
    session: {
      sessionToken: session.sessionToken,
      subject: session.subject,
      date: session.date,
    },
    student: {
      id: student._id,
      name: student.name,
      email: student.email,
    },
    scannedAt: session.scannedStudents[session.scannedStudents.length - 1].scannedAt,
  };
};

export const getSessionWithScans = async (sessionToken) => {
  const session = await QrSession.findOne({ sessionToken })
    .populate('scannedStudents.student', 'name email')
    .lean();

  if (!session) {
    return null;
  }

  return session;
};

export const deactivateSession = async (sessionToken, facultyId) => {
  const session = await QrSession.findOne({ sessionToken, faculty: facultyId });
  if (!session) {
    throw new ApiError('Session not found', 404, 'NOT_FOUND');
  }

  session.isActive = false;
  await session.save();

  logger.info({ sessionToken, facultyId }, 'QR session deactivated');

  return session;
};