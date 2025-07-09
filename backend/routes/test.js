import express from "express";
import sendVerificationEmail from "../utils/sendEmail.js";

const router = express.Router();

// Test email route
router.get("/test-email", async (req, res) => {
  try {
    const testToken = "testtoken1234567890abcdef";
    await sendVerificationEmail("test@example.com", testToken);
    res.send("Test email sent successfully");
  } catch (error) {
    res.status(500).send(`Error sending test email: ${error.message}`);
  }
});

export default router;