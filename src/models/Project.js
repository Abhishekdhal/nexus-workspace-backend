const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: [true, 'Please add a project name']
  },
  about: {
    type: String,
    required: [true, 'Please add a description']
  },
  domain: {
    type: String,
    required: [true, 'Please add a domain']
  },
  deadline: {
    type: Date,
    required: true
  },
  extensionRequest: {
    requestedDate: { type: Date },
    reason: { type: String },
    status: {
      type: String,
      enum: ['none', 'pending', 'accepted', 'rejected'],
      default: 'none'
    }
  },
  leadId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  joinRequests: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  isCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', ProjectSchema);
