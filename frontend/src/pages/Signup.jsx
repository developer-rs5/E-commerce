import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import "./Auth.css";

const API = "http://localhost:8000";

function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [verificationData, setVerificationData] = useState({
    show: false,
    token: "",
    email: "",
  });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("⏳ Creating account...");
    
    try {
      // CORRECTED ENDPOINT: Changed from /api/auth to /api/auth/register
      const response = await axios.post(`${API}/api/auth/register`, form);
      
      setMessage("📬 Verification email sent. Please check your inbox.");
      setVerificationData({
        show: true,
        email: form.email,
        token: "",
      });
    } catch (err) {
      setMessage(err.response?.data?.message || "❌ Registration failed.");
    }
  };

const handleVerify = async (e) => {
  e.preventDefault();
  setMessage("⏳ Verifying...");
  
  try {
    await axios.post(`${API}/api/auth/verify-email`, {
      token: verificationData.token,
      email: verificationData.email // Make sure to include email
    });
    
    setMessage("✅ Email verified successfully! Redirecting...");
    setTimeout(() => navigate("/"), 1500);
  } catch (err) {
    setMessage(err.response?.data?.message || "❌ Verification failed.");
  }
};

  const handleGoogleSuccess = async (credentialResponse) => {
    setMessage("⏳ Signing up with Google...");
    try {
      const response = await axios.post(`${API}/api/auth/google`, {
        token: credentialResponse.credential,
      });
      
      setMessage("✅ Google signup successful! Redirecting...");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "❌ Google signup failed.");
    }
  };

  const handleGoogleError = () => {
    setMessage("❌ Google signup failed. Please try again.");
  };

  return (
    <GoogleOAuthProvider clientId={"580409136064-2im434bfcp8rfvhg60j6vctcdtnukhc8.apps.googleusercontent.com"}>
      <div className="auth-container">
        <form 
          className="auth-form" 
          onSubmit={verificationData.show ? handleVerify : handleSubmit}
        >
          <h2>Create Account</h2>
          
          {!verificationData.show ? (
            <>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                onChange={handleChange}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                onChange={handleChange}
                required
                minLength="6"
              />
            </>
          ) : (
            <>
              <p>We sent a verification email to {verificationData.email}</p>
              <p>Please enter the verification token from your email:</p>
              <input
                type="text"
                placeholder="Verification Token"
                value={verificationData.token}
                onChange={(e) => setVerificationData({
                  ...verificationData,
                  token: e.target.value
                })}
                required
              />
            </>
          )}

          <button type="submit">
            {verificationData.show ? "Verify Email" : "Sign Up"}
          </button>

          {!verificationData.show && (
            <>
              <div className="or-divider">OR</div>

              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text="signup_with"
                shape="rectangular"
                size="large"
                width="100%"
              />
            </>
          )}

          <div className="redirects">
            <Link to="/login">
              Already have an account? <strong>Login</strong>
            </Link>
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          {message && <p className="message">{message}</p>}
        </form>
      </div>
    </GoogleOAuthProvider>
  );
}

export default Signup;