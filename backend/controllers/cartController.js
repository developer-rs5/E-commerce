import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import asyncHandler from "express-async-handler";

// GET /api/cart
const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate({
    path: "items.product",
    select: "name image price countInStock sizes colors",
  });

  if (!cart) return res.status(200).json({ items: [], totalPrice: 0 });

  const verifiedItems = await Promise.all(cart.items.map(async (item) => {
    const product = item.product;
    if (!product) return null;

    const validSize = !product.sizes?.length || product.sizes.includes(item.selectedSize);
    const validColor = !product.colors?.length || product.colors.includes(item.selectedColor);

    return validSize && validColor ? item : null;
  }));

  const validItems = verifiedItems.filter(item => item !== null);
  if (validItems.length !== cart.items.length) {
    cart.items = validItems;
    cart.totalPrice = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    await cart.save();
  }

  res.json(cart);
});

// POST /api/cart
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity, selectedSize, selectedColor } = req.body;
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");
  if (product.countInStock < quantity) throw new Error("Not enough stock available");

  if (product.sizes?.length > 0 && !selectedSize) throw new Error("Size required");
  if (product.colors?.length > 0 && !selectedColor) throw new Error("Color required");
  if (selectedSize && !product.sizes.includes(selectedSize)) throw new Error("Invalid size");
  if (selectedColor && !product.colors.includes(selectedColor)) throw new Error("Invalid color");

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = new Cart({ user: req.user._id, items: [] });

  const index = cart.items.findIndex(
    i => i.product.toString() === productId &&
         i.selectedSize === selectedSize &&
         i.selectedColor === selectedColor
  );

  if (index > -1) {
    const newQty = cart.items[index].quantity + quantity;
    if (newQty > product.countInStock) throw new Error("Not enough stock");
    cart.items[index].quantity = newQty;
  } else {
    cart.items.push({ product: productId, quantity, price: product.price, selectedSize, selectedColor });
  }

  cart.totalPrice = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  await cart.save();
  res.status(201).json(cart);
});

// PUT /api/cart/:itemId
const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity, selectedSize, selectedColor } = req.body;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new Error("Cart not found");

  const index = cart.items.findIndex(i => i._id.toString() === itemId);
  if (index === -1) throw new Error("Item not found");

  const item = cart.items[index];
  const product = await Product.findById(item.product);

  if (quantity < 1 || product.countInStock < quantity) throw new Error("Invalid quantity");
  if (selectedSize && !product.sizes.includes(selectedSize)) throw new Error("Invalid size");
  if (selectedColor && !product.colors.includes(selectedColor)) throw new Error("Invalid color");

  item.quantity = quantity;
  if (selectedSize) item.selectedSize = selectedSize;
  if (selectedColor) item.selectedColor = selectedColor;

  cart.totalPrice = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  await cart.save();
  res.json(cart);
});

// DELETE /api/cart/:itemId
const removeFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw new Error("Cart not found");

  cart.items = cart.items.filter(i => i._id.toString() !== itemId);
  cart.totalPrice = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  await cart.save();
  res.json(cart);
});

// DELETE /api/cart
const clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndDelete({ user: req.user._id });
  res.json({ message: "Cart cleared" });
});

export {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};
