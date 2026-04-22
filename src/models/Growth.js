const mongoose = require('mongoose');

const GrowthSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  updateText: {
    type: String,
    required: [true, 'Please add an update text']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Growth', GrowthSchema);
