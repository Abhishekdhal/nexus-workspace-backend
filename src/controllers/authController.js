const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');

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

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Reset daily counter if it's a new day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!user.otpRequestDate || user.otpRequestDate < today) {
      user.otpRequestCount = 0;
      user.otpRequestDate = today;
    }

    // Check limit
    if (user.otpRequestCount >= 3) {
      return res.status(429).json({ success: false, message: 'Maximum OTP requests reached for today' });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Save to user
    user.otp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.otpRequestCount += 1;

    // We only want to run validation on the modified fields, but since we are saving
    // we should make sure other fields don't cause validation issues if they are not present.
    await user.save({ validateModifiedOnly: true });

    // Send email
    const message = `
      <h1>Password Reset Request</h1>
      <p>Your 4-digit OTP is: <strong>${otp}</strong></p>
      <p>It will expire in 10 minutes.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset OTP',
        html: message,
      });

      res.status(200).json({ success: true, message: 'OTP sent to email' });
    } catch (error) {
      user.otp = undefined;
      user.otpExpire = undefined;
      await user.save({ validateModifiedOnly: true });
      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (user.otpExpire < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpire = undefined;

    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  signup,
  login,
  forgotPassword,
  resetPassword
};
