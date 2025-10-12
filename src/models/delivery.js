const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  delivery_partner: {
    type: String,
    required: true,
    trim: true // e.g., Dunzo, Shadowfax, Shiprocket
  },
  tracking_id: {
    type: String,
    trim: true,
    default: null
  },
  delivery_status: {
    type: String,
    enum: ['pending', 'assigned', 'picked', 'in_transit', 'delivered', 'failed'],
    default: 'pending'
  },
  delivery_fee: {
    type: Number,
    required: true,
    min: [0, 'Delivery fee cannot be negative']
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // for internal delivery personnel
  },
  estimated_time: {
    type: Date
  },
  delivered_at: {
    type: Date
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// 🔍 Useful indexes for operations dashboard
deliverySchema.index({ order_id: 1 });
deliverySchema.index({ delivery_status: 1 });
deliverySchema.index({ assigned_to: 1 });
deliverySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Delivery', deliverySchema);
