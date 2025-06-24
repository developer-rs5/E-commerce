import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "./models/Order.js"; // adjust if your path is different

dotenv.config();

// Replace with your MongoDB URI
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/your-db-name";

const deleteOrdersByIds = async (ids) => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const result = await Order.deleteMany({ _id: { $in: ids } });
    console.log("Deleted orders:", result.deletedCount);
  } catch (error) {
    console.error("Error deleting orders:", error);
  } finally {
    await mongoose.disconnect();
  }
};

deleteOrdersByIds([
  "6856b41862e2bb1d9c32718d", // replace with real IDs
  "6856b01a62e2bb1d9c32716d",
]);
