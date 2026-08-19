import mongoose from 'mongoose';
import { logAudit } from '../../services/auditService.js';
import AuditLog from '../../models/AuditLog.js';
import { startDb, stopDb, clearDb } from '../setup.js';

describe('Audit Service', () => {
  beforeAll(async () => { await startDb(); });
  afterAll(async () => { await stopDb(); });
  afterEach(async () => { await clearDb(); });

  it('creates an audit log entry', async () => {
    const userId = new mongoose.Types.ObjectId();
    const docId = new mongoose.Types.ObjectId();

    await logAudit({
      action: 'CREATE',
      collectionName: 'Attendance',
      documentId: docId,
      performedBy: userId,
      newValue: { status: 'present' },
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });

    const logs = await AuditLog.find();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('CREATE');
  });

  it('handles multiple entries', async () => {
    const userId = new mongoose.Types.ObjectId();

    await logAudit({ action: 'LOGIN', collectionName: 'User', documentId: userId, performedBy: userId });
    await logAudit({ action: 'LOGOUT', collectionName: 'User', documentId: userId, performedBy: userId });

    const logs = await AuditLog.find();
    expect(logs).toHaveLength(2);
  });

  it('does not throw on error', async () => {
    await expect(
      logAudit({ action: 'INVALID', collectionName: 'Test', documentId: new mongoose.Types.ObjectId(), performedBy: new mongoose.Types.ObjectId() }),
    ).resolves.not.toThrow();
  });
});
