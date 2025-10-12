const express = require('express');
const { body, param } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const upload = require('../middleware/upload');
const {
  getProfile,
  updateProfile,
  setupMomProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  addPreferences,
  toggleDefaultAddress
} = require('../controllers/userController');

const router = express.Router();

// Get user profile
router.get('/me', authenticate, getProfile);

// Update user profile
router.put('/me',
  authenticate,
  [
    body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
  ],
  validateRequest,
  updateProfile
);

// Setup mom profile
router.post('/mom-profile',
  authenticate,
  authorize('mom'),
  upload.single('profile_pic'),
  [
    body('business_name').trim().notEmpty().withMessage('Business name is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('authenticity').trim().notEmpty().withMessage('Authenticity is required'),
    body('food_type').optional().isIn(['veg', 'nonveg', 'both']).withMessage('Invalid food type')
  ],
  validateRequest,
  setupMomProfile
);

// Address routes
router.post('/addresses',
  authenticate,
  [
    body('address_line').trim().notEmpty().withMessage('Address line is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('pincode').matches(/^\d{6}$/).withMessage('Please enter a valid pincode'),
    body('is_default').optional().isBoolean().withMessage('is_default must be a boolean')
  ],
  validateRequest,
  addAddress
);

router.put('/addresses/:addressId',
  authenticate,
  [
    param('addressId').isMongoId().withMessage('Invalid address ID'),
    body('address_line').optional().trim().notEmpty().withMessage('Address line cannot be empty'),
    body('city').optional().trim().notEmpty().withMessage('City cannot be empty'),
    body('state').optional().trim().notEmpty().withMessage('State cannot be empty'),
    body('pincode').optional().matches(/^\d{6}$/).withMessage('Please enter a valid pincode'),
    body('is_default').optional().isBoolean().withMessage('is_default must be a boolean')
  ],
  validateRequest,
  updateAddress
);

router.patch('/addresses/:addressId',
  authenticate,
  [
    param('addressId').isMongoId().withMessage('Invalid address ID')
  ],
  validateRequest,
  toggleDefaultAddress
);

router.delete('/addresses/:addressId',
  authenticate,
  [
    param('addressId').isMongoId().withMessage('Invalid address ID')
  ],
  validateRequest,
  deleteAddress
);

// Update preferences
router.post('/preferences',
  authenticate,
  [
    body('veg_pref')
      .optional()
      .isIn(['veg', 'nonveg', 'both'])
      .withMessage('Invalid veg preference'),
    body('fav_dishes')
      .optional()
      .isIn([
        'Biryani',
    'Paneer',
    'Idli',
    'Dosa',
    'Paratha',
    'Dal Makhani',
    'Rajma Chawal',
    'Chole Bhature',
    'Butter Chicken',
    'Pav Bhaji'
      ])
      .withMessage('Invalid fav dish'),
    body('authenticity')
      .optional()
      .isIn([
        'North Indian',
        'South Indian',
        'East Indian',
        'West Indian',
        'Fusion',
        'Any'
      ])
      .withMessage('Invalid authenticity')
  ],
  validateRequest,
  addPreferences
);

module.exports = router;