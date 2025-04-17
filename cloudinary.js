const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
console.log("Cloudinary uploader loaded:", cloudinary.uploader);

const storage = new CloudinaryStorage({
  cloudinary: cloudinary, // Make sure it's v2
  params: {
    folder: "LearningLifeCourses",
    allowed_formats: ["jpg", "png", "jpeg", "mp4"],
  },
});

module.exports = {
  cloudinary,
  storage,
};

