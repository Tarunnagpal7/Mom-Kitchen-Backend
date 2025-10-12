const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const upload = require('../middleware/upload');
const {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  addItemToMenu,
  removeItemFromMenu
} = require('../controllers/itemController');

const router = express.Router();

// Create item (mom only)
router.post('/',
  authenticate,
  authorize('mom'),
  upload.single('image'),
  [
    body('item_name').trim().notEmpty().withMessage('Item name is required'),
    body('veg').optional().isBoolean().withMessage('Veg must be boolean'),
    body('description').optional().trim(),
    body('category').optional().trim()
  ],
  validateRequest,
  createItem
);

// Get all items
router.get('/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('veg').optional().isBoolean().withMessage('Veg must be boolean'),
    query('category').optional().trim(),
    query('search').optional().trim()
  ],
  validateRequest,
  getItems
);

// Get item by ID
router.get('/:itemId',
  authenticate,
  [
    param('itemId').isMongoId().withMessage('Invalid item ID')
  ],
  validateRequest,
  getItemById
);

// Update item
router.put('/:itemId',
  authenticate,
  authorize('mom', 'admin'),
  upload.single('image'),
  [
    param('itemId').isMongoId().withMessage('Invalid item ID'),
    body('item_name').optional().trim().notEmpty().withMessage('Item name cannot be empty'),
    body('veg').optional().isBoolean().withMessage('Veg must be boolean'),
    body('description').optional().trim(),
    body('category').optional().trim()
  ],
  validateRequest,
  updateItem
);

// Delete item
router.delete('/:itemId',
  authenticate,
  authorize('mom', 'admin'),
  [
    param('itemId').isMongoId().withMessage('Invalid item ID')
  ],
  validateRequest,
  deleteItem
);

// Add item to menu
router.post('/menu',
  authenticate,
  authorize('mom'),
  [
    body('menuId').isMongoId().withMessage('Invalid menu ID'),
    body('itemId').isMongoId().withMessage('Invalid item ID'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1')
  ],
  validateRequest,
  addItemToMenu
);

// Remove item from menu
router.delete('/menu/:menuId/:itemId',
  authenticate,
  authorize('mom'),
  [
    param('menuId').isMongoId().withMessage('Invalid menu ID'),
    param('itemId').isMongoId().withMessage('Invalid item ID')
  ],
  validateRequest,
  removeItemFromMenu
);

module.exports = router;