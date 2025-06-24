import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const authResponse = await fetch('http://localhost:8000/api/auth/profile', {
          credentials: 'include'
        });
        
        if (authResponse.ok) {
          const userData = await authResponse.json();
          setIsLoggedIn(true);
          setUser(userData);
          
          const cartResponse = await fetch('http://localhost:8000/api/cart', {
            credentials: 'include'
          });
          if (cartResponse.ok) {
            const cart = await cartResponse.json();
            setCartItems(cart.items?.length || 0);
          }
        }

        const productResponse = await fetch(`http://localhost:8000/api/products/${id}`, {
          credentials: 'include'
        });

        if (!productResponse.ok) {
          throw new Error('Product not found');
        }

        const productData = await productResponse.json();
        setProduct(productData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleLogin = () => navigate('/login', { state: { from: location.pathname } });
  const handleSignup = () => navigate('/signup');
  const handleBack = () => navigate(-1);

  const handleLogout = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setIsLoggedIn(false);
        setUser(null);
        setShowDropdown(false);
        setCartItems(0);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      handleLogin();
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          productId: id, 
          quantity,
          selectedSize: selectedSize || undefined,
          selectedColor: selectedColor || undefined
        })
      });

      if (response.ok) {
        const updatedCart = await response.json();
        setCartItems(updatedCart.items.length);
        alert('Product added to cart!');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleBuyNow = async () => {
    if (!isLoggedIn) {
      handleLogin();
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          productId: id, 
          quantity,
          selectedSize: selectedSize || undefined,
          selectedColor: selectedColor || undefined
        })
      });

      if (response.ok) {
        navigate('/checkout');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  if (loading) {
    return (
      <div className="product-page">
        <header className="header">
          <div className="logo" onClick={() => navigate('/')}>ZENUX STORE</div>
          <div className="nav-links">
            <div className="skeleton-nav"></div>
          </div>
        </header>
        
        <main className="product-main">
          <div className="product-container">
            <div className="product-gallery skeleton-gallery"></div>
            <div className="product-info">
              <div className="skeleton-title"></div>
              <div className="skeleton-text"></div>
              <div className="skeleton-price"></div>
              <div className="skeleton-button"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-page">
        <header className="header">
          <div className="logo" onClick={() => navigate('/')}>ZENUX STORE</div>
          <div className="nav-links">
            <a href="/contact">Contact</a>
            <div className="cart-icon" onClick={() => navigate('/cart')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartItems > 0 && <span className="cart-count">{cartItems}</span>}
            </div>
            {isLoggedIn ? (
              <div className="profile-menu">
                <div className="profile-icon">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt="Profile" />
                  ) : (
                    user?.name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
              </div>
            ) : (
              <>
                <button className="nav-button" onClick={handleSignup}>Sign Up</button>
                <button className="nav-button primary" onClick={handleLogin}>Sign In</button>
              </>
            )}
          </div>
        </header>
        
        <main className="product-main">
          <div className="error-container">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <h3>Error Loading Product</h3>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Try Again</button>
            <button onClick={handleBack}>Back to Products</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="product-page">
      <header className="header">
        <div className="logo" onClick={() => navigate('/')}>ZENUX STORE</div>
        <div className="nav-links">
          <a href="/contact">Contact</a>
          <div className="cart-icon" onClick={() => navigate('/cart')}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartItems > 0 && <span className="cart-count">{cartItems}</span>}
          </div>
          {isLoggedIn ? (
            <div className="profile-menu">
              <div 
                className="profile-icon"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              {showDropdown && (
                <div className="profile-dropdown visible">
                  <div className="info">
                    <p>{user?.name || 'User'}</p>
                    <p>{user?.email || ''}</p>
                  </div>
                  <button onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button className="nav-button" onClick={handleSignup}>Sign Up</button>
              <button className="nav-button primary" onClick={handleLogin}>Sign In</button>
            </>
          )}
        </div>
      </header>
      
      <main className="product-main">
        <button className="back-button" onClick={handleBack}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Back to Products
        </button>
        
        <div className="product-container">
          <div className="product-gallery">
            <div className="main-image">
              <img 
                src={product.images?.length > 0 ? product.images[selectedImage] : product.image} 
                alt={product.name} 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/600';
                }}
              />
            </div>
            
            {product.images?.length > 0 && (
              <div className="thumbnail-container">
                <div 
                  className={`thumbnail ${selectedImage === -1 ? 'active' : ''}`}
                  onClick={() => setSelectedImage(-1)}
                >
                  <img 
                    src={product.image} 
                    alt="Main" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/150';
                    }}
                  />
                </div>
                
                {product.images.map((img, index) => (
                  <div 
                    key={index} 
                    className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img 
                      src={img} 
                      alt={`${product.name} ${index + 1}`} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/150';
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="product-info">
            <div className="product-header">
              <h1>{product.name}</h1>
              <div className="brand-category">
                <span className="brand">{product.brand}</span>
                <span className="category">{product.category}</span>
              </div>
            </div>
            
            <div className="price-stock">
              <div className="price">${product.price?.toFixed(2) || '0.00'}</div>
              <div className={`stock ${product.countInStock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                {product.countInStock > 0 ? 'In Stock' : 'Out of Stock'}
              </div>
            </div>
            
            {product.sizes?.length > 0 && (
              <div className="size-options">
                <h3>Size</h3>
                <div className="options-container">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      className={`option-btn ${selectedSize === size ? 'active' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {product.colors?.length > 0 && (
              <div className="color-options">
                <h3>Color</h3>
                <div className="options-container">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      className={`option-btn ${selectedColor === color ? 'active' : ''}`}
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: color.toLowerCase() }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className="product-description">
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>
            
            {product.tags?.length > 0 && (
              <div className="product-tags">
                <h3>Tags</h3>
                <div className="tags-container">
                  {product.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            
            {product.customAttributes && Object.keys(product.customAttributes).length > 0 && (
              <div className="custom-attributes">
                <h3>Details</h3>
                <div className="attributes-grid">
                  {Object.entries(product.customAttributes).map(([key, value]) => (
                    <div key={key} className="attribute-item">
                      <span className="attribute-key">{key}:</span>
                      <span className="attribute-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="product-actions">
              <div className="quantity-selector">
                <button 
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span>{quantity}</span>
                <button 
                  onClick={() => setQuantity(prev => Math.min(product.countInStock, prev + 1))}
                  disabled={quantity >= product.countInStock}
                >
                  +
                </button>
              </div>
              
              <button 
                className="add-to-cart"
                onClick={handleAddToCart}
                disabled={product.countInStock <= 0 || 
                  (product.sizes?.length > 0 && !selectedSize) ||
                  (product.colors?.length > 0 && !selectedColor)}
              >
                Add to Cart
              </button>
              
              <button 
                className="buy-now"
                onClick={handleBuyNow}
                disabled={product.countInStock <= 0 || 
                  (product.sizes?.length > 0 && !selectedSize) ||
                  (product.colors?.length > 0 && !selectedColor)}
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </main>
      <style jsx="true">{`
        .size-options, .color-options, .custom-attributes {
  margin: 20px 0;
}

.size-options h3, .color-options h3, .custom-attributes h3 {
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: #ffffff;
}

.options-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.option-btn {
  padding: 8px 16px;
  border-radius: 6px;
  background-color: #292929;
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition: 0.3s;
  min-width: 40px;
  text-align: center;
}

.option-btn.active {
  background-color: #00ffab;
  color: #000;
}

.color-options .option-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  position: relative;
}

.color-options .option-btn.active::after {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border: 2px solid #00ffab;
  border-radius: 50%;
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.attribute-item {
  display: flex;
  gap: 5px;
}

.attribute-key {
  color: #00ffab;
  font-weight: bold;
}

.attribute-value {
  color: #cccccc;
}
        .product-page {
          background-color: #0f0f0f;
          color: #ffffff;
          min-height: 100vh;
          font-family: 'Segoe UI', sans-serif;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 32px;
          background: #1a1a1a;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
          position: sticky;
          top: 0;
          z-index: 999;
        }

        .logo {
          font-size: 1.8rem;
          font-weight: bold;
          color: #00ffab;
          cursor: pointer;
          user-select: none;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .nav-links a {
          color: #cccccc;
          text-decoration: none;
          font-size: 1rem;
          padding: 8px 12px;
          border-radius: 6px;
          transition: 0.3s ease;
        }

        .nav-links a:hover {
          background-color: #292929;
          color: #ffffff;
        }

        .cart-icon {
          position: relative;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
        }

        .cart-icon svg {
          width: 24px;
          height: 24px;
          fill: #cccccc;
        }

        .cart-count {
          position: absolute;
          top: -5px;
          right: -5px;
          background-color: #ff6666;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: bold;
        }

        .nav-button {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          transition: 0.3s ease;
        }

        .nav-button.primary {
          background-color: #00ffab;
          color: #000;
        }

        .nav-button.primary:hover {
          background-color: #00cc88;
        }

        .profile-menu {
          position: relative;
        }

        .profile-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #292929;
          color: #00ffab;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          cursor: pointer;
          user-select: none;
          overflow: hidden;
        }

        .profile-icon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-dropdown {
          position: absolute;
          top: 48px;
          right: 0;
          background-color: #1f1f1f;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7);
          width: 200px;
          display: none;
          flex-direction: column;
          z-index: 1000;
        }

        .profile-dropdown.visible {
          display: flex;
        }

        .profile-dropdown .info {
          padding: 12px;
          border-bottom: 1px solid #333;
        }

        .profile-dropdown .info p {
          margin: 4px 0;
          font-size: 0.85rem;
          color: #bbbbbb;
        }

        .profile-dropdown button {
          background: none;
          border: none;
          padding: 12px;
          color: #ff6666;
          cursor: pointer;
          font-weight: bold;
          transition: 0.3s;
          text-align: left;
        }

        .profile-dropdown button:hover {
          background-color: #292929;
        }

        .product-main {
          padding: 40px 32px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: #00ffab;
          cursor: pointer;
          font-size: 1rem;
          margin-bottom: 30px;
          padding: 8px 0;
        }

        .back-button svg {
          width: 20px;
          height: 20px;
          fill: #00ffab;
        }

        .product-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }

        .product-gallery {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .main-image {
          height: 500px;
          background-color: #1f1f1f;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .main-image img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .thumbnail-container {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .thumbnail {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          border: 2px solid transparent;
          transition: 0.3s;
        }

        .thumbnail:hover {
          border-color: #00ffab;
        }

        .thumbnail.active {
          border-color: #00ffab;
        }

        .thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-info {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .product-header h1 {
          font-size: 2.2rem;
          margin: 0;
          color: #ffffff;
        }

        .brand-category {
          display: flex;
          gap: 15px;
          margin-top: 10px;
        }

        .brand-category span {
          font-size: 0.9rem;
          color: #aaaaaa;
        }

        .brand {
          color: #00ffab !important;
          font-weight: bold;
        }

        .price-stock {
          display: flex;
          align-items: center;
          gap: 20px;
          margin: 10px 0;
        }

        .price {
          font-size: 1.8rem;
          font-weight: bold;
          color: #00ffab;
        }

        .stock {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: bold;
        }

        .in-stock {
          background-color: rgba(0, 255, 171, 0.2);
          color: #00ffab;
        }

        .out-of-stock {
          background-color: rgba(255, 102, 102, 0.2);
          color: #ff6666;
        }

        .product-description h3 {
          font-size: 1.2rem;
          margin-bottom: 10px;
          color: #ffffff;
        }

        .product-description p {
          line-height: 1.6;
          color: #cccccc;
        }

        .product-tags h3 {
          font-size: 1.2rem;
          margin-bottom: 10px;
          color: #ffffff;
        }

        .tags-container {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tag {
          background-color: #292929;
          color: #cccccc;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.85rem;
        }

        .product-actions {
          display: flex;
          gap: 15px;
          margin-top: 30px;
        }

        .quantity-selector {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: #292929;
          border-radius: 6px;
          padding: 0 10px;
        }

        .quantity-selector button {
          background: none;
          border: none;
          color: #ffffff;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 5px 10px;
        }

        .quantity-selector button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .quantity-selector span {
          min-width: 20px;
          text-align: center;
        }

        .add-to-cart, .buy-now {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: 0.3s;
        }

        .add-to-cart {
          background-color: #292929;
          color: #ffffff;
        }

        .add-to-cart:hover {
          background-color: #333;
        }

        .buy-now {
          background-color: #00ffab;
          color: #000;
        }

        .buy-now:hover {
          background-color: #00cc88;
        }

        .add-to-cart:disabled, .buy-now:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-container {
          text-align: center;
          padding: 60px 20px;
          background-color: #1f1f1f;
          border-radius: 12px;
        }

        .error-container svg {
          width: 60px;
          height: 60px;
          fill: #ff6666;
          margin-bottom: 20px;
        }

        .error-container h3 {
          color: #ffffff;
          margin-bottom: 10px;
        }

        .error-container p {
          color: #aaaaaa;
          margin-bottom: 20px;
        }

        .error-container button {
          padding: 10px 20px;
          margin: 0 10px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: 0.3s;
        }

        .error-container button:first-of-type {
          background-color: #00ffab;
          color: #000;
        }

        .error-container button:first-of-type:hover {
          background-color: #00cc88;
        }

        .error-container button:last-of-type {
          background-color: #333;
          color: #ffffff;
        }

        .error-container button:last-of-type:hover {
          background-color: #444;
        }

        @media (max-width: 768px) {
          .header {
            flex-direction: column;
            gap: 12px;
          }

          .nav-links {
            flex-direction: column;
          }

          .product-container {
            grid-template-columns: 1fr;
          }

          .main-image {
            height: 350px;
          }

          .product-actions {
            flex-direction: column;
          }

          .quantity-selector {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductPage;