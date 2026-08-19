import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'faculty', 'coordinator', 'admin'],
      required: [true, 'Role is required'],
    },
    branch: { type: String, required: [true, 'Branch is required'] },
    className: { type: String, required: [true, 'Class is required'] },
    section: {
      type: String,
      uppercase: true,
      trim: true,
      default: '',
      maxlength: [10, 'Section cannot exceed 10 characters'],
      match: [/^[A-Z0-9]{0,10}$/, 'Section must be alphanumeric'],
    },
    subjects: [{ type: String }],
    avatar: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangedAt: { type: Date },
    lastAttendanceEmailAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ branch: 1, className: 1, section: 1, role: 1 });
userSchema.index({ role: 1, isActive: 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    next();
    return;
  }
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }
  next();
});

userSchema.methods.comparePassword = async function compare(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.changedPasswordAfter = function changedPasswordAfter(jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

const User = mongoose.model('User', userSchema);

export default User;
