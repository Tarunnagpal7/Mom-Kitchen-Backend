const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Preferences = require('../models/Preferences');
const MomProfile = require('../models/MomProfile');
const { sendOTP } = require('../services/twilioService');
const { setCache, deleteCache, deleteCachePattern } = require('../utils/cache');
const Address = require('../models/Address');

function normalizePhoneNumber(phone_number) {
  let num = phone_number.trim();

  // If already starts with +91 and is valid, return as is
  if (/^\+91\d{10}$/.test(num)) {
    return num;
  }

  // Remove all non-digit characters
  num = num.replace(/\D/g, '');

  // If it starts with 91 and length > 10, remove leading 91
  if (num.startsWith('91') && num.length > 10) {
    num = num.slice(2);
  }

  // If it starts with 0 and length > 10, remove leading 0
  if (num.startsWith('0') && num.length > 10) {
    num = num.slice(1);
  }

  // Ensure it's only last 10 digits
  num = num.slice(-10);

  return '+91' + num;
}


/**
 * sendOTPController
 * - Sends an OTP to an existing user (signup must be done first).
 * - If user not found, instructs to signup first.
 */
const sendOTPController = async (req, res) => {
  try {
    let { phone_number } = req.body;
     phone_number = normalizePhoneNumber(phone_number);
     console.log(phone_number);

    if (!phone_number) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number is required'
      });
    }

    const user = await User.findOne({ phone_number });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found. Please signup first.'
      });
    }

    // Allow sending OTP even if user is not yet verified (normal flow after signup)

    const otp = user.generateOTP();
    await user.save();

    // const result = await sendOTP(phone_number, otp);

    // if (!result || !result.success) {
    //   return res.status(500).json({
    //     status: 'error',
    //     message: 'Failed to send OTP'
    //   });
    // }

    res.status(200).json({
      status: 'success',
      message: 'OTP sent successfully',
      isNewUser: !user.is_verified
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * verifyOTPAndLogin
 * - Verifies OTP and logs the user in by issuing tokens.
 */
const verifyOTPAndLogin = async (req, res) => {
  try {
    let { phone_number, otp } = req.body;
     phone_number = normalizePhoneNumber(phone_number);

    if (!phone_number || !otp) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number and OTP are required'
      });
    }

    const user = await User.findOne({ phone_number });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Model method should return boolean
    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired OTP'
      });
    }

    // mark verified and clear otp
    user.clearOTP();
    user.is_verified = true;

    // Generate tokens (assumes methods on User model)
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.jwt_refresh_token = refreshToken;

    await user.save();

    // Cache user data (optional)
    await setCache(`user:${user._id}`, user, 900);
    
    // Get the default address or the first address
    const address = await Address.findOne({
      user_id: user._id,
      is_default: true
    }) 

    console.log('Found address:', address);

    const userResponse = {
      _id: user._id,
      name: user.name,
      phone_number: user.phone_number,
      role: user.role,
      is_verified: user.is_verified,
      is_active : user.is_active,
      address
    };

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: userResponse,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * signup
 * - Creates/updates a user record with basic details.
 * - DOES NOT require OTP here.
 * - Creates preferences and a mom profile stub (if role == 'mom').
 * - After signup client should call /auth/send-otp to verify phone.
 */
const signup = async (req, res) => {
  try {
    let { phone_number, name} = req.body;
    const role = req.role;
     phone_number = normalizePhoneNumber(phone_number);

    if (!phone_number || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number and name are required'
      });
    }

    let user = await User.findOne({ phone_number });

    if (user) {
      // If already verified, ask to login instead
      if (user.is_verified) {
        return res.status(400).json({
          status: 'error',
          message: 'User already exists. Please login instead.'
        });
      }
      // Update fields for existing unverified user
      user.name = name;
      user.role = role;
      await user.save();
      // Invalidate cached user (role may have changed)
      await deleteCache(`user:${user._id}`);
    } else {
      // Create new user (unverified)
      user = new User({
        phone_number,
        name,
        role,
        is_verified: false
      });
      await user.save();
      // Ensure no stale cache exists
      await deleteCache(`user:${user._id}`);
    }

    // // Ensure preferences exists (MVP: simple create if not present)
    // const existingPrefs = await Preferences.findOne({ user_id: user._id });
    // if (!existingPrefs) {
    //   await Preferences.create({ user_id: user._id });
    // }

    // // If role is mom, create a mom profile stub if not exists
    // if (role === 'mom') {
    //   const existingProfile = await MomProfile.findOne({ user_id: user._id });
    //   if (!existingProfile) {
    //     await MomProfile.create({ user_id: user._id });
    //   }
    // }

    const userResponse = {
      _id: user._id,
      name: user.name,
      phone_number: user.phone_number,
      role: user.role,
      is_verified: !!user.is_verified
    };

    res.status(201).json({
      status: 'success',
      message: 'Signup successful. Please verify your phone with OTP (call /auth/send-otp).',
      data: {
        user: userResponse
      }
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * refreshToken
 * - Exchanges a valid refresh token for a new access token.
 */
const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }

    const user = await User.findById(decoded._id);
    if (!user || user.jwt_refresh_token !== refresh_token) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }

    const accessToken = user.generateAccessToken();

    res.status(200).json({
      status: 'success',
      data: {
        accessToken
      }
    });
  } catch (error) {
    console.error('Refresh Token Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * logout
 * - Clears refresh token and blacklists current access token in cache.
 */
const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.jwt_refresh_token = null;
      await user.save();
    }

    // // Blacklist current token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      await setCache(`blacklist:${token}`, true, 86400); // expires in 24 hours
    }

    // Clear user cache
    await deleteCache(`user:${req.user._id}`);

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  sendOTPController,
  verifyOTPAndLogin,
  signup,
  refreshToken,
  logout
};
