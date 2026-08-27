import express from 'express';
import multer from 'multer';
import upload from '../config/multer.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/upload-document', protect, authorize('student'), (req, res) => {
  upload.single('document')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        data: null,
        meta: null,
        message: 'File too large. Maximum size is 5MB',
        errorCode: 'FILE_TOO_LARGE',
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        data: null,
        meta: null,
        message: err.message || 'File upload failed',
        errorCode: err.code || 'UPLOAD_ERROR',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        data: null,
        meta: null,
        message: 'No file uploaded',
        errorCode: 'NO_FILE',
      });
    }

    const documentUrl = `/uploads/leave-documents/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      data: { documentUrl },
      meta: null,
      message: 'Document uploaded successfully',
    });
  });
});

export default router;
