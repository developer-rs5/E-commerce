import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { createRazorpayOrder, verifyPayment as verifyRazorpayPayment } from '../utils/razorpay.js';

// @desc    Get checkout data
// @route   GET /api/orders/checkout/:productId?
// @access  Private
export const getCheckoutData = async (req, res) => {
  try {
    const { productId, cart: cartString } = req.query;

    if (productId) {
      // Handle product checkout
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Calculate prices for single product
      const itemsPrice = product.price;
      const taxPrice = itemsPrice * 0.15;
      const shippingPrice = itemsPrice > 1000 ? 0 : 50;
      const totalPrice = itemsPrice + taxPrice + shippingPrice;

      return res.json({
        success: true,
        data: {
          items: [{
            product: product._id,
            name: product.name,
            price: product.price,
            image: product.image,
            qty: 1
          }],
          subtotal: itemsPrice,
          tax: taxPrice,
          shipping: shippingPrice,
          total: totalPrice,
          shippingAddress: req.user.shippingAddress || {
            address: '',
            city: '',
            postalCode: '',
            country: 'India'
          }
        }
      });
    } else {
      // Handle cart checkout
      const cart = cartString ? JSON.parse(cartString) : { items: [] };
      
      if (cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty'
        });
      }

      // Validate cart items
      if (!cart.items || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Your cart is empty'
        });
      }

      // Verify all products exist and get current prices
      const itemsWithPrices = await Promise.all(cart.items.map(async (item) => {
        const product = await Product.findById(item.product);
        if (!product) {
          throw new Error(`Product ${item.product} not found`);
        }
        if (product.countInStock < item.qty) {
          throw new Error(`Not enough stock for ${product.name}`);
        }
        return {
          ...item,
          price: product.price,
          name: product.name,
          image: product.image
        };
      }));

      const itemsPrice = itemsWithPrices.reduce(
        (sum, item) => sum + (item.price * item.qty), 
        0
      );
      const taxPrice = Number((itemsPrice * 0.15).toFixed(2));
      const shippingPrice = Number((itemsPrice > 1000 ? 0 : 50).toFixed(2));
      const totalPrice = Number((itemsPrice + taxPrice + shippingPrice).toFixed(2));

      return res.json({
        success: true,
        data: {
          items: itemsWithPrices,
          subtotal: itemsPrice,
          tax: taxPrice,
          shipping: shippingPrice,
          total: totalPrice,
          shippingAddress: user.shippingAddress || {
            address: '',
            city: '',
            postalCode: '',
            country: 'India'
          }
        }
      });
    }
  } catch (error) {
    console.error('Checkout data error:', error);
    return res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to load checkout data' 
    });
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    const user = req.user;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No order items'
      });
    }

    // Validate shipping address
    if (!shippingAddress?.address || !shippingAddress?.city || !shippingAddress?.postalCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide complete shipping address'
      });
    }

    // Verify all products exist and get current prices
    const itemsWithPrices = await Promise.all(items.map(async (item) => {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product ${item.product} not found`);
      }
      if (product.countInStock < item.qty) {
        throw new Error(`Not enough stock for ${product.name}`);
      }
      return {
        ...item,
        price: product.price,
        name: product.name,
        image: product.image
      };
    }));

    const itemsPrice = itemsWithPrices.reduce(
      (sum, item) => sum + (item.price * item.qty),
      0
    );
    const taxPrice = Number((itemsPrice * 0.15).toFixed(2));
    const shippingPrice = Number((itemsPrice > 1000 ? 0 : 50).toFixed(2));
    const totalPrice = Number((itemsPrice + taxPrice + shippingPrice).toFixed(2));

    const order = new Order({
      user: user._id,
      orderItems: itemsWithPrices,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      status: 'pending'
    });

    if (paymentMethod === 'razorpay') {
      const razorpayOrder = await createRazorpayOrder(totalPrice, order._id.toString());
      order.razorpayOrderId = razorpayOrder.id;
    }

    const savedOrder = await order.save();
    
    // Update product stock
    await Promise.all(itemsWithPrices.map(async (item) => {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { countInStock: -item.qty }
      });
    }));

    return res.status(201).json({
      success: true,
      data: savedOrder
    });

  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/orders/:id/verify
// @access  Private
export const verifyPayment = async (req, res) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to verify this payment'
      });
    }

    if (order.isPaid) {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid'
      });
    }

    if (order.paymentMethod !== 'razorpay') {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method'
      });
    }

    if (order.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Razorpay order ID'
      });
    }

    const isValid = verifyRazorpayPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature
    };
    order.status = 'processing';

    const updatedOrder = await order.save();

    return res.json({
      success: true,
      data: updatedOrder
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed'
    });
  }
};

export const createCheckoutOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    const user = req.user;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items in order'
      });
    }

    // Calculate prices
    const itemsWithPrices = await Promise.all(items.map(async (item) => {
      const product = await Product.findById(item.product);
      return {
        ...item,
        price: product.price,
        name: product.name,
        image: product.image
      };
    }));

    const subtotal = itemsWithPrices.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = subtotal * 0.15;
    const shipping = subtotal > 1000 ? 0 : 50;
    const total = subtotal + tax + shipping;

    // Create order
    const order = new Order({
      user: user._id,
      orderItems: itemsWithPrices,
      shippingAddress,
      paymentMethod,
      itemsPrice: subtotal,
      taxPrice: tax,
      shippingPrice: shipping,
      totalPrice: total,
      status: 'pending'
    });

    // Handle Razorpay if needed
    if (paymentMethod === 'razorpay') {
      const razorpayOrder = await createRazorpayOrder(total, order._id.toString());
      order.razorpayOrderId = razorpayOrder.id;
    }

    const savedOrder = await order.save();
    
    return res.status(201).json({
      success: true,
      data: savedOrder
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name image price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    return res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get order'
    });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: orders.length,
      data: orders
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get orders'
    });
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'id name')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: orders.length,
      data: orders
    });

  } catch (error) {
    console.error('Get all orders error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get orders'
    });
  }
};

// @desc    Update order to delivered (Admin)
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
export const updateOrderToDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = 'delivered';

    const updatedOrder = await order.save();

    return res.json({
      success: true,
      data: updatedOrder
    });

  } catch (error) {
    console.error('Update order to delivered error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update order status'
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.status = status;

    if (status === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();

    return res.json({
      success: true,
      data: updatedOrder
    });

  } catch (error) {
    console.error('Update order status error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update order status'
    });
  }
};