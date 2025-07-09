import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
    },
    image: {  // Main image
      type: String,
      required: true,
    },
    images: {  // Additional images
      type: [String],
      default: []
    },
    brand: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    countInStock: {
      type: Number,
      required: true,
      default: 0,
    },
    tags: {
      type: [String],
      default: []
    },
    sizes: {
      type: [String],
      default: []
    },
    colors: {
      type: [String],
      default: []
    },
    customAttributes: {
      type: Map,
      of: String,
      default: {}
    }
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;