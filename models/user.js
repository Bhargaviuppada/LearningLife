const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  enrolledCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
  }],
});

// Hash the password before saving the user
userSchema.pre('save', function(next) {
  if (this.isModified('password')) {  // Hash password only if it's new or modified
    bcrypt.hash(this.password, 10, (err, hashedPassword) => {
      if (err) return next(err);
      this.password = hashedPassword; // Replace the plain password with the hashed one
      next();
    });
  } else {
    next();
  }
});

// Compare the provided password with the stored hashed password
userSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;

