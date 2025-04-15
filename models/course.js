const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  timeRequired: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  videos: {
    type: [String],  // Array of strings (video names or links)
    required: true
  }
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
