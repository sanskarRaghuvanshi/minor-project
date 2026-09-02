import Attendance from '../models/Attendance.js';
import { logAudit } from './auditService.js';
import logger from '../config/logger.js';

const idempotencyCache = new Map();

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;

// Attendance is keyed one-per-student/subject/day (see the unique index on the
// Attendance model), but callers pass in Date values that may carry a time
// component (e.g. a QR session's createdAt-derived date, or a client's
// `new Date().toISOString()`). Normalizing to midnight here — the single write
// path all callers go through — keeps that uniqueness guarantee real instead
// of letting same-day records slip past it with mismatched timestamps.
const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const checkIdempotency = (key) => {
  if (!key) return null;
  const cached = idempotencyCache.get(key);
  if (cached && Date.now() - cached.timestamp < IDEMPOTENCY_TTL) {
    return cached.response;
  }
  if (cached) {
    idempotencyCache.delete(key);
  }
  return null;
};

export const setIdempotencyCache = (key, response) => {
  if (!key) return;
  idempotencyCache.set(key, { response, timestamp: Date.now() });
};

export const bulkUpsertAttendance = async ({ records, date, subject, markedBy, ipAddress, userAgent }) => {
  const results = [];
  const errors = [];
  const normalizedDate = normalizeDate(date);

  for (let i = 0; i < records.length; i += 1) {
    const { studentId, status } = records[i];

    if (!studentId || !['present', 'absent', 'excused'].includes(status)) {
      errors.push({ index: i, studentId, message: `Invalid record at index ${i}` });
      continue;
    }

    try {
      const existing = await Attendance.findOne({ student: studentId, subject, date: normalizedDate });

      const result = await Attendance.findOneAndUpdate(
        { student: studentId, subject, date: normalizedDate },
        {
          student: studentId,
          subject,
          date: normalizedDate,
          status,
          markedBy,
          isActive: true,
        },
        { upsert: true, new: true, runValidators: true },
      );

      await logAudit({
        action: existing ? 'UPDATE' : 'CREATE',
        collectionName: 'Attendance',
        documentId: result._id,
        performedBy: markedBy,
        oldValue: existing ? { status: existing.status } : null,
        newValue: { status, subject, date: normalizedDate },
        ipAddress,
        userAgent,
      });

      results.push(result);
    } catch (err) {
      logger.error({ error: err.message, index: i, studentId }, 'Attendance upsert failed');
      errors.push({ index: i, studentId, message: err.message });
    }
  }

  return { results, errors };
};

export const getAttendanceByDateAndSubject = async (date, subject) => {
  const records = await Attendance.find({ date: normalizeDate(date), subject, isActive: true })
    .populate('student', 'name email')
    .populate('markedBy', 'name')
    .lean();

  return records;
};

export const getStudentAttendance = async ({ studentId, subject, startDate, endDate, page, limit }) => {
  const query = { student: studentId, isActive: true };
  if (subject) query.subject = subject;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const total = await Attendance.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const records = await Attendance.find(query)
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return { records, meta: { page, limit, total, totalPages } };
};

export const getStudentStats = async (studentId) => {
  const records = await Attendance.find({ student: studentId, isActive: true }).lean();

  const subjectMap = {};
  records.forEach((r) => {
    if (!subjectMap[r.subject]) {
      subjectMap[r.subject] = { total: 0, present: 0, absent: 0 };
    }
    subjectMap[r.subject].total += 1;
    if (r.status === 'present' || r.status === 'excused') {
      subjectMap[r.subject].present += 1;
    } else {
      subjectMap[r.subject].absent += 1;
    }
  });

  const subjectWise = Object.entries(subjectMap).map(([subject, stats]) => ({
    subject,
    total: stats.total,
    present: stats.present,
    absent: stats.absent,
    percentage: Math.round((stats.present / stats.total) * 100 * 100) / 100,
  }));

  const overallTotal = subjectWise.reduce((s, x) => s + x.total, 0);
  const overallPresent = subjectWise.reduce((s, x) => s + x.present, 0);

  return {
    subjectWise,
    overall: {
      total: overallTotal,
      present: overallPresent,
      absent: overallTotal - overallPresent,
      percentage: overallTotal === 0 ? 0 : Math.round((overallPresent / overallTotal) * 100 * 100) / 100,
    },
  };
};

export const getDefaulterList = async ({ subject, search, threshold = 75, className, branch, section, page, limit }) => {
  const matchQuery = { isActive: true, role: 'student' };
  if (className) matchQuery.className = className;
  if (branch) matchQuery.branch = branch;
  if (section) matchQuery.section = section;
  if (search) {
    matchQuery.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const { default: User } = await import('../models/User.js');
  const students = await User.find(matchQuery).lean();

  const defaulters = [];
  for (const student of students) {
    const attendanceQuery = { student: student._id, isActive: true };
    if (subject) attendanceQuery.subject = subject;

    const records = await Attendance.find(attendanceQuery).lean();

    if (subject) {
      const total = records.length;
      const present = records.filter((r) => r.status === 'present' || r.status === 'excused').length;
      const percentage = total === 0 ? 0 : Math.round((present / total) * 100 * 100) / 100;
      const neededFor75 = total === 0 ? 0 : Math.ceil((0.75 * total - present) / 0.25);

      if (percentage < threshold) {
        defaulters.push({
          _id: student._id,
          name: student.name,
          email: student.email,
          totalClasses: total,
          presentClasses: present,
          percentage,
          subjectsBelowThreshold: [{ subject, percentage, needed: neededFor75 < 0 ? 0 : neededFor75 }],
          neededFor75: neededFor75 < 0 ? 0 : neededFor75,
        });
      }
    } else {
      // Aggregate across all subjects
      const subjectMap = {};
      records.forEach((r) => {
        if (!subjectMap[r.subject]) subjectMap[r.subject] = { total: 0, present: 0 };
        subjectMap[r.subject].total += 1;
        if (r.status === 'present' || r.status === 'excused') {
          subjectMap[r.subject].present += 1;
        }
      });

      const subjectsBelowThreshold = Object.entries(subjectMap)
        .map(([subj, stats]) => {
          const pct = stats.total === 0 ? 0 : Math.round((stats.present / stats.total) * 100 * 100) / 100;
          const needed = stats.total === 0 ? 0 : Math.ceil((0.75 * stats.total - stats.present) / 0.25);
          return { subject: subj, percentage: pct, present: stats.present, total: stats.total, needed: needed < 0 ? 0 : needed };
        })
        .filter((s) => s.percentage < threshold);

      if (subjectsBelowThreshold.length > 0) {
        const totalClasses = records.length;
        const presentClasses = records.filter((r) => r.status === 'present' || r.status === 'excused').length;
        const overallPct = totalClasses === 0 ? 0 : Math.round((presentClasses / totalClasses) * 100 * 100) / 100;
        const maxNeeded = Math.max(...subjectsBelowThreshold.map((s) => s.needed));

        defaulters.push({
          _id: student._id,
          name: student.name,
          email: student.email,
          totalClasses,
          presentClasses,
          percentage: overallPct,
          subjectsBelowThreshold,
          neededFor75: maxNeeded,
        });
      }
    }
  }

  // Sort by percentage ascending
  defaulters.sort((a, b) => a.percentage - b.percentage);

  const total = defaulters.length;
  const totalPages = Math.ceil(total / limit);
  const paged = defaulters.slice((page - 1) * limit, page * limit);

  return { records: paged, meta: { page, limit, total, totalPages } };
};
