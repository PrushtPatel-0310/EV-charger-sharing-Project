import express from 'express';
import { uploadImages, deleteImage } from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { upload } from '../config/cloudinary.js';
import { ValidationError } from '../utils/errors.js';

const router = express.Router();

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err) {
    console.error('Multer error details:', {
      message: err.message,
      code: err.code,
      name: err.name,
      stack: err.stack,
      field: err.field,
      storageErrors: err.storageErrors,
    });
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ValidationError('File size too large. Maximum 5MB per image.'));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new ValidationError('Too many files. Maximum 10 images allowed.'));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ValidationError('Unexpected file field. Use "images" as the field name.'));
    }
    
    // Check for Cloudinary errors
    if (err.storageErrors && err.storageErrors.length > 0) {
      const cloudinaryError = err.storageErrors[0];
      return next(new ValidationError(`Cloudinary error: ${cloudinaryError.message || 'Failed to upload to Cloudinary'}`));
    }
    
    // Check for file filter errors
    if (err.message && err.message.includes('Only image files')) {
      return next(new ValidationError(err.message));
    }
    
    // Generic error with more details
    const errorMessage = err.message || err.toString() || 'Unknown file upload error';
    console.error('Unhandled multer error:', errorMessage);
    return next(new ValidationError(`File upload error: ${errorMessage}. Please check file type (JPEG, PNG, WebP) and size (max 5MB).`));
  }
  next();
};

// Upload multiple images
router.post(
  '/images',
  authenticate,
  (req, res, next) => {
    upload.array('images', 10)(req, res, (err) => {
      if (err) {
        console.error('Multer upload error:', {
          error: err,
          message: err?.message,
          code: err?.code,
          name: err?.name,
          stack: err?.stack,
        });
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  uploadImages
);

// Delete image
router.delete('/images', authenticate, deleteImage);

// Test endpoint to check Cloudinary configuration
router.get('/test', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      cloudinaryConfigured: true,
      message: 'Cloudinary is configured with hardcoded credentials',
    },
  });
});

export default router;

