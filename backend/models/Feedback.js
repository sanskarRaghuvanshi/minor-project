import mongoose from 'mongoose';

const { Schema } = mongoose;

const feedbackSchema = new Schema(
  {
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
    className: {
      type: String,
      required: [true, 'Class is required'],
      trim: true,
      maxlength: [50, 'Class name cannot exceed 50 characters'],
    },
    section: {
      type: String,
      uppercase: true,
      trim: true,
      default: '',
      maxlength: [10, 'Section cannot exceed 10 characters'],
      match: [/^[A-Z0-9]{0,10}$/, 'Section must be alphanumeric'],
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true,
      maxlength: [100, 'Branch name cannot exceed 100 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    topicCovered: {
      type: String,
      required: [true, 'Topic covered is required'],
      trim: true,
      maxlength: [200, 'Topic covered cannot exceed 200 characters'],
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5'],
      required: [true, 'Rating is required'],
    },
    studentsPresent: {
      type: Number,
      min: [0, 'Students present cannot be negative'],
      required: [true, 'Students present is required'],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

feedbackSchema.index({ faculty: 1, date: -1 });
feedbackSchema.index({ branch: 1, className: 1, date: -1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
