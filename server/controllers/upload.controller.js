import { ValidationError } from '../utils/errors.js';
import cloudinary from '../config/cloudinary.js';

export const uploadImages = async (req, res, next) => {
  try {
    console.log('Upload request received:', {
      hasFiles: !!req.files,
      filesCount: req.files ? req.files.length : 0,
      body: req.body,
    });

    // Cloudinary is configured with hardcoded credentials

    if (!req.files || req.files.length === 0) {
      console.error('No files in request:', {
        files: req.files,
        body: req.body,
      });
      throw new ValidationError('No images provided. Please select at least one image file.');
    }

    // CloudinaryStorage automatically uploads files
    // The file object structure: { fieldname, originalname, encoding, mimetype, path, size, filename }
    // path contains the Cloudinary secure URL
    console.log('Files received:', req.files.map(f => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      path: f.path,
      secure_url: f.secure_url,
      url: f.url,
    })));

    const imageUrls = req.files.map((file) => {
      // Try different possible properties
      return file.path || file.secure_url || file.url;
    }).filter(Boolean); // Remove any undefined values

    if (imageUrls.length === 0) {
      console.error('Upload files structure:', JSON.stringify(req.files, null, 2));
      throw new ValidationError('Failed to upload images - no URLs returned from Cloudinary. Please check your Cloudinary configuration.');
    }

    console.log('Successfully uploaded images:', imageUrls);

    res.json({
      success: true,
      data: {
        images: imageUrls,
      },
      message: 'Images uploaded successfully',
    });
  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      files: req.files ? req.files.length : 0,
      errorName: error.name,
      errorCode: error.code,
    });
    next(error);
  }
};

export const deleteImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      throw new ValidationError('Image URL is required');
    }

    // Extract public_id from Cloudinary URL
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const publicId = `evcharger/${filename.split('.')[0]}`;

    await cloudinary.uploader.destroy(publicId);

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

