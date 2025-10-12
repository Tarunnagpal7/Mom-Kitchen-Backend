const Order = require('../models/Order');
const Menu = require('../models/Menu');
const Address = require('../models/Address');
const { deleteCachePattern } = require('../utils/cache');

const createOrder = async (req, res) => {
  try {
    const { orders, delivery_address_id, special_instructions } = req.body;
    if (req.user.role !== 'customer') {
      return res.status(403).json({ status: 'error', message: 'Only customers can place orders' });
    }

    const address = await Address.findOne({ _id: delivery_address_id });
    if (!address) {
      return res.status(404).json({ status: 'error', message: 'Delivery address not found' });
    }

    const results = [];

    for (const order of orders) {
      try {
        const menu = await Menu.findOne({ _id: order.menu_id, active: true }).populate('mom_id');
        if (!menu) throw new Error('Menu not found or inactive');

        // const now = new Date();
        // if (menu.available_from > now || (menu.available_until && menu.available_until < now)) {
        //   throw new Error('Menu is not available at this time');
        // }

        const available = Number(menu.max_orders);
        const requested = Number(order.items);
        
        if (requested > available) {
          throw new Error(`Only ${available} orders available`);
        }

        const newOrder = await Order.create({
          customer_id: req.user._id,
          menu_id: menu._id,
          mom_id: menu.mom_id._id,
          total_amount: menu.total_cost * order.items,
          delivery_address: {
            address_line: address.address_line,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
          },
          special_instructions,
          estimated_delivery_time: new Date(Date.now() + 60 * 60 * 1000)
        });

        // Decrement menu available orders
        menu.max_orders -= order.items;
        await menu.save();

        results.push({ menu_id: order.menu_id, status: 'success', order: newOrder });
      } catch (err) {
        results.push({ menu_id: order.menu_id, status: 'error', message: err.message });
      }
    }

    res.status(201).json({ status: 'success', results });
  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};


const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, customer_id, mom_id } = req.query;
    const filter = {};

    // Role-based filtering
    if (req.user.role === 'customer') {
      filter.customer_id = req.user._id;
    } else if (req.user.role === 'mom') {
      filter.mom_id = req.user._id;
    } else if (req.user.role === 'admin') {
      if (customer_id) filter.customer_id = customer_id;
      if (mom_id) filter.mom_id = mom_id;
    }

    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, totalCount] = await Promise.all([
      Order.find(filter)
        .populate('customer_id', 'name phone_number')
        .populate('mom_id', 'name phone_number')
        .populate({
          path: 'menu_id',
          select: 'name items description total_cost status  payment_status'
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const filter = { _id: orderId };

    // Role-based access control
    if (req.user.role === 'customer') {
      filter.customer_id = req.user._id;
    } else if (req.user.role === 'mom') {
      filter.mom_id = req.user._id;
    }

    const order = await Order.findOne(filter)
      .populate('customer_id', 'name phone_number')
      .populate('mom_id', 'name phone_number')
      .populate({
        path: 'menu_id',
        populate: {
          path: 'items',
          model: 'MenuItem'
        }
      });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { order }
    });
  } catch (error) {
    console.error('Get Order Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const filter = { _id: orderId };

    // Role-based access control
    if (req.user.role === 'mom') {
      filter.mom_id = req.user._id;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to update order status'
      });
    }

    // Validate status transitions
    const validStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid order status'
      });
    }

    const order = await Order.findOneAndUpdate(
      filter,
      { status },
      { new: true, runValidators: true }
    ).populate('customer_id', 'name phone_number');

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found or unauthorized'
      });
    }

    // Clear cache
    await deleteCachePattern(`orders:*`);

    res.status(200).json({
      status: 'success',
      message: 'Order status updated successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Update Order Status Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const filter = { _id: orderId };

    // Customers can cancel their own orders
    if (req.user.role === 'customer') {
      filter.customer_id = req.user._id;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to cancel order'
      });
    }

    const order = await Order.findOne(filter);
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled
    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Order cannot be cancelled'
      });
    }

    order.status = 'cancelled';
    await order.save();

    // Clear cache
    await deleteCachePattern(`orders:*`);

    res.status(200).json({
      status: 'success',
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Cancel Order Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

const getOrderStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'mom') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    const matchFilter = {};
    if (req.user.role === 'mom') {
      matchFilter.mom_id = req.user._id;
    }

    const stats = await Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total_amount' }
        }
      }
    ]);

    const totalOrders = await Order.countDocuments(matchFilter);
    const totalRevenue = await Order.aggregate([
      { $match: { ...matchFilter, status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get Order Stats Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats
};