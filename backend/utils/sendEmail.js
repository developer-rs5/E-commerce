import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const sendEmail = async (options) => {
  try {
    // Validate inputs
    if (!options.to) throw new Error("Email address is required");
    if (!options.subject) throw new Error("Email subject is required");
    if (!options.html) throw new Error("Email content is required");

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Send email
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || "Your App"}" <${process.env.EMAIL_FROM || "no-reply@example.com"}>`,
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${options.to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("❌ Email sending error:", error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export default sendEmail;