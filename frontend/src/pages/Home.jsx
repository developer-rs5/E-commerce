import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./Home.css"

const Home = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [cartItems, setCartItems] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

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
          
          // Fetch cart items if logged in
          const cartResponse = await fetch('http://localhost:8000/api/cart', {
            credentials: 'include'
          });
          if (cartResponse.ok) {
            const cart = await cartResponse.json();
            setCartItems(cart.items?.length || 0);
          }
        }

        // Fetch random products
        const productsResponse = await fetch('http://localhost:8000/api/products/random', {
          credentials: 'include'
        });
        
        if (!productsResponse.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const productsData = await productsResponse.json();
        setProducts(productsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load products. Please try again later.');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      navigate('/login');
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

  const ProductSkeleton = () => (
    <div className="bg-gray-800 rounded-xl overflow-hidden animate-pulse">
      <div className="w-full h-48 bg-gray-700"></div>
      <div className="p-4">
        <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-gray-700 rounded"></div>
      </div>
    </div>
  );

  const PolicyCard = ({ icon, title, description }) => (
    <div className="bg-gray-800 p-6 rounded-xl text-center hover:bg-gray-700 transition">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );

  const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="border-b border-gray-700 py-4 last:border-0">
        <button 
          className="flex justify-between w-full items-center text-left"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="font-medium">{question}</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {isOpen && <p className="mt-2 text-gray-400 pl-2">{answer}</p>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-900 text-gray-100 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 text-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center p-6 bg-gray-800 rounded-lg">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div 
            className="text-2xl font-bold text-purple-400 cursor-pointer"
            onClick={() => navigate('/')}
          >
            ZENUX STORE
          </div>
          
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => navigate('/myorders')}
              className="hover:text-purple-300 transition"
            >
              Orders
            </button>
            
            <div className="relative">
              <button 
                className="flex items-center hover:text-purple-300 transition"
                onClick={() => navigate('/cart')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItems}
                  </span>
                )}
              </button>
            </div>
            
            <div className="relative">
              {isLoggedIn ? (
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <button 
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center focus:outline-none"
                    >
                      {user?.profilePicture ? (
                        <img 
                          src={user.profilePicture} 
                          alt="Profile" 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-white">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      )}
                    </button>
                    
                    {showDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-50">
                        <button 
                          onClick={() => {
                            navigate('/profile');
                            setShowDropdown(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile
                        </button>
                        <button 
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex space-x-4">
                  <button 
                    onClick={handleSignup}
                    className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md transition"
                  >
                    Sign Up
                  </button>
                  <button 
                    onClick={handleLogin}
                    className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md transition"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 md:p-12 mb-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Premium Tech Experience</h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-300">
            Discover cutting-edge electronics with unparalleled performance and design
          </p>
          <button 
            onClick={() => navigate('/products')}
            className="bg-purple-600 hover:bg-purple-700 text-xl px-8 py-4 rounded-lg transition"
          >
            Shop Now
          </button>
        </section>

        {/* Products Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Featured Products</h2>
          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {products.map(product => (
                  <div key={product._id} className="bg-gray-800 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-purple-500/10 transition">
                    <div 
                      className="w-full h-48 bg-gray-700 flex items-center justify-center cursor-pointer"
                      onClick={() => navigate(`/product/${product._id}`)}
                    >
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/300';
                          }}
                        />
                      ) : (
                        <span className="text-gray-400">No Image</span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 
                        className="font-semibold text-lg cursor-pointer hover:text-purple-400"
                        onClick={() => navigate(`/product/${product._id}`)}
                      >
                        {product.name}
                      </h3>
                      <p className="text-purple-400 font-bold mt-2">
                        ${product.price.toFixed(2)}
                      </p>
                      <button 
                        onClick={() => handleAddToCart(product._id)}
                        className="mt-4 w-full bg-gray-700 hover:bg-gray-600 py-2 rounded-md transition"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <button 
                  onClick={() => navigate('/products')}
                  className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-md transition"
                >
                  View All Products
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No products available</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-md"
              >
                Refresh
              </button>
            </div>
          )}
        </section>

        {/* Policies Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Policies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PolicyCard 
              icon="🚚" 
              title="Fast Delivery" 
              description="Get your products within 7 days guaranteed"
            />
            <PolicyCard 
              icon="🔄" 
              title="Easy Returns" 
              description="30-day hassle-free return policy"
            />
            <PolicyCard 
              icon="🔒" 
              title="Secure Payment" 
              description="Bank-level security for transactions"
            />
            <PolicyCard 
              icon="📞" 
              title="24/7 Support" 
              description="Dedicated customer support team"
            />
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto bg-gray-800 rounded-xl p-6">
            <FAQItem 
              question="How long does delivery take?" 
              answer="We deliver within 7 business days to most locations. Express shipping options are available."
            />
            <FAQItem 
              question="What payment methods do you accept?" 
              answer="We accept all major credit cards, PayPal, and cryptocurrency."
            />
            <FAQItem 
              question="Can I return a product?" 
              answer="Yes, we offer 30-day returns for unused products in original packaging."
            />
            <FAQItem 
              question="Do you offer international shipping?" 
              answer="Yes, we ship worldwide with additional shipping charges depending on the destination."
            />
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 border-t border-gray-700 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">© 2023 Zenux Store. All rights reserved.</p>
          <div className="mt-4 flex justify-center space-x-6">
            <button 
              onClick={() => navigate('/terms')}
              className="text-gray-400 hover:text-white transition"
            >
              Terms
            </button>
            <button 
              onClick={() => navigate('/privacy')}
              className="text-gray-400 hover:text-white transition"
            >
              Privacy
            </button>
            <button 
              onClick={() => navigate('/about')}
              className="text-gray-400 hover:text-white transition"
            >
              About Us
            </button>
            <button 
              onClick={() => navigate('/careers')}
              className="text-gray-400 hover:text-white transition"
            >
              Careers
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;