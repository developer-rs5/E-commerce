import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Products = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [cartItems, setCartItems] = useState(0);
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    priceRange: '',
    sort: 'newest'
  });
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Check auth status and load products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check authentication status
        const authResponse = await fetch('http://localhost:8000/api/auth/profile', {
          credentials: 'include'
        });

        if (authResponse.ok) {
          const userData = await authResponse.json();
          setIsLoggedIn(true);
          setUser(userData);

          // Fetch cart if logged in
          const cartResponse = await fetch('http://localhost:8000/api/cart', {
            credentials: 'include'
          });

          if (cartResponse.ok) {
            const cart = await cartResponse.json();
            setCartItems(cart.items?.length || 0);
          }
        }

        // Fetch products and categories
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('http://localhost:8000/api/products', { credentials: 'include' }),
          fetch('http://localhost:8000/api/products/categories', { credentials: 'include' })
        ]);

        if (!productsRes.ok) throw new Error('Failed to load products');
        const productsData = await productsRes.json();
        const productsArray = Array.isArray(productsData) ? productsData : productsData.products || [];
        setProducts(productsArray);
        setFilteredProducts(productsArray);

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        } else {
          console.warn('Categories fetch failed, setting empty list');
          setCategories([]); // ✅ fallback to empty array on failure
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
        setProducts([]);
        setFilteredProducts([]);
        setCategories([]); // ✅ safely fallback
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);



  // Apply search and filters whenever they change
  useEffect(() => {
    let results = [...products];

    // Apply search with fuzzy matching
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      results = results.filter(product => {
        // Check name, description, brand, category
        const nameMatch = product.name?.toLowerCase().includes(query) || false;
        const descMatch = product.description?.toLowerCase().includes(query) || false;
        const brandMatch = product.brand?.toLowerCase().includes(query) || false;
        const categoryMatch = product.category?.toLowerCase().includes(query) || false;
        
        // Check tags if they exist
        const tagsMatch = product.tags ? 
          product.tags.some(tag => tag.toLowerCase().includes(query)) : 
          false;
        
        // Check keywords if they exist
        const keywordsMatch = product.keywords ? 
          product.keywords.some(keyword => keyword.toLowerCase().includes(query)) : 
          false;

        return nameMatch || descMatch || brandMatch || categoryMatch || tagsMatch || keywordsMatch;
      });
    }

    // Apply category filter
    if (filters.category) {
      results = results.filter(product => product.category === filters.category);
    }

    // Apply price range filter
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      results = results.filter(product => {
        if (max) {
          return product.price >= min && product.price <= max;
        }
        return product.price >= min;
      });
    }

    // Apply sorting
    results.sort((a, b) => {
      switch (filters.sort) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'newest':
          return new Date(b.createdAt || b.dateAdded || 0) - new Date(a.createdAt || a.dateAdded || 0);
        case 'oldest':
          return new Date(a.createdAt || a.dateAdded || 0) - new Date(b.createdAt || b.dateAdded || 0);
        default:
          return 0;
      }
    });

    setFilteredProducts(results);
  }, [searchQuery, filters, products]);

  const handleLogin = () => navigate('/login');
  const handleSignup = () => navigate('/signup');

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

  const handleAddToCart = async (productId) => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId, quantity: 1 })
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      category: '',
      priceRange: '',
      sort: 'newest'
    });
  };

  const ProductSkeleton = () => (
    <div className="product-card skeleton">
      <div className="product-image"></div>
      <div className="product-info">
        <div className="product-name"></div>
        <div className="product-price"></div>
        <div className="add-to-cart"></div>
      </div>
    </div>
  );

  return (
    <div className="products-page">
      {/* Header */}
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

      <main className="products-main">
        {/* Search and Filter Section */}
        <div className="filters-container">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search products by name, brand, category, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="filter-group">
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              name="priceRange"
              value={filters.priceRange}
              onChange={handleFilterChange}
            >
              <option value="">All Prices</option>
              <option value="0-50">Under $50</option>
              <option value="50-100">$50 - $100</option>
              <option value="100-200">$100 - $200</option>
              <option value="200-">Over $200</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              name="sort"
              value={filters.sort}
              onChange={handleFilterChange}
            >
              <option value="newest">Newest Arrivals</option>
              <option value="oldest">Oldest Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>
          </div>

          <button className="clear-filters" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>

        {/* Results Count */}
        <div className="results-count">
          Showing {filteredProducts.length} of {products.length} products
          {searchQuery && (
            <span className="search-query"> for "{searchQuery}"</span>
          )}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="products-grid">
            {[...Array(8)].map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="products-grid">
            {filteredProducts.map(product => (
              <div key={product._id || product.id} className="product-card">
                <div 
                  className="product-image"
                  onClick={() => navigate(`/product/${product._id || product.id}`)}
                >
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/300';
                      }}
                    />
                  ) : (
                    <div className="no-image">No Image</div>
                  )}
                </div>
                <div className="product-info">
                  <h3 onClick={() => navigate(`/products/${product._id || product.id}`)}>
                    {product.name}
                  </h3>
                  <p className="brand">{product.brand}</p>
                  <p className="category">{product.category}</p>
                  {product.tags && product.tags.length > 0 && (
                    <div className="tags">
                      {product.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  <p className="price">${product.price?.toFixed(2) || '0.00'}</p>
                  <div className="stock-status">
                    <span className={`badge ${product.countInStock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                      {product.countInStock > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <button 
                      onClick={() => handleAddToCart(product._id || product.id)}
                      disabled={product.countInStock <= 0}
                      className={product.countInStock > 0 ? '' : 'disabled'}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3>No products found</h3>
            <p>Try adjusting your search or filter criteria</p>
            <button onClick={clearFilters}>Clear All Filters</button>
          </div>
        )}
      </main>

      <footer className="site-footer">
        <p>© 2023 Zenux Store. All rights reserved.</p>
        <div className="footer-links">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
          <a href="/about">About Us</a>
          <a href="/careers">Careers</a>
        </div>
      </footer>

      <style jsx>{`
        .products-page {
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

        .products-main {
          padding: 40px 32px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .filters-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
          background-color: #1a1a1a;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 0 12px rgba(0, 255, 171, 0.1);
        }

        .search-container {
          position: relative;
          grid-column: 1 / -1;
        }

        .search-container input {
          width: 100%;
          padding: 12px 16px 12px 40px;
          background-color: #292929;
          border: 1px solid #333;
          border-radius: 6px;
          color: #ffffff;
          font-size: 1rem;
        }

        .search-container svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          fill: #cccccc;
        }

        .filter-group select {
          width: 100%;
          padding: 12px 16px;
          background-color: #292929;
          border: 1px solid #333;
          border-radius: 6px;
          color: #ffffff;
          font-size: 1rem;
          cursor: pointer;
        }

        .clear-filters {
          grid-column: 1 / -1;
          padding: 12px;
          background-color: #333;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: 0.3s;
        }

        .clear-filters:hover {
          background-color: #444;
        }

        .results-count {
          color: #cccccc;
          margin-bottom: 20px;
          font-size: 0.9rem;
        }

        .search-query {
          color: #00ffab;
          font-style: italic;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 24px;
          margin-top: 30px;
        }

        .product-card {
          background-color: #1f1f1f;
          border-radius: 12px;
          overflow: hidden;
          transition: transform 0.3s ease;
          box-shadow: 0 0 12px rgba(0, 255, 171, 0.1);
        }

        .product-card:hover {
          transform: translateY(-5px);
        }

        .product-image {
          height: 200px;
          background-color: #292929;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          overflow: hidden;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .product-card:hover .product-image img {
          transform: scale(1.05);
        }

        .no-image {
          color: #777;
          font-size: 0.9rem;
        }

        .product-info {
          padding: 16px;
        }

        .product-info h3 {
          margin: 0 0 8px 0;
          font-size: 1.1rem;
          color: #ffffff;
          cursor: pointer;
          transition: color 0.3s;
        }

        .product-info h3:hover {
          color: #00ffab;
        }

        .brand {
          color: #aaaaaa;
          font-size: 0.85rem;
          margin: 0 0 4px 0;
        }

        .category {
          color: #888;
          font-size: 0.8rem;
          margin: 0 0 8px 0;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 8px;
        }

        .tag {
          background-color: #333;
          color: #ccc;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
        }

        .price {
          color: #00ffab;
          font-weight: bold;
          font-size: 1.2rem;
          margin: 0 0 12px 0;
        }

        .stock-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
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

        .product-info button {
          padding: 8px 16px;
          background-color: #333;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: 0.3s;
        }

        .product-info button:hover {
          background-color: #00ffab;
          color: #000;
        }

        .product-info button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .skeleton {
          animation: shimmer 1.5s infinite linear;
          background: linear-gradient(to right, #1f1f1f 0%, #292929 50%, #1f1f1f 100%);
          background-size: 200% 100%;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .product-card.skeleton .product-image {
          background-color: #292929;
        }

        .product-card.skeleton .product-name,
        .product-card.skeleton .product-price,
        .product-card.skeleton .add-to-cart {
          height: 16px;
          background-color: #292929;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .product-card.skeleton .product-name {
          width: 80%;
        }

        .product-card.skeleton .product-price {
          width: 40%;
        }

        .product-card.skeleton .add-to-cart {
          width: 100%;
          height: 32px;
        }

        .error-message {
          text-align: center;
          padding: 40px;
          background-color: #1f1f1f;
          border-radius: 12px;
          margin-top: 30px;
        }

        .error-message p {
          color: #ff6666;
          margin-bottom: 20px;
        }

        .error-message button {
          padding: 10px 20px;
          background-color: #333;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: 0.3s;
        }

        .error-message button:hover {
          background-color: #444;
        }

        .no-results {
          text-align: center;
          padding: 60px 20px;
          background-color: #1f1f1f;
          border-radius: 12px;
          margin-top: 30px;
        }

        .no-results svg {
          width: 60px;
          height: 60px;
          fill: #777;
          margin-bottom: 20px;
        }

        .no-results h3 {
          color: #ffffff;
          margin-bottom: 10px;
        }

        .no-results p {
          color: #aaaaaa;
          margin-bottom: 20px;
        }

        .no-results button {
          padding: 10px 20px;
          background-color: #00ffab;
          color: #000;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: 0.3s;
        }

        .no-results button:hover {
          background-color: #00cc88;
        }

        .site-footer {
          padding: 40px 32px;
          background-color: #0e0e0e;
          text-align: center;
          color: #777;
          font-size: 0.9rem;
          margin-top: 60px;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 20px;
        }

        .footer-links a {
          color: #777;
          text-decoration: none;
          transition: 0.3s;
        }

        .footer-links a:hover {
          color: #00ffab;
        }

        @media (max-width: 768px) {
          .header {
            flex-direction: column;
            gap: 12px;
          }

          .nav-links {
            flex-direction: column;
          }

          .filters-container {
            grid-template-columns: 1fr;
          }

          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          }
        }
      `}</style>
    </div>
  );
};

export default Products;