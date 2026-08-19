import mongoose from 'mongoose';

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'NOTIFY'],
    },
    collectionName: {
      type: String,
      required: [true, 'Collection name is required'],
    },
    documentId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Document ID is required'],
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Performed by is required'],
    },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

auditLogSchema.index({ performedBy: 1, timestamp: -1 });
auditLogSchema.index({ collectionName: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
