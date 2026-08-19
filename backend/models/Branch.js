import mongoose from 'mongoose';

const { Schema } = mongoose;

const branchSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Branch name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Branch name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Branch code is required'],
      uppercase: true,
      trim: true,
      maxlength: [10, 'Branch code cannot exceed 10 characters'],
    },
    classes: [
      {
        name: {
          type: String,
          required: [true, 'Class name is required'],
          trim: true,
          maxlength: [50, 'Class name cannot exceed 50 characters'],
        },
        subjects: [
          {
            type: String,
            required: [true, 'Subject name is required'],
            trim: true,
            maxlength: [100, 'Subject name cannot exceed 100 characters'],
          },
        ],
      },
    ],
    sections: {
      type: [String],
      default: [],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Branch = mongoose.model('Branch', branchSchema);

export default Branch;
