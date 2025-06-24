import Razorpay from 'razorpay';
import crypto from 'crypto';
import key from 'dotenv';
key.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Create Razorpay order
 * @param {number} amount - Amount in INR
 * @param {string} receipt - Order receipt identifier
 * @returns {Promise<object>} Razorpay order
 */
export const createRazorpayOrder = async (amount, receipt) => {
  try {
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amount provided');
    }

    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: receipt || `order_${Date.now()}`,
      payment_capture: 1 
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    throw new Error(`Failed to create payment order: ${error.message}`);
  }
};

/**
 * 
 * @param {string} orderId 
 * @param {string} paymentId 
 * @param {string} signature 
 * @returns {boolean} 
 */
export const verifyPayment = (orderId, paymentId, signature) => {
  try {
    if (!orderId || !paymentId || !signature) {
      throw new Error('Missing payment verification parameters');
    }

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest('hex');

    const isValid = generatedSignature === signature;
    
    if (!isValid) {
      console.error('Payment signature verification failed', {
        orderId,
        paymentId,
        receivedSignature: signature,
        generatedSignature
      });
    }

    return isValid;
  } catch (error) {
    console.error('Payment verification failed:', error);
    throw new Error(`Payment verification failed: ${error.message}`);
  }
};

/**
 * Fetch payment details from Razorpay
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<object>} Payment details
 */
export const fetchPayment = async (paymentId) => {
  try {
    if (!paymentId) {
      throw new Error('Payment ID is required');
    }

    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Failed to fetch payment:', error);
    throw new Error(`Payment lookup failed: ${error.message}`);
  }
};