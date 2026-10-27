import crypto from 'crypto';
import QrSession from '../models/QrSession.js';
import User from '../models/User.js';
import { bulkUpsertAttendance } from './attendanceService.js';
import { logAudit } from './auditService.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';
import calculateDistanceMeters from '../utils/haversine.js';

const QR_SESSION_TTL_MINUTES = Number(process.env.QR_SESSION_TTL_MINUTES) || 10;

export const createQrSession = async ({
  facultyId,
  subject,
  date,
  slotNumber = 1,
  timeSlot = '09:45 - 10:35',
  room = 'B05',
  lat = null,
  lng = null,
  radius = 50,
  branch,
  className,
  section,
}) => {
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + QR_SESSION_TTL_MINUTES * 60 * 1000);

  const hasLocation = lat !== null && lng !== null && !isNaN(Number(lat)) && !isNaN(Number(lng));

  const session = await QrSession.create({
    sessionToken,
    faculty: facultyId,
    subject,
    date: new Date(date),
    slotNumber: Number(slotNumber) || 1,
    timeSlot: timeSlot || '09:45 - 10:35',
    room: room || 'B05',
    location: hasLocation
      ? {
          lat: Number(lat),
          lng: Number(lng),
          radius: Number(radius) || 50,
        }
      : undefined,
    geoFencingEnabled: hasLocation,
    expiresAt,
    branch,
    className,
    section: section || '',
    scannedStudents: [],
    isActive: true,
  });

  logger.info(
    { sessionToken, facultyId, subject, date, slotNumber, geoFencingEnabled: hasLocation },
    'QR session created',
  );

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

export const scanAndMarkAttendance = async (
  sessionToken,
  studentId,
  ipAddress,
  userAgent,
  studentLocation = {},
) => {
  const session = await QrSession.findOne({ sessionToken, isActive: true });
  if (!session) {
    throw new ApiError('Invalid or expired QR code session', 400, 'INVALID_QR');
  }

  if (session.expiresAt.getTime() < Date.now()) {
    session.isActive = false;
    await session.save();
    throw new ApiError('QR code session has expired', 400, 'QR_EXPIRED');
  }

  const student = await User.findById(studentId);
  if (!student || !student.isActive) {
    throw new ApiError('Student not found or inactive', 404, 'NOT_FOUND');
  }

  if (student.role !== 'student') {
    throw new ApiError('Only students can scan attendance', 403, 'FORBIDDEN');
  }

  const normalize = (str) => (str || '').toString().trim().toLowerCase();

  const branchMatch = !session.branch || normalize(student.branch) === normalize(session.branch);
  const classMatch = !session.className || normalize(student.className) === normalize(session.className);
  const sectionMatch = !session.section || normalize(student.section) === normalize(session.section);

  if (!branchMatch || !classMatch || !sectionMatch) {
    const studentClass = `${student.branch || ''} ${student.className || ''} ${student.section ? `(${student.section})` : ''}`.trim();
    const targetClass = `${session.branch || ''} ${session.className || ''} ${session.section ? `(${session.section})` : ''}`.trim();
    throw new ApiError(
      `Class mismatch: This QR session is for [${targetClass}], but your registered class is [${studentClass}].`,
      403,
      'FORBIDDEN',
    );
  }

  // Geo-fencing verification check
  let measuredDistance = null;
  if (session.geoFencingEnabled && session.location?.lat != null && session.location?.lng != null) {
    const sLat = studentLocation?.lat;
    const sLng = studentLocation?.lng;

    if (sLat == null || sLng == null || isNaN(Number(sLat)) || isNaN(Number(sLng))) {
      throw new ApiError(
        'Classroom location verification is required. Please enable GPS/Location permissions on your device.',
        403,
        'LOCATION_REQUIRED',
      );
    }

    measuredDistance = calculateDistanceMeters(
      session.location.lat,
      session.location.lng,
      Number(sLat),
      Number(sLng),
    );

    const allowedRadius = session.location.radius || 50;
    const gpsTolerance = 15; // 15m indoor GPS drift tolerance

    if (measuredDistance > allowedRadius + gpsTolerance) {
      throw new ApiError(
        `Geo-fence violation: You are ${measuredDistance}m away from the classroom (Allowed: ${allowedRadius}m). Attendance must be scanned from inside the classroom.`,
        403,
        'GEOFENCE_VIOLATION',
      );
    }
  }

  const alreadyScanned = session.scannedStudents.some(
    (s) => s.student.toString() === studentId.toString(),
  );

  if (alreadyScanned) {
    return {
      session: {
        sessionToken: session.sessionToken,
        subject: session.subject,
        date: session.date,
        slotNumber: session.slotNumber,
      },
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
      },
      alreadyScanned: true,
      distance: measuredDistance,
      message: 'Attendance already recorded for this session',
    };
  }

  const { results, errors } = await bulkUpsertAttendance({
    records: [{ studentId, status: 'present' }],
    date: session.date,
    subject: session.subject,
    slotNumber: session.slotNumber || 1,
    timeSlot: session.timeSlot || '09:45 - 10:35',
    room: session.room || 'B05',
    markedBy: session.faculty,
    source: 'qr',
    qrSession: session._id,
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
      slotNumber: session.slotNumber || 1,
      status: 'present',
      distance: measuredDistance,
    },
    ipAddress,
    userAgent,
  });

  logger.info(
    { sessionToken, studentId, subject: session.subject, slotNumber: session.slotNumber, measuredDistance },
    'QR attendance marked',
  );

  return {
    session: {
      sessionToken: session.sessionToken,
      subject: session.subject,
      date: session.date,
      slotNumber: session.slotNumber,
      geoFencingEnabled: session.geoFencingEnabled,
    },
    student: {
      id: student._id,
      name: student.name,
      email: student.email,
    },
    distance: measuredDistance,
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

  // Deactivate session
  session.isActive = false;
  await session.save();

  // Automatically mark all remaining enrolled students in this class/section as absent
  try {
    const studentQuery = {
      role: 'student',
      isActive: true,
      branch: session.branch,
      className: session.className,
    };
    if (session.section) {
      studentQuery.section = session.section;
    }

    const enrolledStudents = await User.find(studentQuery).select('_id').lean();
    const scannedSet = new Set(session.scannedStudents.map((s) => s.student.toString()));

    const absentRecords = enrolledStudents
      .filter((s) => !scannedSet.has(s._id.toString()))
      .map((s) => ({ studentId: s._id, status: 'absent' }));

    if (absentRecords.length > 0) {
      await bulkUpsertAttendance({
        records: absentRecords,
        date: session.date,
        subject: session.subject,
        slotNumber: session.slotNumber || 1,
        timeSlot: session.timeSlot || '09:45 - 10:35',
        room: session.room || 'B05',
        markedBy: session.faculty,
        source: 'qr',
        qrSession: session._id,
      });
      logger.info(
        { sessionToken, absentCount: absentRecords.length },
        'Marked remaining non-scanned students as absent upon session close',
      );
    }
  } catch (err) {
    logger.error({ sessionToken, error: err.message }, 'Failed to mark non-scanned students as absent');
  }

  logger.info({ sessionToken, facultyId }, 'QR session deactivated and attendance finalized');

  return session;
};