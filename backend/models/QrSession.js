import mongoose from 'mongoose';

const { Schema } = mongoose;

const qrSessionSchema = new Schema(
  {
    sessionToken: {
      type: String,
      required: [true, 'Session token is required'],
      unique: true,
      index: true,
    },
    faculty: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Faculty is required'],
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
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true,
    },
    className: {
      type: String,
      required: [true, 'Class is required'],
      trim: true,
    },
    section: {
      type: String,
      uppercase: true,
      trim: true,
      default: '',
    },
    scannedStudents: [
      {
        student: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        scannedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

qrSessionSchema.index({ faculty: 1, date: -1 });
qrSessionSchema.index({ isActive: 1 });

const QrSession = mongoose.model('QrSession', qrSessionSchema);

export default QrSession;