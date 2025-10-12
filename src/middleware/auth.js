const jwt = require('jsonwebtoken');
const User = require('../models/User');
const redisClient = require('../config/redis');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token required'
      });
    }
    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);


    if (isBlacklisted) {
      return res.status(401).json({
        status: 'error',
        message: 'Token has been invalidated'
      });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Check cache first
    let user = await redisClient.get(`user:${decoded._id}`);

    if (user) {
      user = JSON.parse(user);
    } else {
      user = await User.findById(decoded._id).select('-otp -otp_expires -jwt_refresh_token');
      if (user) {
        // Cache user for 15 minutes
        await redisClient.setEx(`user:${decoded._id}`, 900, JSON.stringify(user));
      }
    }
   

    if (!user ) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found or inactive'
      });
    }

    req.user = user;
    req.auth = decoded; // expose token claims for downstream checks

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        code: 'TOKEN_EXPIRED',
        message: 'Access token expired'
      });
    }
    return res.status(401).json({
      status: 'error',
      code: 'INVALID_TOKEN',
      message: 'Invalid token'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    const effectiveRole = req.user?.role || req.auth?.role;
    if (!roles.includes(effectiveRole)) {
      console.warn('Authorize denied:', {
        expected: roles,
        tokenRole: req.auth?.role,
        userRole: req.user?.role,
        userId: req.user?._id?.toString?.()
      });
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };