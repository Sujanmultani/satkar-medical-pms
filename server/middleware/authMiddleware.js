const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'satkar_medical_jwt_secret_key_2026_safe');
      req.user = await User.findById(decoded.id).select('-passwordHash');

      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User account not found.',
          },
        });
      }

      return next();
    } catch (error) {
      console.error('[Auth Middleware Error]', error.message);
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Not authorized, token verification failed.',
        },
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'NO_TOKEN',
        message: 'Not authorized, no bearer token provided.',
      },
    });
  }
};

module.exports = { protect };
