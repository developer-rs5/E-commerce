import Order from "../models/Order.js";
import Product from "../models/Product.js";
import asyncHandler from "express-async-handler";
import { createRazorpayOrder, verifyPayment } from "../utils/razorpay.js";

// Debug logger with environment check
const debugLog = (message, data = null) => {
  if (process.env.NODE_ENV !== 'production') {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[${timestamp}] DEBUG: ${message}`, JSON.stringify(data, null, 2));
    } else {
      console.log(`[${timestamp}] DEBUG: ${message}`);
    }
  }
};

// ==================== PRODUCT CONTROLLERS ====================

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const pageSize = Number(req.query.pageSize) || 10;
  const page = Number(req.query.pageNumber) || 1;
  
  const keyword = req.query.keyword 
    ? { 
        name: { 
          $regex: req.query.keyword, 
          $options: 'i' 
        } 
      } 
    : {};

  const count = await Product.countDocuments({ ...keyword });
  const products = await Product.find({ ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    products,
    page,
    pages: Math.ceil(count / pageSize),
    count
  });
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const { 
    name, 
    price, 
    description, 
    image, 
    images, 
    brand, 
    category, 
    countInStock,
    tags,
    sizes,
    colors,
    customAttributes
  } = req.body;

  const product = new Product({
    user: req.user._id,
    name,
    price,
    description,
    image,
    images: images || [],
    brand,
    category,
    countInStock,
    tags: tags || [],
    sizes: sizes || [],
    colors: colors || [],
    customAttributes: customAttributes || {}
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

// @desc    Get random products
// @route   GET /api/products/random
// @access  Public
const getRandomProducts = asyncHandler(async (req, res) => {
  const total = await Product.countDocuments();

  if (total === 0) {
    res.json([]);
    return;
  }

  const products = await Product.aggregate([
    { $sample: { size: Math.min(5, total) } },
    {
      $project: {
        name: 1,
        price: 1,
        image: 1,
        brand: 1,
        category: 1,
        countInStock: 1,
      },
    },
  ]);

  res.json(products);
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const { 
    name, 
    price, 
    description, 
    image, 
    images, 
    brand, 
    category, 
    countInStock,
    tags,
    sizes,
    colors,
    customAttributes
  } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    product.name = name || product.name;
    product.price = price || product.price;
    product.description = description || product.description;
    product.image = image || product.image;
    product.images = images || product.images;
    product.brand = brand || product.brand;
    product.category = category || product.category;
    product.countInStock = countInStock || product.countInStock;
    product.tags = tags || product.tags;
    product.sizes = sizes || product.sizes;
    product.colors = colors || product.colors;
    product.customAttributes = customAttributes || product.customAttributes;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    await product.remove();
    res.json({ message: "Product removed" });
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc    Create product review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      res.status(400);
      throw new Error("Product already reviewed");
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: "Review added" });
  } else {
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc    Get top rated products
// @route   GET /api/products/top
// @access  Public
const getTopProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({}).sort({ rating: -1 }).limit(3);
  res.json(products);
});

// @desc    Create checkout for a single product
// @route   POST /api/products/:id/checkout
// @access  Private
// @access  Private
const createProductCheckout = asyncHandler(async (req, res) => {
  try {
    const { quantity = 1, paymentMethod, shippingAddress } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    // Validate shipping address
    if (!shippingAddress || 
        !shippingAddress.address || 
        !shippingAddress.city || 
        !shippingAddress.postalCode || 
        !shippingAddress.country) {
      res.status(400);
      throw new Error("Please provide complete shipping address");
    }

    if (product.countInStock < quantity) {
      res.status(400);
      throw new Error("Insufficient stock");
    }

    const totalPrice = product.price * quantity;
    const taxPrice = Number((totalPrice * 0.15).toFixed(2));
    const shippingPrice = Number((totalPrice > 1000 ? 0 : 50).toFixed(2));
    const itemsPrice = Number(totalPrice.toFixed(2));

    const order = new Order({
      orderItems: [{
        name: product.name,
        qty: quantity,
        image: product.image,
        price: product.price,
        product: product._id
      }],
      user: req.user._id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice: itemsPrice + taxPrice + shippingPrice,
      status: 'pending'
    });

    if (paymentMethod === "Razorpay") {
      const razorpayOrder = await createRazorpayOrder(order.totalPrice);
      order.razorpayOrderId = razorpayOrder.id;
    }

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);

  } catch (error) {
    res.status(400).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ==================== ORDER CONTROLLERS ====================

// @desc    Create new order
const addOrderItems = asyncHandler(async (req, res) => {
  try {
    const { orderItems, paymentMethod, shippingAddress } = req.body;

    // Validate required fields
    if (!orderItems || orderItems.length === 0) {
      res.status(400);
      throw new Error("No order items");
    }

    if (!shippingAddress || 
        !shippingAddress.address || 
        !shippingAddress.city || 
        !shippingAddress.postalCode) {
      res.status(400);
      throw new Error("Please provide complete shipping address");
    }

    const order = new Order({
      orderItems: orderItems.map(item => ({
        ...item,
        product: item._id
      })),
      user: req.user._id,
      shippingAddress,
      paymentMethod,
      itemsPrice: req.body.itemsPrice,
      taxPrice: req.body.taxPrice,
      shippingPrice: req.body.shippingPrice,
      totalPrice: req.body.totalPrice,
      status: 'pending'
    });

    if (paymentMethod === "Razorpay") {
      const razorpayOrder = await createRazorpayOrder(req.body.totalPrice);
      order.razorpayOrderId = razorpayOrder.id;
    }

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);

  } catch (error) {
    res.status(400).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @desc    Get order by ID
const getOrderById = asyncHandler(async (req, res) => {
  try {
    debugLog('Fetching order by ID', { orderId: req.params.id });

    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("orderItems.product", "name image price");

    if (!order) {
      debugLog('Order not found', { orderId: req.params.id });
      res.status(404);
      throw new Error("Order not found");
    }

    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      debugLog('Authorization failed', {
        requestedBy: req.user._id,
        orderOwner: order.user._id
      });
      res.status(403);
      throw new Error("Not authorized to view this order");
    }

    debugLog('Order retrieved successfully', {
      orderId: order._id,
      status: order.status
    });

    res.json({
      _id: order._id,
      user: order.user,
      orderItems: order.orderItems,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      status: order.status,
      itemsPrice: order.itemsPrice,
      taxPrice: order.taxPrice,
      shippingPrice: order.shippingPrice,
      totalPrice: order.totalPrice,
      isPaid: order.isPaid,
      paidAt: order.paidAt,
      isDelivered: order.isDelivered,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt
    });

  } catch (error) {
    debugLog('Error in getOrderById', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
});

// @desc    Update order to paid
const updateOrderToPaid = asyncHandler(async (req, res) => {
  try {
    debugLog('Updating order to paid', { orderId: req.params.id });

    const order = await Order.findById(req.params.id);
    if (!order) {
      debugLog('Order not found for payment update');
      res.status(404);
      throw new Error("Order not found");
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.payer?.email_address,
    };
    order.status = "processing";

    const updatedOrder = await order.save();
    debugLog('Order payment status updated', {
      orderId: updatedOrder._id,
      status: updatedOrder.status
    });

    res.json({
      _id: updatedOrder._id,
      status: updatedOrder.status,
      isPaid: updatedOrder.isPaid,
      paidAt: updatedOrder.paidAt
    });

  } catch (error) {
    debugLog('Error in updateOrderToPaid', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
});

// @desc    Verify Razorpay payment
const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    if (order.user.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Not authorized");
    }

    if (order.paymentMethod !== "Razorpay") {
      res.status(400);
      throw new Error("Invalid payment method");
    }

    if (order.isPaid) {
      res.status(400);
      throw new Error("Order already paid");
    }

    const isValid = verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      res.status(400);
      throw new Error("Invalid payment signature");
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    };
    order.status = "processing";

    const updatedOrder = await order.save();
    res.json(updatedOrder);

  } catch (error) {
    res.status(400).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// @desc    Get logged in user orders
const getMyOrders = asyncHandler(async (req, res) => {
  try {
    debugLog('Fetching user orders', { userId: req.user._id });
    const orders = await Order.find({ user: req.user._id });
    debugLog('User orders retrieved', { count: orders.length });
    res.json(orders);
  } catch (error) {
    debugLog('Error in getMyOrders', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
});

// @desc    Get all orders (Admin)
const getOrders = asyncHandler(async (req, res) => {
  try {
    debugLog('Admin fetching all orders');
    const orders = await Order.find({}).populate("user", "id name");
    debugLog('All orders retrieved', { count: orders.length });
    res.json(orders);
  } catch (error) {
    debugLog('Error in getOrders', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
});

// @desc    Update order to delivered (Admin)
const updateOrderToDelivered = asyncHandler(async (req, res) => {
  try {
    debugLog('Updating order to delivered', { orderId: req.params.id });

    const order = await Order.findById(req.params.id);
    if (!order) {
      debugLog('Order not found for delivery update');
      res.status(404);
      throw new Error("Order not found");
    }

    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = "delivered";

    const updatedOrder = await order.save();
    debugLog('Order delivery status updated', {
      orderId: updatedOrder._id,
      status: updatedOrder.status
    });

    res.json({
      _id: updatedOrder._id,
      status: updatedOrder.status,
      isDelivered: updatedOrder.isDelivered,
      deliveredAt: updatedOrder.deliveredAt
    });

  } catch (error) {
    debugLog('Error in updateOrderToDelivered', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
});

// @desc    Update order status (Admin)
const updateOrderStatus = asyncHandler(async (req, res) => {
  try {
    const { status } = req.body;
    debugLog('Updating order status', {
      orderId: req.params.id,
      newStatus: status
    });

    const order = await Order.findById(req.params.id);
    if (!order) {
      debugLog('Order not found for status update');
      res.status(404);
      throw new Error("Order not found");
    }

    order.status = status;
    if (status === "delivered") {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();
    debugLog('Order status updated', {
      orderId: updatedOrder._id,
      newStatus: updatedOrder.status
    });

    res.json({
      _id: updatedOrder._id,
      status: updatedOrder.status,
      isDelivered: updatedOrder.isDelivered,
      deliveredAt: updatedOrder.deliveredAt
    });

  } catch (error) {
    debugLog('Error in updateOrderStatus', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
});


export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  getTopProducts,
  getRandomProducts,
};