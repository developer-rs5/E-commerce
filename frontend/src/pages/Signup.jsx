import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("⏳ Creating account...");
    try {
      await axios.post(`${API}/api/auth/register`, form, {
        withCredentials: true,
      });
      setMessage("🎉 Registration successful!");
      setTimeout(() => {
        navigate("/"); // Redirect to home page
      }, 1000);
    } catch (err) {
      setMessage(err.response?.data?.message || "❌ Registration failed.");
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Create Account</h2>
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
        />

        <button type="submit">Sign Up</button>

        <div className="or-divider">OR</div>

        <button
          type="button"
          className="google-btn"
          onClick={() => alert("🔐 Google Sign Up not implemented yet.")}
        >
          <img
            src="https://img.icons8.com/color/16/000000/google-logo.png"
            alt="G"
          />
          Sign up with Google
        </button>

        <div className="redirects">
          <Link to="/login">Already have an account? <strong>Login</strong></Link>
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
}

export default Signup;
