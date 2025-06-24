import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("⏳ Logging in...");
    try {
      await axios.post(`${API}/api/auth/login`, form, {
        withCredentials: true,
      });
      setMessage("✅ Login successful!");
      setTimeout(() => {
        navigate("/"); // Redirect to home
      }, 1000);
    } catch (err) {
      setMessage(err.response?.data?.message || "❌ Login failed.");
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Welcome Back</h2>
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

        <button type="submit">Login</button>

        <div className="or-divider">OR</div>

        <button
          type="button"
          className="google-btn"
          onClick={() => alert("🔐 Google Login not implemented yet.")}
        >
          <img
            src="https://img.icons8.com/color/16/000000/google-logo.png"
            alt="G"
          />
          Login with Google
        </button>

        <div className="redirects">
          <Link to="/signup">Don’t have an account? <strong>Signup</strong></Link>
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
}

export default Login;
