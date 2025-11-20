// routes/paymentRoutes.js
const express = require('express');
const { verifyPayment, failPayment } = require('../controllers/paymentController');
const {authenticate} = require('../middleware/auth');

const router = express.Router();

router.post('/verify-payment', authenticate, verifyPayment);
router.post('/fail-payment', authenticate, failPayment); 

module.exports = router;
