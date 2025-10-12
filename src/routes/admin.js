const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const {
  getAllUsers,
  toggleUserStatus,
  getAllMoms,
  toggleMomStatus,
  getAllMenus,
  toggleMenuStatus,
  getDashboardStats
} = require('../controllers/adminController');

const router = express.Router();

// Middleware to ensure admin access
router.use(authenticate, authorize('admin'));

// Dashboard stats
router.get('/dashboard', getDashboardStats);

// User management
router.get('/users',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('role').optional().isIn(['customer', 'mom', 'delivery', 'admin']).withMessage('Invalid role'),
    query('is_active').optional().isBoolean().withMessage('is_active must be boolean')
  ],
  validateRequest,
  getAllUsers
);

router.put('/users/:userId/status',
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    body('is_active').isBoolean().withMessage('is_active must be boolean')
  ],
  validateRequest,
  toggleUserStatus
);

// Mom management
router.get('/moms',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
    query('authenticity').optional().trim()
  ],
  validateRequest,
  getAllMoms
);

router.put('/moms/:momId/status',
  [
    param('momId').isMongoId().withMessage('Invalid mom ID'),
    body('is_active').isBoolean().withMessage('is_active must be boolean')
  ],
  validateRequest,
  toggleMomStatus
);

// Menu management
router.get('/menus',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('active').optional().isBoolean().withMessage('active must be boolean'),
    query('mom_id').optional().isMongoId().withMessage('Invalid mom ID')
  ],
  validateRequest,
  getAllMenus
);

router.put('/menus/:menuId/status',
  [
    param('menuId').isMongoId().withMessage('Invalid menu ID'),
    body('active').isBoolean().withMessage('active must be boolean')
  ],
  validateRequest,
  toggleMenuStatus
);

module.exports = router;