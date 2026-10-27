import crypto from 'crypto';
import WalkBySession from '../models/WalkBySession.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import { bulkUpsertAttendance } from './attendanceService.js';
import { logAudit } from './auditService.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

/**
 * Generate ephemeral 4-character hex dynamic beacon token for student
 */
export const generateStudentBeaconToken = (sessionToken, studentId) => {
  return crypto
    .createHmac('sha256', sessionToken)
    .update(studentId.toString())
    .digest('hex')
    .slice(0, 4)
    .toUpperCase();
};

export const startWalkBySession = async ({
  facultyId,
  subject,
  date,
  slotNumber = 1,
  timeSlot = '09:45 - 10:35',
  room = 'Room B05',
  branch,
  className,
  section = '',
}) => {
  // Deactivate any existing active walk-by sessions for this faculty
  await WalkBySession.updateMany(
    { faculty: facultyId, isActive: true },
    { isActive: false },
  );

  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 45 * 60 * 1000); // 45 min active window

  const session = await WalkBySession.create({
    sessionToken,
    faculty: facultyId,
    subject,
    date: new Date(date),
    slotNumber: Number(slotNumber) || 1,
    timeSlot: timeSlot || '09:45 - 10:35',
    room: room || 'Room B05',
    branch,
    className,
    section: (section || '').trim(),
    onlineDesks: [],
    hoveredStudents: [],
    expiresAt,
    isActive: true,
  });

  logger.info(
    { sessionToken, facultyId, subject, className, section, room },
    'Walk-by Proximity session created',
  );

  return session;
};

export const getActiveWalkBySession = async (facultyId) => {
  const session = await WalkBySession.findOne({
    faculty: facultyId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  })
    .populate('hoveredStudents.student', 'name email branch className section rollNumber')
    .lean();

  if (!session) return null;

  // Build enrolled students query with normalized section handling (Issue 9)
  const studentQuery = {
    role: 'student',
    isActive: true,
    branch: session.branch,
    className: session.className,
  };
  const sessionSec = (session.section || '').trim();
  if (sessionSec) {
    studentQuery.section = sessionSec;
  } else {
    studentQuery.section = { $in: ['', null] };
  }

  const allStudents = await User.find(studentQuery)
    .select('name email rollNumber branch className section')
    .sort({ name: 1 })
    .lean();

  const now = Date.now();
  const onlineThresholdMs = 35000; // active in last 35s
  const onlineSet = new Set();
  (session.onlineDesks || []).forEach((od) => {
    if (od.student && (now - new Date(od.lastSeen).getTime()) <= onlineThresholdMs) {
      onlineSet.add(od.student.toString());
    }
  });

  const hoveredMap = new Map();
  (session.hoveredStudents || []).forEach((h) => {
    if (h.student?._id) {
      hoveredMap.set(h.student._id.toString(), {
        markedAt: h.markedAt,
        proximityMeters: h.proximityMeters,
      });
    }
  });

  const roster = allStudents.map((s) => {
    const studentIdentifier = (s.rollNumber || s.email?.split('@')[0] || s._id.toString().slice(-6)).trim();
    const beaconToken = generateStudentBeaconToken(session.sessionToken, s._id);
    return {
      _id: s._id,
      name: s.name,
      email: s.email,
      rollNumber: studentIdentifier,
      studentIdentifier,
      beaconToken,
      isOnline: onlineSet.has(s._id.toString()),
      isHovered: hoveredMap.has(s._id.toString()),
      markedAt: hoveredMap.get(s._id.toString())?.markedAt || null,
      proximityMeters: hoveredMap.get(s._id.toString())?.proximityMeters || null,
    };
  });

  return {
    ...session,
    roster,
    totalStudents: allStudents.length,
    onlineCount: onlineSet.size,
    hoveredCount: hoveredMap.size,
  };
};

export const pingDeskHeartbeat = async (studentId) => {
  const student = await User.findById(studentId).lean();
  if (!student) return false;

  const studentSec = (student.section || '').trim();
  const query = {
    isActive: true,
    expiresAt: { $gt: new Date() },
    branch: student.branch,
    className: student.className,
    $or: [
      { section: studentSec },
      { section: { $in: ['', null] } },
    ],
  };

  const session = await WalkBySession.findOne(query).sort({ createdAt: -1 });
  if (!session) return false;

  // Atomic heartbeat update without session.save() to prevent write conflicts (Issue 7)
  const updated = await WalkBySession.updateOne(
    { _id: session._id, 'onlineDesks.student': studentId },
    { $set: { 'onlineDesks.$.lastSeen': new Date() } },
  );

  if (updated.matchedCount === 0) {
    await WalkBySession.updateOne(
      { _id: session._id },
      { $addToSet: { onlineDesks: { student: studentId, lastSeen: new Date() } } },
    );
  }

  return true;
};

export const getActiveSessionForStudent = async (studentId) => {
  const student = await User.findById(studentId).lean();
  if (!student) throw new ApiError('Student not found', 404, 'NOT_FOUND');

  const studentSec = (student.section || '').trim();
  // Check active status, expiration, and normalized section (Issues 8, 9, 10)
  const query = {
    isActive: true,
    expiresAt: { $gt: new Date() },
    branch: student.branch,
    className: student.className,
    $or: [
      { section: studentSec },
      { section: { $in: ['', null] } },
    ],
  };

  const session = await WalkBySession.findOne(query)
    .populate('faculty', 'name email department')
    .sort({ createdAt: -1 }); // Most recent active session (Issue 10)

  if (!session) return { hasActiveSession: false };

  // Atomic heartbeat update without session.save() to prevent write conflicts (Issue 7)
  const updated = await WalkBySession.updateOne(
    { _id: session._id, 'onlineDesks.student': studentId },
    { $set: { 'onlineDesks.$.lastSeen': new Date() } },
  );

  if (updated.matchedCount === 0) {
    await WalkBySession.updateOne(
      { _id: session._id },
      { $addToSet: { onlineDesks: { student: studentId, lastSeen: new Date() } } },
    );
  }

  const isHovered = (session.hoveredStudents || []).some(
    (h) => h.student?.toString() === studentId.toString(),
  );

  // Dynamic anti-spoofing beacon token for student's phone (Issue 5)
  const beaconToken = generateStudentBeaconToken(session.sessionToken, studentId);

  return {
    hasActiveSession: true,
    sessionToken: session.sessionToken,
    subject: session.subject,
    date: session.date,
    slotNumber: session.slotNumber,
    timeSlot: session.timeSlot,
    room: session.room,
    faculty: session.faculty?.name || 'Instructor',
    beaconToken,
    isHovered,
  };
};

export const hoverMarkStudent = async ({
  sessionToken,
  facultyId,
  studentId,
  proximityMeters,
}) => {
  // Proximity measurement is strictly required and cannot be invented (Issue 1 & 6)
  const measuredDist = Number(proximityMeters);
  if (isNaN(measuredDist) || measuredDist <= 0 || measuredDist > 1.5) {
    throw new ApiError(
      `Cannot mark attendance: Proximity must be a valid measured BLE distance <= 1.5m (received: ${proximityMeters})`,
      400,
      'INVALID_PROXIMITY'
    );
  }

  const session = await WalkBySession.findOne({
    sessionToken,
    faculty: facultyId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });
  if (!session) {
    throw new ApiError('Active walk-by session not found or expired', 404, 'SESSION_NOT_FOUND');
  }

  const student = await User.findById(studentId);
  if (!student || !student.isActive) {
    throw new ApiError('Student not found or inactive', 404, 'NOT_FOUND');
  }

  // Check if student is active at desk
  const now = Date.now();
  const isOnline = (session.onlineDesks || []).some(
    (od) =>
      od.student?.toString() === studentId.toString() &&
      (now - new Date(od.lastSeen).getTime()) <= 45000,
  );

  if (!isOnline) {
    throw new ApiError(
      'Cannot mark attendance: Student phone is not detected at desk. Student must have Desk Check-in actively open.',
      400,
      'STUDENT_NOT_AT_DESK'
    );
  }

  // Atomic push if not already in array (prevents duplicate writes under concurrency)
  const updateResult = await WalkBySession.updateOne(
    { _id: session._id, 'hoveredStudents.student': { $ne: studentId } },
    {
      $push: {
        hoveredStudents: {
          student: studentId,
          markedAt: new Date(),
          proximityMeters: measuredDist,
        },
      },
    },
  );

  const newlyAdded = updateResult.modifiedCount > 0;

  if (newlyAdded) {
    // Record attendance as present with source 'walkby'
    const { results, errors } = await bulkUpsertAttendance({
      records: [{ studentId, status: 'present' }],
      date: session.date,
      subject: session.subject,
      slotNumber: session.slotNumber || 1,
      timeSlot: session.timeSlot || '09:45 - 10:35',
      room: session.room || 'Room B05',
      markedBy: facultyId,
      source: 'walkby',
    });

    if (errors.length > 0) {
      throw new ApiError(errors[0].message, 422, 'VALIDATION_ERROR');
    }

    await logAudit({
      action: 'CREATE',
      collectionName: 'Attendance',
      documentId: results[0]._id,
      performedBy: facultyId,
      newValue: {
        source: 'walkby',
        subject: session.subject,
        date: session.date,
        slotNumber: session.slotNumber || 1,
        status: 'present',
        proximityMeters: measuredDist,
      },
    });

    logger.info(
      { sessionToken, studentId, subject: session.subject, proximityMeters: measuredDist, isOnline },
      'Student verified and marked via desk proximity hover',
    );
  }

  return {
    studentId: student._id,
    name: student.name,
    status: 'present',
    proximityMeters: measuredDist,
    markedAt: new Date(),
  };
};

export const endWalkBySession = async (sessionToken, facultyId) => {
  const session = await WalkBySession.findOne({ sessionToken, faculty: facultyId });
  if (!session) {
    throw new ApiError('Session not found', 404, 'NOT_FOUND');
  }

  session.isActive = false;
  await session.save();

  // Mark all enrolled students who were NOT hovered as absent
  // Issue 3: PROTECT existing records ('present', 'late', 'excused') from being overwritten as absent!
  try {
    const studentQuery = {
      role: 'student',
      isActive: true,
      branch: session.branch,
      className: session.className,
    };
    const sessionSec = (session.section || '').trim();
    if (sessionSec) {
      studentQuery.section = sessionSec;
    } else {
      studentQuery.section = { $in: ['', null] };
    }

    const enrolledStudents = await User.find(studentQuery).select('_id').lean();
    const hoveredSet = new Set(session.hoveredStudents.map((h) => h.student.toString()));

    // Query existing attendance for all enrolled students for this date & slot
    const existingAttendance = await Attendance.find({
      student: { $in: enrolledStudents.map((s) => s._id) },
      date: session.date,
      slotNumber: session.slotNumber || 1,
      isActive: true,
    }).lean();

    // Students with an existing 'present', 'late', or approved 'excused' status must NOT be overridden
    const protectedStudentIds = new Set(
      existingAttendance
        .filter((a) => ['present', 'late', 'excused'].includes(a.status))
        .map((a) => a.student.toString())
    );

    const absentRecords = enrolledStudents
      .filter((s) => !hoveredSet.has(s._id.toString()) && !protectedStudentIds.has(s._id.toString()))
      .map((s) => ({ studentId: s._id, status: 'absent' }));

    if (absentRecords.length > 0) {
      await bulkUpsertAttendance({
        records: absentRecords,
        date: session.date,
        subject: session.subject,
        slotNumber: session.slotNumber || 1,
        timeSlot: session.timeSlot || '09:45 - 10:35',
        room: session.room || 'Room B05',
        markedBy: facultyId,
        source: 'walkby',
      });
      logger.info(
        { sessionToken, absentCount: absentRecords.length, protectedCount: protectedStudentIds.size },
        'Marked remaining unverified students absent while preserving prior present/excused records',
      );
    }

    return {
      success: true,
      totalEnrolled: enrolledStudents.length,
      presentCount: hoveredSet.size,
      absentCount: absentRecords.length,
      preservedCount: protectedStudentIds.size,
    };
  } catch (err) {
    logger.error({ sessionToken, error: err.message }, 'Failed to mark absentees for walkby');
    return {
      success: true,
      presentCount: session.hoveredStudents.length,
    };
  }
};
