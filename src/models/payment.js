const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Payment amount cannot be negative']
  },
  method: {
    type: String,
    enum: ['upi', 'card', 'cod'],
    required: true
  },
  status: {
    type: String,
    enum: ['initiated', 'success', 'failed', 'refunded'],
    default: 'initiated'
  },
  provider_payment_id: {
    type: String,
    trim: true // Razorpay payment_id or equivalent
  },
  payment_date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 🔍 Indexes for fast lookups and reporting
paymentSchema.index({ order_id: 1 });
paymentSchema.index({ customer_id: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ payment_date: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
