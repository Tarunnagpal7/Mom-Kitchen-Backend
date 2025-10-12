const mongoose = require('mongoose');

const momProfileSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  profile_pic: {
    url: String,
    public_id: String
  },
  business_name: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot be longer than 500 characters']
  },
  authenticity: {
    type: String,
    required: [true, 'Authenticity is required'],
    trim: true
  },
  food_type: {
    type: String,
    enum: ['veg', 'nonveg', 'both'],
    default: 'both'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

momProfileSchema.index({ user_id: 1 });
momProfileSchema.index({ is_active: 1 });
momProfileSchema.index({ authenticity: 1 });
momProfileSchema.index({ food_type: 1 });

module.exports = mongoose.model('MomProfile', momProfileSchema);