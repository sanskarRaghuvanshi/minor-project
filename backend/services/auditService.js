import AuditLog from '../models/AuditLog.js';
import logger from '../config/logger.js';

export const logAudit = async ({
  action,
  collectionName,
  documentId,
  performedBy,
  oldValue = null,
  newValue = null,
  ipAddress = '',
  userAgent = '',
}) => {
  try {
    await AuditLog.create({
      action,
      collectionName,
      documentId,
      performedBy,
      oldValue,
      newValue,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    logger.error({ error: err.message, action, collectionName }, 'Audit log write failed');
  }
};
