const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  address_line: {
    type: String,
    required: [true, 'Address line is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    match: [/^\d{6}$/, 'Please enter a valid pincode']
  },
  is_default: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure only one default address per user
addressSchema.pre('save', async function(next) {
  if (this.is_default) {
    await this.constructor.updateMany(
      { user_id: this.user_id, _id: { $ne: this._id } },
      { is_default: false }
    );
  }
  next();
});

addressSchema.index({ user_id: 1 });

module.exports = mongoose.model('Address', addressSchema);