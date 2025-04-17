const cloudinaryModule = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinaryModule.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinaryModule,
  params: {
    folder: 'courses', // or any folder name you want
    allowedFormats: ['jpg', 'png', 'mp4', 'mov'],
    resource_type: 'auto'
  }
});

module.exports = {
  cloudinary: cloudinaryModule,
  storage
};

