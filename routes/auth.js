// routes/auth.js

const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/user');

// Show register page at root
router.get('/', (req, res) => {
  res.render('register'); // This is now your default page
});

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashedPassword });
  await user.save();
  res.redirect('/login'); // Go to login after successful registration
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.user = user;
    res.redirect('/home'); // Redirect to home page after login
  } else {
    res.send('Invalid credentials');
  }
});

router.get('/home', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('home'); // home.ejs page
});

module.exports = router;
