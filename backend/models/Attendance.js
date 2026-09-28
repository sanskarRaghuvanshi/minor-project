import mongoose from 'mongoose';

const { Schema } = mongoose;

const attendanceSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [100, 'Subject name cannot exceed 100 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'excused'],
      required: [true, 'Status is required'],
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Marked by is required'],
    },
    correctionReason: {
      type: String,
      maxlength: [500, 'Correction reason cannot exceed 500 characters'],
    },
    isActive: { type: Boolean, default: true },
    slotNumber: {
      type: Number,
      min: 1,
      max: 8,
      default: 1,
    },
    timeSlot: {
      type: String,
      default: '09:45 - 10:35',
    },
    room: {
      type: String,
      default: 'B05',
    },
    source: {
      type: String,
      enum: ['manual', 'qr'],
      default: 'manual',
    },
    qrSession: {
      type: Schema.Types.ObjectId,
      ref: 'QrSession',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

attendanceSchema.index({ student: 1, date: 1, slotNumber: 1 }, { unique: true });
attendanceSchema.index({ student: 1, subject: 1, date: 1 });
attendanceSchema.index({ markedBy: 1, date: -1 });
attendanceSchema.index({ subject: 1, date: -1 });
attendanceSchema.index({ slotNumber: 1 });
attendanceSchema.index({ qrSession: 1 });
attendanceSchema.index({ source: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
