import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

// Configure Cloudinary with hardcoded credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  // cloud_name: 'dpndjkyby',
  // api_key: '619387633756666',
  // api_secret: 'Axw2KCabu_HsucLrSIsTecBYKPY',
});
cloudinary.api.ping()
  .then(() => console.log("✅ Cloudinary AUTH OK"))
  .catch(err => console.error("❌ Cloudinary AUTH FAIL", err));


// Configure multer storage for Cloudinary
let storage;
try {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
      return {
        folder: 'evcharger',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto' },
        ],
      };
    },
  });
} catch (error) {
  console.error('Error creating CloudinaryStorage:', error);
  // Don't throw - let multer handle it during upload
  storage = null;
}

// Create multer upload instance
if (!storage) {
  console.error('⚠️  CloudinaryStorage not initialized. File uploads will fail.');
}

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10, // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    // Check if storage is initialized
    if (!storage) {
      return cb(new Error('Cloudinary storage not initialized. Please check server configuration.'));
    }
    
    const allowedTypes = /jpeg|jpg|png|webp/;
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype) {
      return cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only image files (jpeg, jpg, png, webp) are allowed!`));
    }
  },
});

export default cloudinary;

