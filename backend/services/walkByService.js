import crypto from 'crypto';
import WalkBySession from '../models/WalkBySession.js';
import User from '../models/User.js';
import { bulkUpsertAttendance } from './attendanceService.js';
import { logAudit } from './auditService.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

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
    section: section || '',
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
  const session = await WalkBySession.findOne({ faculty: facultyId, isActive: true })
    .populate('hoveredStudents.student', 'name email branch className section rollNumber')
    .lean();

  if (!session) return null;

  // Fetch all enrolled students in this class/section
  const studentQuery = {
    role: 'student',
    isActive: true,
    branch: session.branch,
    className: session.className,
  };
  if (session.section) {
    studentQuery.section = session.section;
  }

  const allStudents = await User.find(studentQuery)
    .select('name email rollNumber branch className section')
    .sort({ name: 1 })
    .lean();

  const now = Date.now();
  const onlineThresholdMs = 25000; // active in last 25s
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
    const studentIdentifier = s.rollNumber || s.email?.split('@')[0] || s._id.toString().slice(-6);
    return {
      _id: s._id,
      name: s.name,
      email: s.email,
      rollNumber: studentIdentifier,
      studentIdentifier,
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

  const query = {
    isActive: true,
    branch: student.branch,
    className: student.className,
  };
  if (student.section) {
    query.section = student.section;
  }

  const session = await WalkBySession.findOne(query);
  if (!session) return false;

  const existingIdx = (session.onlineDesks || []).findIndex(
    (od) => od.student?.toString() === studentId.toString(),
  );

  if (existingIdx >= 0) {
    session.onlineDesks[existingIdx].lastSeen = new Date();
  } else {
    session.onlineDesks.push({
      student: studentId,
      lastSeen: new Date(),
    });
  }

  await session.save();
  return true;
};

export const getActiveSessionForStudent = async (studentId) => {
  const student = await User.findById(studentId).lean();
  if (!student) throw new ApiError('Student not found', 404, 'NOT_FOUND');

  const query = {
    isActive: true,
    branch: student.branch,
    className: student.className,
  };
  if (student.section) {
    query.section = student.section;
  }

  const session = await WalkBySession.findOne(query)
    .populate('faculty', 'name email department')
    .sort({ createdAt: -1 });

  if (!session) return { hasActiveSession: false };

  // Update heartbeat automatically on status poll
  const existingIdx = (session.onlineDesks || []).findIndex(
    (od) => od.student?.toString() === studentId.toString(),
  );
  if (existingIdx >= 0) {
    session.onlineDesks[existingIdx].lastSeen = new Date();
  } else {
    session.onlineDesks.push({
      student: studentId,
      lastSeen: new Date(),
    });
  }
  await session.save();

  const isHovered = (session.hoveredStudents || []).some(
    (h) => h.student?.toString() === studentId.toString(),
  );

  return {
    hasActiveSession: true,
    sessionToken: session.sessionToken,
    subject: session.subject,
    date: session.date,
    slotNumber: session.slotNumber,
    timeSlot: session.timeSlot,
    room: session.room,
    faculty: session.faculty?.name || 'Instructor',
    isHovered,
  };
};

export const hoverMarkStudent = async ({
  sessionToken,
  facultyId,
  studentId,
  proximityMeters = 0.3,
}) => {
  const session = await WalkBySession.findOne({ sessionToken, faculty: facultyId, isActive: true });
  if (!session) {
    throw new ApiError('Active walk-by session not found or expired', 404, 'SESSION_NOT_FOUND');
  }

  const student = await User.findById(studentId);
  if (!student || !student.isActive) {
    throw new ApiError('Student not found or inactive', 404, 'NOT_FOUND');
  }

  // Check if student is active at desk or within valid BLE range
  const now = Date.now();
  const isOnline = (session.onlineDesks || []).some(
    (od) =>
      od.student?.toString() === studentId.toString() &&
      (now - new Date(od.lastSeen).getTime()) <= 35000,
  );

  if (!isOnline) {
    throw new ApiError(
      'Cannot mark attendance: Student phone is not detected at desk. Student must be logged in on Desk Check-in.',
      400,
      'STUDENT_NOT_AT_DESK'
    );
  }

  // Enforce desk hover proximity (strictly within physical classroom desk range <= 2.0m)
  if (Number(proximityMeters) > 2.0) {
    throw new ApiError(
      `Cannot mark attendance: Measured proximity (${proximityMeters}m) exceeds 2.0m desk hover threshold.`,
      400,
      'PROXIMITY_EXCEEDED'
    );
  }

  // Check if student already hovered in this session
  const alreadyHovered = session.hoveredStudents.some(
    (h) => h.student.toString() === studentId.toString(),
  );

  if (!alreadyHovered) {
    session.hoveredStudents.push({
      student: studentId,
      markedAt: new Date(),
      proximityMeters: Number(proximityMeters) || 0.3,
    });
    await session.save();

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
        proximityMeters,
      },
    });

    logger.info(
      { sessionToken, studentId, subject: session.subject, proximityMeters, isOnline },
      'Student auto-marked via desk hover',
    );
  }

  return {
    studentId: student._id,
    name: student.name,
    status: 'present',
    proximityMeters: Number(proximityMeters) || 0.3,
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
    const hoveredSet = new Set(session.hoveredStudents.map((h) => h.student.toString()));

    const absentRecords = enrolledStudents
      .filter((s) => !hoveredSet.has(s._id.toString()))
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
        { sessionToken, absentCount: absentRecords.length },
        'Marked remaining students absent upon walk-by session completion',
      );
    }

    return {
      success: true,
      totalEnrolled: enrolledStudents.length,
      presentCount: hoveredSet.size,
      absentCount: absentRecords.length,
    };
  } catch (err) {
    logger.error({ sessionToken, error: err.message }, 'Failed to mark absentees for walkby');
    return {
      success: true,
      presentCount: session.hoveredStudents.length,
    };
  }
};
