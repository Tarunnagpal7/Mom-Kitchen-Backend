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
  type: String,
  enum: [
    'biryani',
    'paneer',
    'idli',
    'dosa',
    'paratha',
    'dal makhani',
    'rajma chawal',
    'chole bhature',
    'butter chicken',
    'pav bhaji'
  ],
  default: null
  },
  authenticity: {
  type: String,
  enum: [
    'north indian',
    'south indian',
    'east indian',
    'west indian',
    'fusion',
    'any'
  ],
  default: null
}
}, {
  timestamps: true
});

preferencesSchema.index({ user_id: 1 });

module.exports = mongoose.model('Preferences', preferencesSchema);