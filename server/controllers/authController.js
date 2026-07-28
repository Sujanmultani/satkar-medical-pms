const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendNewLoginSecurityAlert } = require('../services/emailService');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'satkar_medical_jwt_secret_key_2026_safe',
    { expiresIn: '365d' }
  );
};

// @desc    Register initial Admin user (Self-limiting)
// @route   POST /api/auth/register
// @access  Public (Only works if zero users exist)
const registerAdmin = async (req, res, next) => {
  try {
    const existingAdminCount = await User.countDocuments();
    if (existingAdminCount > 0) {
      return res.status(400).json({
        error: {
          code: 'ADMIN_EXISTS',
          message: 'An Admin account already exists. Self-registration is disabled.',
        },
      });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Please provide name, email, and password.',
        },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'admin',
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate admin & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Please provide both email and password.',
        },
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    const token = generateToken(user._id);

    // Trigger background Security Alert email
    const ipAddress = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    sendNewLoginSecurityAlert({
      userEmail: user.email,
      userName: user.name,
      ipAddress,
      userAgent,
    }).catch((err) => console.error('[Security Alert Email Warning]', err.message));

    return res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change logged-in user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Please provide both current and new password.',
        },
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User account not found.' },
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password does not match.',
        },
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate and send 6-digit OTP for Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        error: { code: 'MISSING_EMAIL', message: 'Please provide your registered admin email address.' },
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      $or: [{ email: cleanEmail }, { role: 'admin' }],
    });

    if (!user) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Admin user account not found.' },
      });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    user.resetOtp = otp;
    user.resetOtpExpire = otpExpire;
    await user.save();

    // Send OTP via Email strictly to satkarmedical8@gmail.com
    const { sendPasswordResetOtpEmail } = require('../services/emailService');
    const mailRes = await sendPasswordResetOtpEmail({
      userEmail: user.email,
      userName: user.name,
      otp,
    });

    if (!mailRes.success) {
      console.warn('[Forgot Password Warning] Failed to dispatch OTP email:', mailRes.error);
    }

    return res.status(200).json({
      message: 'A 6-digit OTP verification code has been sent strictly to satkarmedical8@gmail.com.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using 6-digit OTP
// @route   POST /api/auth/reset-password-otp
// @access  Public
const resetPasswordWithOtp = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'Please provide email, 6-digit OTP code, and new password.' },
      });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({
        error: { code: 'WEAK_PASSWORD', message: 'New password must be at least 4 characters long.' },
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      $or: [{ email: cleanEmail }, { role: 'admin' }],
    });

    if (!user) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User account not found.' },
      });
    }

    // Verify OTP code & expiration
    if (!user.resetOtp || user.resetOtp !== otp.trim()) {
      return res.status(400).json({
        error: { code: 'INVALID_OTP', message: 'Invalid 6-digit OTP verification code.' },
      });
    }

    if (!user.resetOtpExpire || new Date() > new Date(user.resetOtpExpire)) {
      return res.status(400).json({
        error: { code: 'EXPIRED_OTP', message: 'OTP verification code has expired. Please request a new code.' },
      });
    }

    // Hash and update password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.resetOtp = null;
    user.resetOtpExpire = null;
    await user.save();

    return res.status(200).json({
      message: 'Admin password reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerAdmin,
  loginUser,
  getMe,
  changePassword,
  forgotPassword,
  resetPasswordWithOtp,
};
