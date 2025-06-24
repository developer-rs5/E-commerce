import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import "./Header.css";

function Header() {
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("/api/auth/user");
        setUser(res.data);
      } catch {
        setUser(null);
      }
    };
    fetchUser();
  }, []);

  const logout = async () => {
    await axios.get("/api/auth/logout");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <header className="site-header">
      <div className="logo">🛒 ShopX</div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/products">Products</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
      </nav>
      <div className="user-section">
        {user ? (
          <div className="profile" onClick={() => setShowDropdown(!showDropdown)}>
            <img src={`https://ui-avatars.com/api/?name=${user.name}`} alt="User" />
            {showDropdown && (
              <div className="dropdown">
                <p>{user.name}</p>
                <p>{user.email}</p>
                <button onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        ) : (
          <div className="auth-links">
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
