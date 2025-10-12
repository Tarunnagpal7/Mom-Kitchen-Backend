const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats
} = require('../controllers/orderController');

const router = express.Router();

// Create order (customer only)
router.post('/',
  authenticate,
  authorize('customer'),
  [
    body('menu_id').isMongoId().withMessage('Invalid menu ID'),
    body('delivery_address_id').isMongoId().withMessage('Invalid delivery address ID'),
    body('special_instructions').optional().trim()
  ],
  validateRequest,
  createOrder
);

// Get orders
router.get('/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']).withMessage('Invalid status'),
    query('customer_id').optional().isMongoId().withMessage('Invalid customer ID'),
    query('mom_id').optional().isMongoId().withMessage('Invalid mom ID')
  ],
  validateRequest,
  getOrders
);

// Get order statistics
router.get('/stats',
  authenticate,
  authorize('mom', 'admin'),
  getOrderStats
);

// Get order by ID
router.get('/:orderId',
  authenticate,
  [
    param('orderId').isMongoId().withMessage('Invalid order ID')
  ],
  validateRequest,
  getOrderById
);

// Update order status (mom/admin only)
router.put('/:orderId/status',
  authenticate,
  authorize('mom', 'admin'),
  [
    param('orderId').isMongoId().withMessage('Invalid order ID'),
    body('status').isIn(['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']).withMessage('Invalid status')
  ],
  validateRequest,
  updateOrderStatus
);

// Cancel order
router.put('/:orderId/cancel',
  authenticate,
  [
    param('orderId').isMongoId().withMessage('Invalid order ID')
  ],
  validateRequest,
  cancelOrder
);

module.exports = router;