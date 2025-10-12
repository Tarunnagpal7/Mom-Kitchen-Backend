const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const {
  sendOTPController,
  verifyOTPAndLogin,
  signup,
  refreshToken,
  logout
} = require('../controllers/authController');

const router = express.Router();

// Send OTP
router.post('/send-otp',
  [
    body('phone_number')
      .isMobilePhone('any')
      .withMessage('Please provide a valid phone number')
  ],
  validateRequest,
  sendOTPController
);

// Verify OTP and Login
router.post('/login',
  [
    body('phone_number').isMobilePhone('any').withMessage('Please provide a valid phone number'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
  ],
  validateRequest,
  verifyOTPAndLogin
);

// Signup
router.post('/signup',
  [
    body('phone_number').isMobilePhone('any').withMessage('Please provide a valid phone number'),
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    // role from header (or fallback to body)
    (req, res, next) => {
      const headerRole = req.headers['x-user-role'];
      const bodyRole = req.body?.role;
      const role = headerRole || bodyRole;
      if (!role || !['customer', 'mom', 'delivery'].includes(role)) {
        return res.status(400).json({ message: 'Invalid or missing role' });
      }
      req.role = role; // attach to request for controller
      next();
    },
  ],
  validateRequest,
  signup
);

// Refresh Token
router.post('/refresh',
  [
    body('refresh_token').notEmpty().withMessage('Refresh token is required')
  ],
  validateRequest,
  refreshToken
);

// Logout
router.post('/logout', authenticate, logout);

module.exports = router;