const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  mom_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Menu name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    url: String,
    public_id: String
  },
  active: {
    type: Boolean,
    default: true
  },
  total_cost: {
    type: Number,
    required: [true, 'Total cost is required'],
    min: [0, 'Total cost cannot be negative']
  },
  available_from: {
    type: Date,
    default: Date.now
  },
  available_until: {
    type: Date
  },
  max_orders: {
    type: Number,
    required: [true, 'Maximum orders is required'],
    min: [0, 'Maximum orders must be at least 1'],
    max: [15, 'Maximum orders cannot exceed 15'],
    default: 15
  },
  // Embedded simple items for this menu
  items: [
    new mongoose.Schema({
      item_name: { type: String, required: true, trim: true },
      description: { type: String, trim: true },
      veg: { type: Boolean, default: true },
      category: { type: String, trim: true }
    }, { _id: true })
  ]
}, {
  timestamps: true
});

menuSchema.index({ mom_id: 1 });
menuSchema.index({ active: 1 });
menuSchema.index({ available_from: 1, available_until: 1 });

module.exports = mongoose.model('Menu', menuSchema);