const stripe = require('../config/stripe');
const Order = require('../models/Order')
const Payment = require('../models/payment');


const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody, // must use rawBody, not JSON-parsed
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const orderIds = paymentIntent.metadata.orderIds?.split(',') || [];

      // ✅ Update all related orders
      await Order.updateMany(
        { _id: { $in: orderIds } },
        { $set: { payment_status: 'paid', status: 'confirmed' } }
      );

      // ✅ Record Payment
      await Payment.create({
        order_id: null,
        customer_id: paymentIntent.metadata.userId,
        amount: paymentIntent.amount / 100,
        method: paymentIntent.payment_method_types[0],
        status: 'success',
        provider_payment_id: paymentIntent.id,
      });

      console.log('✅ Payment verified via webhook:', paymentIntent.id);
      break;
    }

    case 'payment_intent.payment_failed': {
      console.log('❌ Payment failed:', event.data.object.id);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};

const verifyPayment = async (req, res) => {
  try {
    const { payment_intent_id } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({ success: false, message: "Missing payment_intent_id" });
    }

    // ✅ Fetch payment intent details directly from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status === "succeeded") {
      const updateResult = await Order.updateMany(
        { stripe_payment_intent_id: paymentIntent.id },
        { $set: { payment_status: "paid", status: "confirmed" } }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "No orders found for this payment",
        });
      }

      // Create payment record
      await Payment.create({
        customer_id: req.user._id,
        amount: paymentIntent.amount / 100,
        method: paymentIntent.payment_method_types[0],
        status: "success",
        provider_payment_id: paymentIntent.id,
      });

      return res.json({ success: true, message: "Payment verified and order confirmed" });
    } else {
      return res.json({ success: false, message: "Payment not successful yet" });
    }
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({ success: false, message: "Verification failed" });
  }
};

const failPayment = async (req, res) => {
  try {
    const { payment_intent_id } = req.body;
    if (!payment_intent_id)
      return res.status(400).json({ success: false, message: "Missing payment_intent_id" });

    const orders = await Order.find({ stripe_payment_intent_id: payment_intent_id })
      .populate("menu_id");

    if (!orders || orders.length === 0)
      return res.status(404).json({ success: false, message: "No orders found for this payment" });

    // 🔁 Restore availability
    for (const order of orders) {
      const menu = order.menu_id;
      if (menu) {
        menu.max_orders = (menu.max_orders || 0) + (order.quantity || 1);
        await menu.save();
      }
    }

    // ❌ Mark orders as cancelled
    await Order.updateMany(
      { stripe_payment_intent_id: payment_intent_id },
      { $set: { status: "cancelled", payment_status: "failed" } }
    );

    console.log("🛑 Orders cancelled and stock restored for:", payment_intent_id);
    res.json({ success: true, message: "Orders cancelled & menu stock restored" });

  } catch (error) {
    console.error("Fail Payment Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};



module.exports = {
  handleStripeWebhook,
  verifyPayment,
  failPayment
};