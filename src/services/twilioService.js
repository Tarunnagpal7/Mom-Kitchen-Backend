const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendOTP = async (phoneNumber, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your Mom's Kitchen OTP is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    console.error("Twilio Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

const sendDeliverySMS = async (order, trackingUrl) => {
  try {
    const smsText = `
          Namaste 🙏 ,${order.customer_id.name}
          Your Mom's Kitchen order is on the way! 🚚🍱
          

          Order ID: ${order._id}
          Item: ${order.menu_id.name}
          Mom Chef: ${order.mom_id.name}
          Amount: ₹${order.total_amount}

          Track your delivery live:
          ${trackingUrl}

          Thank you for ordering with Mom's Kitchen ❤️
          `;

    const message = await client.messages.create({
      body: smsText,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: order.customer_id.phone_number,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    console.error("Delivery SMS Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = { sendOTP, sendDeliverySMS };
