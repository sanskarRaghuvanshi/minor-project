import mongoose from 'mongoose';

const { Schema } = mongoose;

const leaveRequestSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    documentUrl: {
      type: String,
      maxlength: [500, 'Document URL cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

export default LeaveRequest;
