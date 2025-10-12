const Rating = require('../models/Rating');
const Order = require('../models/Order');
const MomProfile = require('../models/MomProfile');
const { deleteCachePattern } = require('../utils/cache');

const createRating = async (req, res) => {
  try {
    const { mom_id, order_id, rate, comment } = req.body;

    if (req.user.role !== 'customer') {
      return res.status(403).json({
        status: 'error',
        message: 'Only customers can rate moms'
      });
    }

    // Verify order exists and belongs to customer and is delivered
    const order = await Order.findOne({
      _id: order_id,
      customer_id: req.user._id,
      mom_id: mom_id,
      status: 'delivered'
    });

    if (!order) {
      return res.status(400).json({
        status: 'error',
        message: 'Order not found or not eligible for rating'
      });
    }

    // Check if rating already exists
    const existingRating = await Rating.findOne({
      customer_id: req.user._id,
      order_id
    });

    if (existingRating) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already rated this order'
      });
    }

    // Create rating
    const rating = await Rating.create({
      mom_id,
      customer_id: req.user._id,
      order_id,
      rate,
      comment
    });

    // Update mom's average rating
    await updateMomRating(mom_id);

    // Clear cache
    await deleteCachePattern(`ratings:*`);
    await deleteCachePattern(`menus:*`);

    res.status(201).json({
      status: 'success',
      message: 'Rating submitted successfully',
      data: { rating }
    });
  } catch (error) {
    console.error('Create Rating Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const updateMomRating = async (momId) => {
  try {
    const ratings = await Rating.aggregate([
      { $match: { mom_id: mongoose.Types.ObjectId(momId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rate' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const { averageRating = 0, totalRatings = 0 } = ratings[0] || {};

    await MomProfile.findOneAndUpdate(
      { user_id: momId },
      {
        'rating.average': Math.round(averageRating * 10) / 10,
        'rating.count': totalRatings
      }
    );
  } catch (error) {
    console.error('Update Mom Rating Error:', error);
  }
};

const getRatingsByMom = async (req, res) => {
  try {
    const { momId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [ratings, totalCount] = await Promise.all([
      Rating.find({ mom_id: momId })
        .populate('customer_id', 'name')
        .populate('order_id', 'createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Rating.countDocuments({ mom_id: momId })
    ]);

    const momProfile = await MomProfile.findOne({ user_id: momId });

    res.status(200).json({
      status: 'success',
      data: {
        ratings,
        averageRating: momProfile?.rating?.average || 0,
        totalRatings: momProfile?.rating?.count || 0,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get Ratings Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const getMyRatings = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [ratings, totalCount] = await Promise.all([
      Rating.find({ customer_id: req.user._id })
        .populate('mom_id', 'name')
        .populate('order_id', 'createdAt total_amount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Rating.countDocuments({ customer_id: req.user._id })
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        ratings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get My Ratings Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const updateRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { rate, comment } = req.body;

    const rating = await Rating.findOneAndUpdate(
      {
        _id: ratingId,
        customer_id: req.user._id
      },
      { rate, comment },
      { new: true, runValidators: true }
    );

    if (!rating) {
      return res.status(404).json({
        status: 'error',
        message: 'Rating not found'
      });
    }

    // Update mom's average rating
    await updateMomRating(rating.mom_id);

    // Clear cache
    await deleteCachePattern(`ratings:*`);
    await deleteCachePattern(`menus:*`);

    res.status(200).json({
      status: 'success',
      message: 'Rating updated successfully',
      data: { rating }
    });
  } catch (error) {
    console.error('Update Rating Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const deleteRating = async (req, res) => {
  try {
    const { ratingId } = req.params;

    const rating = await Rating.findOneAndDelete({
      _id: ratingId,
      customer_id: req.user._id
    });

    if (!rating) {
      return res.status(404).json({
        status: 'error',
        message: 'Rating not found'
      });
    }

    // Update mom's average rating
    await updateMomRating(rating.mom_id);

    // Clear cache
    await deleteCachePattern(`ratings:*`);
    await deleteCachePattern(`menus:*`);

    res.status(200).json({
      status: 'success',
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    console.error('Delete Rating Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createRating,
  getRatingsByMom,
  getMyRatings,
  updateRating,
  deleteRating
};