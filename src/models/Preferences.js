const mongoose = require('mongoose');

const preferencesSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  veg_pref: {
    type: String,
    enum: ['veg', 'nonveg', 'both'],
    default: 'both'
  },
  fav_dishes: {
    type: [String],
    default: []
  },
  authenticity: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

preferencesSchema.index({ user_id: 1 });

module.exports = mongoose.model('Preferences', preferencesSchema);