const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const User = require('./models/user');
const Course = require('./models/course');

const app = express();

// Middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'secretKey',
  resave: false,
  saveUninitialized: false
}));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/learningLife')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Multer setup for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + Date.now() + ext);
  }
});
const upload = multer({ storage });

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
      if (!user || user.password !== password) {
        return res.send('Invalid email or password');
      }
      req.session.user = user;
      req.session.userId = user._id;
      res.redirect('/home');
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

  // Populate the enrolledCourses with course details
  User.findById(userId)
    .populate('enrolledCourses') // Populate the entire enrolledCourses array with Course details
    .then(user => {
      res.render('profile', { user });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send("Error loading user profile");
    });
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

// Admin - Add course form
app.get('/admincourse', (req, res) => {
  if (!req.session.admin) return res.redirect('/adminlogin');
  res.render('admincourse');
});

// Admin - Add course POST
app.post('/admincourse', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'videos', maxCount: 10 }
]), (req, res) => {
  if (!req.session.admin) return res.redirect('/adminlogin');

  const { name, timeRequired } = req.body;
  const image = req.files['image']?.[0]?.filename || '';
  const videos = (req.files['videos'] || []).map(file => file.filename);

  const newCourse = new Course({
    name,
    timeRequired,
    image,
    videos
  });

  newCourse.save()
    .then(() => res.redirect('/admin'))
    .catch(err => res.status(500).send('Error saving course: ' + err));
});

// Admin - Delete a course
app.post('/delete-course/:id', (req, res) => {
  if (!req.session.admin) return res.redirect('/adminlogin');

  const courseId = req.params.id;
  Course.findByIdAndDelete(courseId)
    .then(() => res.redirect('/admin'))
    .catch(err => res.status(500).send('Error deleting course'));
});

// ----------- USER SIDE ----------

// View available courses
app.get('/courses', (req, res) => {
  Course.find()
    .then(courses => {
      res.render('course', { courses });
    })
    .catch(err => res.status(500).send('Error fetching courses'));
});

// Enroll in a course
app.post('/enroll/:courseId', (req, res) => {
  const courseId = req.params.courseId;
  const userId = req.session.userId;

  if (!userId) return res.redirect('/login');

  User.findById(userId)
    .then(user => {
      if (!user.enrolledCourses.includes(courseId)) {
        user.enrolledCourses.push({ _id: courseId, status: 'Not Started' });
        return user.save();
      } else {
        return Promise.resolve(); // Already enrolled
      }
    })
    .then(() => res.redirect('/encourses'))
    .catch(err => res.status(500).send("Error enrolling in course"));
});

// View enrolled courses
app.get('/encourses', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  
  const userId = req.session.user._id;

  User.findById(userId)
    .populate('enrolledCourses') // This needs to match your schema
    .then(user => {
      res.render('encourses', { enrolledCourses: user.enrolledCourses });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send("Error loading enrolled courses");
    });
});

// Start course
app.post('/start-course/:courseId', (req, res) => {
  const courseId = req.params.courseId;
  const userId = req.session.userId;
  if (!userId) return res.redirect('/login');

  User.findById(userId)
    .then(user => {
      const enrolled = user.enrolledCourses.find(c => c._id.toString() === courseId);
      if (enrolled) {
        enrolled.status = 'In Progress';
        return user.save();
      }
    })
    .then(() => res.redirect('/encourses'))
    .catch(err => res.status(500).send("Error starting course"));
});
app.get('/start-course/:courseId', async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).send('Course not found');
    }

    // Assuming the course has a "videos" field
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
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.render('logout'); // Renders logout.ejs
  });
});


// Start the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});





