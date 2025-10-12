const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const {
  createMenu,
  getMenus,
  getMenuById,
  updateMenu,
  deleteMenu
} = require('../controllers/menuController');

const router = express.Router();

// Create menu (mom only)
router.post('/',
  authenticate,
  authorize('mom'),
  [
    body('name').trim().notEmpty().withMessage('Menu name is required'),
    body('total_cost').isNumeric().withMessage('Total cost must be a number').custom(value => value >= 0).withMessage('Total cost cannot be negative'),
    body('description').optional().trim(),
    body('max_orders').optional().isInt({ min: 1, max: 15 }).withMessage('Max orders must be between 1 and 15'),
    body('items').optional().isArray().withMessage('Items must be an array'),
    body('items.*.item_name').optional().trim().notEmpty().withMessage('Item name is required')
  ],
  validateRequest,
  createMenu
);

// Get all menus (with filters)
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('active').optional().isBoolean().withMessage('Active must be boolean'),
    query('mom_id').optional().isMongoId().withMessage('Invalid mom ID')
  ],
  validateRequest,
  getMenus
);

// Get menu by ID
router.get('/:menuId',
  authenticate,
  [
    param('menuId').isMongoId().withMessage('Invalid menu ID')
  ],
  validateRequest,
  getMenuById
);

// Update menu
router.put('/:menuId',
  authenticate,
  authorize('mom', 'admin'),
  [
    param('menuId').isMongoId().withMessage('Invalid menu ID'),
    body('name').optional().trim().notEmpty().withMessage('Menu name cannot be empty'),
    body('total_cost').optional().isNumeric().withMessage('Total cost must be a number').custom(value => value >= 0).withMessage('Total cost cannot be negative'),
    body('description').optional().trim(),
    body('active').optional().isBoolean().withMessage('Active must be boolean'),
    body('max_orders').optional().isInt({ min: 1, max: 15 }).withMessage('Max orders must be between 1 and 15')
  ],
  validateRequest,
  updateMenu
);

// Delete menu
router.delete('/:menuId',
  authenticate,
  authorize('mom', 'admin'),
  [
    param('menuId').isMongoId().withMessage('Invalid menu ID')
  ],
  validateRequest,
  deleteMenu
);

module.exports = router;