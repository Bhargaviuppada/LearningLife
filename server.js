require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const User = require('./models/user');
const Course = require('./models/course');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const app = express();

// Set up view engine and static files
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
app.use(session({
  secret: 'secretKey',
  resave: false,
  saveUninitialized: false
}));

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Multer config
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Cloudinary upload helper
const uploadToCloudinary = (fileBuffer, folder, resource_type = 'image') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// ---------- ROUTES ----------

// Root route
app.get('/', (req, res) => {
  res.redirect('/register');
});

// Register
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  const newUser = new User({ name, email, password });
  newUser.save()
    .then(() => res.redirect('/login'))
    .catch(err => res.send('Error saving user: ' + err));
});

// Login
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  User.findOne({ email })
    .then(user => {
      if (!user) return res.send('Invalid email or password');

      user.comparePassword(password)
        .then(isMatch => {
          if (!isMatch) return res.send('Invalid email or password');
          req.session.user = user;
          req.session.userId = user._id;
          res.redirect('/home');
        })
        .catch(err => res.send('Error comparing passwords: ' + err));
    })
    .catch(err => res.send('Error during login: ' + err));
});

// Home
app.get('/home', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('home', { user: req.session.user });
});

// Profile
app.get('/profile', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const userId = req.session.user._id;

  User.findById(userId)
    .populate('enrolledCourses')
    .then(user => res.render('profile', { user }))
    .catch(err => res.status(500).send("Error loading user profile"));
});

// Admin Login
const ADMIN_CREDENTIALS = { username: 'admin', password: 'admin123' };

app.get('/adminlogin', (req, res) => {
  res.render('adminlogin');
});

app.post('/adminlogin', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    req.session.admin = true;
    res.redirect('/admin');
  } else {
    res.send('Invalid admin credentials');
  }
});

app.get('/adminlogout', (req, res) => {
  req.session.admin = null;
  res.redirect('/adminlogin');
});

// Admin Dashboard
app.get('/admin', (req, res) => {
  if (!req.session.admin) return res.redirect('/adminlogin');
  Course.find()
    .then(courses => res.render('admin', { courses }))
    .catch(err => res.status(500).send('Error fetching courses'));
});

// Add Course Form
app.get('/admincourse', (req, res) => {
  if (!req.session.admin) return res.redirect('/adminlogin');
  res.render('admincourse');
});

// Admin - Add course POST


// Route to handle the course creation (admin page)
app.post('/admincourse', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'videos', maxCount: 10 }
]), async (req, res) => {
  // Check if the user is logged in as admin
  if (!req.session.admin) {
    return res.redirect('/adminlogin');
  }

  try {
    // Log the incoming files for debugging purposes
    console.log('Files received:', req.files);

    const { name, timeRequired } = req.body; // Extract course details

    // Handle image upload
    const imageUrl = await uploadToCloudinary(req.files['image'][0].buffer, 'courses/images', 'image');
    console.log("Image uploaded to Cloudinary:", imageUrl);

    // Handle video uploads
    const videoUrls = await Promise.all(req.files['videos'].map(file =>
      uploadToCloudinary(file.buffer, 'courses/videos', 'video')
    ));
    console.log("Videos uploaded to Cloudinary:", videoUrls);

    // Create new course entry
    const newCourse = new Course({
      name,
      timeRequired,
      image: imageUrl,
      videos: videoUrls
    });

    // Save the new course to the database
    await newCourse.save();
    res.redirect('/admin'); // Redirect to admin page after saving course
  } catch (err) {
    // Log the error details
    console.error("Error during course creation:", err);
    res.status(500).send('❌ Error saving course: ' + err.message); // Send error message back to client
  }
});


// Delete Course
app.post('/delete-course/:id', (req, res) => {
  if (!req.session.admin) return res.redirect('/adminlogin');

  Course.findByIdAndDelete(req.params.id)
    .then(() => res.redirect('/admin'))
    .catch(err => res.status(500).send('Error deleting course'));
});

// View all courses
app.get('/courses', (req, res) => {
  Course.find()
    .then(courses => res.render('course', { courses }))
    .catch(err => res.status(500).send('Error fetching courses'));
});

// Enroll in a course
app.post('/enroll/:courseId', (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect('/login');

  User.findById(userId)
    .then(user => {
      if (!user.enrolledCourses.includes(req.params.courseId)) {
        user.enrolledCourses.push({ _id: req.params.courseId, status: 'Not Started' });
        return user.save();
      } else {
        return Promise.resolve();
      }
    })
    .then(() => res.redirect('/encourses'))
    .catch(err => res.status(500).send("Error enrolling in course"));
});

// View enrolled courses
app.get('/encourses', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  User.findById(req.session.user._id)
    .populate('enrolledCourses')
    .then(user => res.render('encourses', { enrolledCourses: user.enrolledCourses }))
    .catch(err => res.status(500).send("Error loading enrolled courses"));
});

// Start course (status update)
app.post('/start-course/:courseId', (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect('/login');

  User.findById(userId)
    .then(user => {
      const enrolled = user.enrolledCourses.find(c => c._id.toString() === req.params.courseId);
      if (enrolled) {
        enrolled.status = 'In Progress';
        return user.save();
      }
    })
    .then(() => res.redirect('/encourses'))
    .catch(err => res.status(500).send("Error starting course"));
});

// View course content
app.get('/start-course/:courseId', async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).send('Course not found');

    if (course.videos.length > 0) {
      res.render('start', { course });
    } else {
      return res.status(404).send('No videos available for this course');
    }
  } catch (error) {
    console.error('Error loading course:', error);
    res.status(500).send('Internal server error');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.render('logout');
  });
});

// Start server
app.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
});







