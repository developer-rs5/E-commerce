import User from "../models/User.js";
import asyncHandler from "express-async-handler";
import generateToken from "../utils/generateToken.js";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import dotenv from "dotenv";
import sendEmail from "../utils/sendEmail.js";

dotenv.config();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper function to send verification email
const sendVerificationMail = async (email, token) => {
  try {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    const verificationCode = token.slice(0, 6).toUpperCase();
    
    // Improved email content
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2c3e50;">Welcome to Our Store!</h1>
          <div style="height: 4px; width: 50px; background: #3498db; margin: 10px auto;"></div>
        </div>
        
        <p>Thank you for creating an account! To complete your registration, please verify your email address:</p>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0;">Your Verification Code</h3>
          <div style="
            display: inline-block;
            padding: 12px 24px;
            background: #ffffff;
            border-radius: 6px;
            border: 1px dashed #3498db;
            font-size: 28px;
            letter-spacing: 3px;
            font-weight: bold;
            color: #2c3e50;
          ">
            ${verificationCode}
          </div>
          <p style="margin-top: 15px; margin-bottom: 5px; font-size: 14px; color: #7f8c8d;">
            Enter this code on our website to verify your email
          </p>
        </div>
        
        <p style="text-align: center; margin: 25px 0; font-weight: bold; color: #7f8c8d;">
          OR
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="
            display: inline-block;
            padding: 14px 28px;
            background: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
            transition: all 0.3s;
          ">
            Verify Email Address
          </a>
          <p style="margin-top: 10px; font-size: 14px; color: #7f8c8d;">
            Click the button to verify instantly
          </p>
        </div>
        
        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; font-size: 14px; color: #7f8c8d;">
          <p>This verification link will expire in 24 hours.</p>
          <p>If you didn't create an account with us, please ignore this email.</p>
          <p style="margin-top: 20px;">Happy Shopping!<br>The Store Team</p>
        </div>
      </div>
    `;
    
    // Send using the generic email utility
    await sendEmail({
      to: email,
      subject: "Verify Your Email Address",
      html: html
    });
    
    console.log(`✅ Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};
// @desc    Register new user with email verification
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // DEBUG: Log registration attempt
  console.log(`[registerUser] Registration attempt for: ${email}`);

  // Validate input
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email and password");
  }

  // Check if user exists
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    if (existingUser.isVerified) {
      res.status(400).json({message:"User alrody exists with this email"});
      throw new Error("User already exists with this email");
    } else {
      try {
        // Generate new verification token
        const verificationToken = crypto.randomBytes(20).toString("hex");
        console.log(`🔑 Generated token for existing user: ${verificationToken}`);
        
        // Update existing user with new token
        existingUser.verificationToken = crypto
          .createHash("sha256")
          .update(verificationToken)
          .digest("hex");
        existingUser.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
        await existingUser.save();

        console.log(`📤 Sending verification email to ${email}`);
        // Send verification email
        await sendVerificationMail(email, verificationToken);
        
        return res.status(200).json({
          success: true,
          message: "Verification email resent",
          email: email
        });
      } catch (error) {
        console.error("❌ Resend verification error:", error.message);
        res.status(500);
        throw new Error(error.message || "Failed to resend verification email");
      }
    }
  }

  try {
   
    const verificationToken = crypto.randomBytes(20).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");
    
    const user = await User.create({
      name,
      email,
      password,
      verificationToken: hashedToken, 
      verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000
    });

    console.log(`🔑 Generated token for new user: ${verificationToken}`);
    console.log(`📤 Sending verification email to ${email}`);
    await sendVerificationMail(email, verificationToken);
    
    res.status(201).json({
      success: true,
      message: "Verification email sent successfully",
      email: user.email
    });
  } catch (error) {
    console.error("❌ Registration error:", error.message);
    res.status(500);
    throw new Error(error.message || "Registration failed. Please try again.");
  }
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token, email } = req.body;

  if (!token) {
    res.status(400);
    throw new Error("Verification token is required");
  }

  // Find user by email if provided
  let user = null;
  if (email) {
    user = await User.findOne({ email, isVerified: false });
  }

  // If we don't have user by email, try to find by token
  if (!user) {
    // Try to find by full token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: Date.now() }
    });
  }

  // If we still don't have user, try to find by verification code
  if (!user && token.length === 6) {
    // Try to find by email and code
    if (!email) {
      res.status(400);
      throw new Error("Email is required when using verification code");
    }

    user = await User.findOne({ 
      email, 
      isVerified: false,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (user) {
      // Create a regex pattern to match the hashed code
      const hashedCode = crypto
        .createHash("sha256")
        .update(token.toUpperCase())
        .digest("hex");

      // Check if the stored token starts with the hashed code
      if (!user.verificationToken.startsWith(hashedCode)) {
        user = null;
      }
    }
  }

  if (!user) {
    // Check if user is already verified
    const verifiedUser = await User.findOne({ 
      email: email || req.body.email,
      isVerified: true 
    });
    
    if (verifiedUser) {
      return res.status(400).json({
        message: "Email is already verified. Please login."
      });
    }

    res.status(400);
    throw new Error("Invalid or expired verification token");
  }

  // Mark user as verified
  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  // Generate JWT token
  generateToken(res, user._id);

  res.status(200).json({
    success: true,
    message: "Email verified successfully",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin
    }
  });
});
// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  // Check if user exists and is verified
  if (!user || !user.isVerified) {
    res.status(401);
    throw new Error("Invalid email or account not verified");
  }

  if (await user.matchPassword(password)) {
    const token = generateToken(res, user._id);

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token,
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// @desc    Google authentication
// @route   POST /api/auth/google
// @access  Public
const googleAuth = asyncHandler(async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ 
      $or: [
        { email },
        { googleId }
      ]
    });

    if (!user) {
      // Create new user if doesn't exist
      user = await User.create({
        name,
        email,
        googleId,
        avatar: picture,
        isVerified: true,
        password: crypto.randomBytes(16).toString("hex"),
      });
    } else if (!user.googleId) {
      // Link existing email user with Google ID
      user.googleId = googleId;
      user.avatar = picture;
      user.isVerified = true;
      await user.save();
    }

    generateToken(res, user._id);

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      avatar: user.avatar,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ message: 'Invalid or expired Google token' });
  }
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email, isVerified: true });

  if (!user) {
    res.status(404);
    throw new Error("User not found or not verified");
  }

  // Generate reset token
  const resetToken = user.generatePasswordResetToken();
  await user.save();

  // Send email
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const message = `
    <h1>Password Reset</h1>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
    <p>This link will expire in 10 minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: message,
    });

    res.status(200).json({
      message: "Password reset email sent",
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(500);
    throw new Error("Email could not be sent");
  }
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired token");
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.status(200).json({
    message: "Password reset successful",
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({ message: "Logged out successfully" });
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      avatar: user.avatar,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});


const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    
    if (req.body.avatar) {
      user.avatar = req.body.avatar;
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      avatar: updatedUser.avatar,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Get all users
// @route   GET /api/auth
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.json(users);
});


const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});


const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    if (user.isAdmin) {
      res.status(400);
      throw new Error("Cannot delete admin user");
    }
    await user.remove();
    res.json({ message: "User removed" });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.isAdmin = Boolean(req.body.isAdmin);

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

export {
  registerUser,
  verifyEmail,
  authUser,
  googleAuth,
  forgotPassword,
  resetPassword,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  getUserById,
  deleteUser,
  updateUser,
};