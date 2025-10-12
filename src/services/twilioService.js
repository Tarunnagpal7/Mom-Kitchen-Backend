const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendOTP = async (phoneNumber, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your Mom's Kitchen OTP is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    return {
      success: true,
      messageId: message.sid
    };
  } catch (error) {
    console.error('Twilio Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = { sendOTP };