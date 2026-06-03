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
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #0b0f19;
            color: #e2e8f0;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .wrapper {
            width: 100%;
            background-color: #0b0f19;
            padding: 40px 0;
          }
          .container {
            max-width: 520px;
            margin: 0 auto;
            background: #111827;
            border: 1px solid #1f2937;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
          }
          .brand-banner {
            background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
            padding: 30px;
            text-align: center;
          }
          .logo {
            font-size: 26px;
            font-weight: 900;
            color: #ffffff;
            letter-spacing: 2px;
            margin: 0;
            text-transform: uppercase;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .brand-subtitle {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.8);
            margin-top: 4px;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .content {
            padding: 40px;
            text-align: center;
          }
          .icon-wrapper {
            width: 56px;
            height: 56px;
            background-color: rgba(79, 70, 229, 0.1);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
          }
          .icon {
            font-size: 28px;
            line-height: 56px;
          }
          h2 {
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            margin: 0 0 12px 0;
            letter-spacing: -0.5px;
          }
          p {
            font-size: 15px;
            color: #9ca3af;
            line-height: 1.6;
            margin: 0 0 32px 0;
          }
          .otp-card {
            background: linear-gradient(145deg, #1f2937, #111827);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 24px;
            display: inline-block;
            box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
            margin-bottom: 32px;
          }
          .otp-label {
            font-size: 11px;
            color: #6366f1;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 8px;
          }
          .otp-code {
            font-size: 38px;
            font-weight: 900;
            color: #38bdf8;
            letter-spacing: 8px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
            margin: 0;
            text-shadow: 0 0 12px rgba(56, 189, 248, 0.2);
          }
          .expiry-text {
            font-size: 12px;
            color: #ef4444;
            font-weight: 600;
            background: rgba(239, 68, 68, 0.1);
            padding: 6px 12px;
            border-radius: 20px;
            display: inline-block;
            margin-bottom: 32px;
          }
          .footer {
            padding: 0 40px 40px 40px;
            text-align: center;
            font-size: 12px;
            color: #4b5563;
            border-top: 1px solid #1f2937;
          }
          .footer-divider {
            height: 1px;
            background: #1f2937;
            margin-bottom: 24px;
          }
          .footer p {
            font-size: 12px;
            color: #4b5563;
            margin: 0;
            line-height: 1.5;
          }
          .footer a {
            color: #6366f1;
            text-decoration: none;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="brand-banner">
              <h1 class="logo">NEXUS</h1>
              <div class="brand-subtitle">Workspace Portal</div>
            </div>
            <div class="content">
              <div class="icon-wrapper">
                <span class="icon">🔐</span>
              </div>
              <h2>Verification Code</h2>
              <p>Please use the following One-Time Password (OTP) to complete your password reset request. For security reasons, do not share this code.</p>
              
              <div class="otp-card">
                <div class="otp-label">Secure Verification Code</div>
                <div class="otp-code">${otp}</div>
              </div>
              
              <div>
                <span class="expiry-text">⏳ Valid for 10 minutes</span>
              </div>
              
              <p style="font-size: 13px; color: #4b5563; margin: 0;">If you did not make this request, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <div class="footer-divider"></div>
              <p>
                &copy; ${new Date().getFullYear()} Nexus Workspace. All rights reserved.<br>
                Official platform for the <a href="#">KIIT Nexus Community</a>.
              </p>
            </div>
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
