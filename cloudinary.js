const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Load env vars
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary, // ✅ MUST be v2 instance
  params: {
    folder: 'courses', // or 'uploads'
    allowed_formats: ['jpg', 'png', 'mp4', 'mov'],
    resource_type: 'auto' // ✅ allows both image and video
  }
});

module.exports = {
  cloudinary,
  storage
};


