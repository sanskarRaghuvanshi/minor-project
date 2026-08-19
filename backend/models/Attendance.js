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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

attendanceSchema.index({ student: 1, subject: 1, date: 1 }, { unique: true });
attendanceSchema.index({ markedBy: 1, date: -1 });
attendanceSchema.index({ subject: 1, date: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
