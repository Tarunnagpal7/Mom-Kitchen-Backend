const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  mom_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  rate: {
    type: Number,
    required: true,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Comment cannot be longer than 500 characters']
  }
}, {
  timestamps: true
});

ratingSchema.index({ mom_id: 1 });
ratingSchema.index({ customer_id: 1 });
ratingSchema.index({ customer_id: 1, order_id: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);