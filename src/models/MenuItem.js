const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  item_name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  veg: {
    type: Boolean,
    required: true,
    default: true
  },
  image: {
    url: String,
    public_id: String
  },
  category: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

menuItemSchema.index({ item_name: 1 });
menuItemSchema.index({ veg: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);