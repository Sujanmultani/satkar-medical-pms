const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'satkar_medical_jwt_secret_key_2026_safe',
    { expiresIn: '7d' }
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

module.exports = {
  registerAdmin,
  loginUser,
  getMe,
  changePassword,
};
