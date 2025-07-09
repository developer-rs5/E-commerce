import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  getTopProducts,
  getRandomProducts,
} from "../controllers/productController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/random", getRandomProducts);
router.get("/top", getTopProducts);
router.route("/").get(getProducts);
router.route("/:id").get(getProductById);

// Protected routes
router.route("/:id/reviews").post(protect, createProductReview);

// Admin routes
router.route("/").post(protect, admin, createProduct);
router.route("/:id")
  .put(protect, admin, updateProduct)
  .delete(protect, admin, deleteProduct);

export default router;