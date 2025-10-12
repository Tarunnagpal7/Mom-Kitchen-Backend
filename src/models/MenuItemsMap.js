const mongoose = require('mongoose');

const menuItemsMapSchema = new mongoose.Schema({
  menu_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    required: true
  },
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1']
  }
}, {
  timestamps: true
});

menuItemsMapSchema.index({ menu_id: 1 });
menuItemsMapSchema.index({ item_id: 1 });
menuItemsMapSchema.index({ menu_id: 1, item_id: 1 }, { unique: true });

module.exports = mongoose.model('MenuItemsMap', menuItemsMapSchema);