import mongoose from 'mongoose';

const { Schema } = mongoose;

const walkBySessionSchema = new Schema(
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
    expiresAt: {
      type: Date,
      required: [true, 'Expiry is required'],
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
      default: 'Room B05',
    },
    onlineDesks: [
      {
        student: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        lastSeen: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    hoveredStudents: [
      {
        student: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        markedAt: {
          type: Date,
          default: Date.now,
        },
        proximityMeters: {
          type: Number,
          default: 0.3,
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

walkBySessionSchema.index({ faculty: 1, isActive: 1 });
walkBySessionSchema.index({ branch: 1, className: 1, section: 1, isActive: 1 });

const WalkBySession = mongoose.model('WalkBySession', walkBySessionSchema);

export default WalkBySession;
