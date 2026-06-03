const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
      streakCount: user.streakCount,
      linkedin: user.linkedin,
      github: user.github,
      gmail: user.gmail,
      profilePhotoUrl: user.profilePhotoUrl,
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
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset OTP</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #0f172a;
            color: #f1f5f9;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 500px;
            margin: 40px auto;
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
          }
          .header {
            text-align: center;
            margin-bottom: 24px;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #6366f1;
            letter-spacing: 1px;
            margin: 0;
          }
          .content {
            text-align: center;
          }
          h2 {
            font-size: 22px;
            font-weight: 700;
            color: #ffffff;
            margin-top: 0;
            margin-bottom: 8px;
          }
          p {
            font-size: 15px;
            color: #94a3b8;
            line-height: 1.6;
            margin-top: 0;
            margin-bottom: 24px;
          }
          .otp-container {
            background-color: #0f172a;
            border: 2px dashed #4f46e5;
            border-radius: 12px;
            padding: 16px 24px;
            display: inline-block;
            margin-bottom: 24px;
          }
          .otp-code {
            font-size: 32px;
            font-weight: 800;
            color: #38bdf8;
            letter-spacing: 6px;
            font-family: 'Courier New', Courier, monospace;
            margin: 0;
          }
          .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #334155;
            text-align: center;
            font-size: 12px;
            color: #64748b;
          }
          .footer a {
            color: #6366f1;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">NEXUS WORKSPACE</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password. Use the verification code below to proceed. This code is valid for <strong>10 minutes</strong>.</p>
            <div class="otp-container">
              <div class="otp-code">${otp}</div>
            </div>
            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">If you didn't request this, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Nexus Workspace. All rights reserved.<br>
            Made for the <a href="#">KIIT Nexus Community</a>.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset OTP',
        html: message,
      });

      res.status(200).json({ success: true, message: 'OTP sent to email' });
    } catch (error) {
      console.error("Email send error:", error);
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

// @desc    Authenticate with Google
// @route   POST /api/auth/google-login
// @access  Public
const googleLogin = async (req, res) => {
  const { idToken } = req.body;
  
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const { email } = ticket.getPayload();
    
    // Check if user exists in DB
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this email. Please register first.' 
      });
    }

    if (!user.isApproved && user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account is pending admin approval' 
      });
    }
    
    res.json({
      success: true,
      _id: user.id,
      name: user.name,
      email: user.email,
      domain: user.domain,
      role: user.role,
      streakCount: user.streakCount,
      linkedin: user.linkedin,
      github: user.github,
      gmail: user.gmail,
      profilePhotoUrl: user.profilePhotoUrl,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid Google token' });
  }
};

module.exports = {
  signup,
  login,
  forgotPassword,
  resetPassword,
  googleLogin
};
