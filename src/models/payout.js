const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  payment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  receiver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Payout amount cannot be negative']
  },
  type: {
    type: String,
    enum: ['mom_share', 'admin_commission', 'delivery_fee'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  date: {
    type: Date,
    default: Date.now
  },
  provider_payout_id: {
    type: String,
    trim: true // e.g., Razorpay transfer_id
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// 🔍 Indexes for analytics and reconciliation
payoutSchema.index({ payment_id: 1 });
payoutSchema.index({ receiver_id: 1 });
payoutSchema.index({ type: 1 });
payoutSchema.index({ status: 1 });
payoutSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payout', payoutSchema);
