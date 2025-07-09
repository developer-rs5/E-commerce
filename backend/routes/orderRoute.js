import express from 'express';
import {
  getCheckoutData,
  createCheckoutOrder,
  createOrder,
  verifyPayment,
  getOrderById,
  getMyOrders,
  getOrders,
  updateOrderToDelivered,
  updateOrderStatus
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Checkout route - now using query parameter
router.get('/checkout', protect, getCheckoutData);

router.post('/checkout', protect, createCheckoutOrder);

// Order processing routes
router.route('/')
  .post(protect, createOrder)
  .get(protect, admin, getOrders);

router.get('/myorders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.post('/:id/verify', protect, verifyPayment);

// Admin routes
router.put('/:id/deliver', protect, admin, updateOrderToDelivered);
router.put('/:id/status', protect, admin, updateOrderStatus);

export default router;