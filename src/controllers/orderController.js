const mongoose = require("mongoose");
const Order = require("../models/Order");
const Menu = require("../models/Menu");
const Address = require("../models/Address");
const { deleteCachePattern } = require("../utils/cache");
const stripe = require("../config/stripe");
const hypertrack = require("../config/hypertrack");
const Delivery = require("../models/delivery");
const { sendDeliverySMS } = require("../services/twilioService");
// const createOrder = async (req, res) => {
//   try {
//     const { orders, delivery_address_id, special_instructions } = req.body;
//     if (req.user.role !== 'customer') {
//       return res.status(403).json({ status: 'error', message: 'Only customers can place orders' });
//     }

//     const address = await Address.findOne({ _id: delivery_address_id });
//     if (!address) {
//       return res.status(404).json({ status: 'error', message: 'Delivery address not found' });
//     }

//     const results = [];
//     let totalAmounts ;

//     for (const order of orders) {
//       try {
//         const menu = await Menu.findOne({ _id: order.menu_id, active: true }).populate('mom_id');
//         if (!menu) throw new Error('Menu not found or inactive');

//         // const now = new Date();
//         // if (menu.available_from > now || (menu.available_until && menu.available_until < now)) {
//         //   throw new Error('Menu is not available at this time');
//         // }

//         const available = Number(menu.max_orders);
//         const requested = Number(order.items);

//         if (requested > available) {
//           throw new Error(`Only ${available} orders available`);
//         }

//         totalAmounts += menu.total_cost * order.items;

//         const newOrder = await Order.create({
//           customer_id: req.user._id,
//           menu_id: menu._id,
//           mom_id: menu.mom_id._id,
//           total_amount: menu.total_cost * order.items,
//           delivery_address: {
//             address_line: address.address_line,
//             city: address.city,
//             state: address.state,
//             pincode: address.pincode,
//           },
//           special_instructions,
//           estimated_delivery_time: new Date(Date.now() + 60 * 60 * 1000)
//         });

//         // Decrement menu available orders
//         menu.max_orders -= order.items;
//         await menu.save();

//         results.push({ menu_id: order.menu_id, status: 'success', order: newOrder });
//       } catch (err) {
//         results.push({ menu_id: order.menu_id, status: 'error', message: err.message });
//       }
//     }

//     res.status(201).json({ status: 'success', results });
//   } catch (error) {
//     console.error('Create Order Error:', error);
//     res.status(500).json({ status: 'error', message: 'Internal server error' });
//   }
// };

const createOrder = async (req, res) => {
  try {
    const { orders, delivery_address_id, special_instructions } = req.body;

    if (req.user.role !== "customer") {
      return res
        .status(403)
        .json({ status: "error", message: "Only customers can place orders" });
    }

    const address = await Address.findById(delivery_address_id);
    if (!address) {
      return res
        .status(404)
        .json({ status: "error", message: "Delivery address not found" });
    }

    const createdOrders = [];
    let totalAmount = 0;

    // Create DB Orders
    for (const order of orders) {
      const menu = await Menu.findOne({
        _id: order.menu_id,
        active: true,
      }).populate("mom_id");
      if (!menu) throw new Error("Menu not found or inactive");

      const requested = Number(order.items);
      const available = Number(menu.max_orders);
      if (requested > available)
        throw new Error(`Only ${available} orders available`);

      const cost = menu.total_cost * requested;
      totalAmount += cost;

      const newOrder = await Order.create({
        customer_id: req.user._id,
        menu_id: menu._id,
        mom_id: menu.mom_id._id,
        total_amount: cost,
        quantity: requested,
        delivery_address: {
          address_line: address.address_line,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
        },
        special_instructions,
        estimated_delivery_time: new Date(Date.now() + 60 * 60 * 1000),
      });

      menu.max_orders -= requested;
      await menu.save();

      createdOrders.push(newOrder);
    }

    if (createdOrders.length === 0) {
      return res
        .status(400)
        .json({ status: "error", message: "No valid orders created" });
    }

    const deliveryFee = 30;
    const tax = totalAmount * 0.15;
    const total = totalAmount + deliveryFee + tax;

    // ✅ Step 2: Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // amount in paise
      currency: "inr",
      metadata: {
        userId: req.user._id.toString(),
        orderIds: createdOrders.map((o) => o._id.toString()).join(","),
      },
      automatic_payment_methods: { enabled: true },
    });

    // ✅ Step 3: Save paymentIntent ID to orders
    await Order.updateMany(
      { _id: { $in: createdOrders.map((o) => o._id) } },
      { $set: { stripe_payment_intent_id: paymentIntent.id } }
    );

    res.status(201).json({
      status: "success",
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      total_amount: total,
      orders: createdOrders,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};

const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, customer_id, mom_id } = req.query;
    const filter = {};

    // Role-based filtering
    if (req.user.role === "customer") {
      filter.customer_id = req.user._id;
    } else if (req.user.role === "mom") {
      filter.mom_id = req.user._id;
    } else if (req.user.role === "admin") {
      if (customer_id) filter.customer_id = customer_id;
      if (mom_id) filter.mom_id = mom_id;
    }

    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, totalCount] = await Promise.all([
      Order.find(filter)
        .populate("customer_id", "name phone_number")
        .populate("mom_id", "name phone_number")
        .populate({
          path: "menu_id",
          select: "name items description total_cost status  payment_status",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get Orders Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const filter = { _id: orderId };

    // Role-based access control
    if (req.user.role === "customer") {
      filter.customer_id = req.user._id;
    } else if (req.user.role === "mom") {
      filter.mom_id = req.user._id;
    }

    const order = await Order.findOne(filter)
      .populate("customer_id", "name phone_number")
      .populate("mom_id", "name phone_number")
      .populate({
        path: "menu_id",
        populate: {
          path: "items",
          model: "MenuItem",
        },
      });

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: { order },
    });
  } catch (error) {
    console.error("Get Order Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const filter = { _id: orderId };

    // Role-based access control
    if (req.user.role === "mom") {
      filter.mom_id = req.user._id;
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized to update order status",
      });
    }

    // Validate status transitions
    const validStatuses = [
      "pending",
      "confirmed",
      "preparing",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid order status",
      });
    }

    const order = await Order.findOneAndUpdate(
      filter,
      { status },
      { new: true, runValidators: true }
    ).populate("customer_id", "name phone_number");

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found or unauthorized",
      });
    }

    // Clear cache
    await deleteCachePattern(`orders:*`);

    res.status(200).json({
      status: "success",
      message: "Order status updated successfully",
      data: { order },
    });
  } catch (error) {
    console.error("Update Order Status Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const filter = { _id: orderId };
    console.log("filter", filter);

    // Customers can cancel their own orders
    if (req.user.role === "customer") {
      filter.customer_id = req.user._id;
    } else if (req.user.role === "mom") {
      filter.mom_id = req.user._id;
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized to cancel order",
      });
    }

    const order = await Order.findOne(filter);
    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    // Check if order can be cancelled
    if (["delivered", "cancelled"].includes(order.status)) {
      return res.status(400).json({
        status: "error",
        message: "Order cannot be cancelled",
      });
    }

    order.status = "cancelled";
    await order.save();

    // Clear cache
    await deleteCachePattern(`orders:*`);

    res.status(200).json({
      status: "success",
      message: "Order cancelled successfully",
      data: { order },
    });
  } catch (error) {
    console.error("Cancel Order Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const getOrderStats = async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "mom") {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      });
    }

    const matchFilter = {};
    if (req.user.role === "mom") {
      matchFilter.mom_id = req.user._id;
    }

    const aggregateMatch = { ...matchFilter };
    if (aggregateMatch.mom_id) {
      aggregateMatch.mom_id = new mongoose.Types.ObjectId(
        aggregateMatch.mom_id
      );
    }

    const stats = await Order.aggregate([
      { $match: aggregateMatch },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$total_amount" },
        },
      },
    ]);

    const totalOrders = await Order.countDocuments(matchFilter);
    const totalRevenue = await Order.aggregate([
      { $match: { ...aggregateMatch, payment_status: "paid" } },
      { $group: { _id: null, total: { $sum: "$total_amount" } } },
    ]);

    res.status(200).json({
      status: "success",
      data: {
        stats,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Get Order Stats Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const assignDelivery = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId).populate([
      { path: "menu_id" },
      { path: "mom_id" },
      { path: "customer_id", select: "name  phone_number " },
    ]);

    console.log(order);
    if (!order)
      return res
        .status(404)
        .json({ status: "error", message: "Order not found" });

    // 1️⃣ Create a delivery tracking session from HyperTrack
    const tracking = await hypertrack.trips.create({
      device_id: "5E8F5DC4-03BD-4D4E-B115-2C0BABECA775",
      destination: {
        address: {
          line1: order.delivery_address.address_line,
          city: order.delivery_address.city,
          state: order.delivery_address.state,
        },
        geometry: {
          type: "Point",
          coordinates: [73.8567, 18.5204], // customer long/lat
        },
      },
      vehicle_type: "car",
    });

    console.log(tracking);

    // 2️⃣ Save delivery record in DB
    const delivery = await Delivery.create({
      order_id: order._id,
      delivery_partner: "HyperTrack",
      tracking_id: tracking.trip_id,
      delivery_status: "assigned",
      delivery_fee: 30,
      assigned_to: null,
      remarks: "Delivery auto-assigned via HyperTrack",
    });

    await sendDeliverySMS(order, tracking.views.share_url);

    res.json({
      status: "success",
      message: "Delivery assigned successfully",
      delivery,
      tracking_url: tracking.views.share_url,
    });
  } catch (error) {
    console.error("Assign Delivery Error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Could not assign delivery" });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  assignDelivery,
};
