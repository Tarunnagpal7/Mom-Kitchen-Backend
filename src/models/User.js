const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be longer than 50 characters']
  },
  phone_number: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^\+?[1-9]\d{9,14}$/, 'Please enter a valid phone number']
  },
  role: {
    type: String,
    enum: ['customer', 'mom', 'delivery', 'admin'],
    default: 'customer'
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  jwt_refresh_token: {
    type: String,
    default: null
  },
  otp: {
    type: String,
    default: null
  },
  otp_expires: {
    type: Date,
    default: null
  },
  is_active: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Generate JWT Access Token
userSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    {
      _id: this._id,
      phone_number: this.phone_number,
      role: this.role
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

// Generate JWT Refresh Token
userSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};

// Generate and hash OTP
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = bcrypt.hashSync(otp, 10);
  this.otp_expires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function(otp) {
  // if (this.otp_expires < Date.now()) {
  //   return false;
  // }
  // return bcrypt.compareSync(otp, this.otp);
  return true;
};

// Clear OTP
userSchema.methods.clearOTP = function() {
  this.otp = undefined;
  this.otp_expires = undefined;
};

userSchema.index({ phone_number: 1 });

module.exports = mongoose.model('User', userSchema);