import mongoose from 'mongoose';
import Attendance from './models/Attendance.js';
import User from './models/User.js';

await mongoose.connect('mongodb://localhost:27017/smart-attendance');

const student = await User.findOne({ email: 'student@test.com' });
console.log('Student:', student._id);

// Add 8 absent records for Computer Networks
for (let i = 0; i < 8; i++) {
  const date = new Date('2026-08-05');
  date.setDate(date.getDate() + i);
  await Attendance.findOneAndUpdate(
    { student: student._id, subject: 'Computer Networks', date },
    { student: student._id, subject: 'Computer Networks', date, status: 'absent', markedBy: student._id, isActive: true },
    { upsert: true, new: true }
  );
}

console.log('Added 8 absent records for Computer Networks');

// Check stats
const stats = await Attendance.aggregate([
  { $match: { student: student._id, isActive: true } },
  { $group: { _id: '$subject', total: { $sum: 1 }, present: { $sum: { $cond: [{ $in: ['$status', ['present', 'excused']] }, 1, 0] } } } }
]);
console.log('Stats:', JSON.stringify(stats, null, 2));

await mongoose.disconnect();