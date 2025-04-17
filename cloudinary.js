const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = file.mimetype.startsWith('video/') ? 'course_videos' : 'course_images';
    return {
      folder,
      resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
      public_id: `${Date.now()}-${file.originalname}`
    };
  }
});

module.exports = { cloudinary, storage };
