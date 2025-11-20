const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const  connectDB= require('./src/config/database');
// const {connectRedis}  = require('./src/config/redis');
require('dotenv').config();

const app = express();

// Import routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const menuRoutes = require('./src/routes/menus');
const itemRoutes = require('./src/routes/items');
const orderRoutes = require('./src/routes/orders');
const ratingRoutes = require('./src/routes/ratings');
const adminRoutes = require('./src/routes/admin');
const paymentRoutes = require('./src/routes/payment');
// Security middleware
app.use(helmet());
app.use(cors({ origin: "*" })); // allow all for testing
app.use(compression());
app.use(mongoSanitize());
app.use(hpp());


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

app.use(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// const { handleStripeWebhook } = require('./src/controllers/paymentController');
// app.post('/api/stripe/webhook', handleStripeWebhook);


// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Mom\'s Kitchen API is running smoothly!',
    timestamp: new Date().toISOString()
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`🚀 Mom's Kitchen API running on port ${PORT}`);
});

module.exports = app;