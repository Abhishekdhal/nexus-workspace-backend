const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  try {
    const { name, email, password, domain, role } = req.body;

    if (!email.endsWith('@kiit.ac.in')) {
      return res.status(400).json({ success: false, message: 'Only @kiit.ac.in emails are allowed' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      domain,
      role: role === 'admin' ? 'admin' : 'user' // Default to user unless explicitly set to admin
    });

    if (user) {
      res.status(201).json({
        success: true,
        message: 'Signup successful. Pending admin approval.',
        _id: user.id,
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isApproved && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Your account is pending admin approval' });
    }

    res.json({
      success: true,
      _id: user.id,
      name: user.name,
      email: user.email,
      domain: user.domain,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  signup,
  login
};
