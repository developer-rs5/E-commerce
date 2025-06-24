import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Checkout.css';

const CheckoutPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const [checkoutData, setCheckoutData] = useState({
    items: [],
    subtotal: 0,
    tax: 0,
    shipping: 0,
    total: 0,
    shippingAddress: {
      address: '',
      city: '',
      postalCode: '',
      country: 'India'
    }
  });

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {
      setError('Failed to load payment system');
      setRazorpayLoaded(false);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Check for empty cart if not a product checkout
  useEffect(() => {
    if (!productId) {
      const cart = JSON.parse(localStorage.getItem('cart')) || { items: [] };
      if (cart.items.length === 0) {
        toast.error('Your cart is empty');
        navigate('/cart');
      }
    }
  }, [productId, navigate]);

  // Load checkout data
  useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          navigate('/login');
          return;
        }

        let url = '/api/orders/checkout';
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };

        if (productId) {
          url += `?productId=${productId}`;
        } else {
          const cart = JSON.parse(localStorage.getItem('cart')) || { items: [] };
          url += `?cart=${encodeURIComponent(JSON.stringify(cart))}`;
        }

        const { data } = await axios.get(url, config);
        
        if (data.success) {
          setCheckoutData(data.data);
          setError(null);
        } else {
          throw new Error(data.message || 'Failed to load checkout data');
        }
      } catch (err) {
        console.error('Checkout data error:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load checkout data');
        if (err.response?.status === 401) {
          navigate('/login');
        } else if (err.response?.status === 400 && err.response?.data?.message?.includes('cart')) {
          navigate('/cart');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutData();
  }, [productId, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCheckoutData(prev => ({
      ...prev,
      shippingAddress: {
        ...prev.shippingAddress,
        [name]: value
      }
    }));
  };

  const handlePayment = async () => {
    if (!razorpayLoaded) {
      toast.error('Payment system is still loading. Please try again.');
      return;
    }

    // Validate shipping address
    const { address, city, postalCode } = checkoutData.shippingAddress;
    if (!address.trim() || !city.trim() || !postalCode.trim()) {
      toast.error('Please complete all shipping information');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create order
      const { data } = await axios.post(
        '/api/orders/checkout',
        {
          items: checkoutData.items,
          shippingAddress: checkoutData.shippingAddress,
          paymentMethod: 'razorpay'
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!data.success) {
        throw new Error(data.message || 'Failed to create order');
      }

      // Initialize Razorpay payment
      const options = {
        key: "rzp_live_QLiaLcm14p8LLn",
        amount: data.data.totalPrice * 100,
        currency: 'INR',
        name: 'Your Store',
        description: `Order #${data.data._id}`,
        order_id: data.data.razorpayOrderId,
        handler: async (response) => {
          try {
            const verifyRes = await axios.post(
              `/api/orders/${data.data._id}/verify`,
              response,
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem('token')}`
                }
              }
            );

            if (verifyRes.data.success) {
              toast.success('Payment successful!');
              
              // Clear cart if this was a cart checkout
              if (!productId) {
                localStorage.removeItem('cart');
              }
              
              navigate(`/orders/${data.data._id}`);
            } else {
              throw new Error(verifyRes.data.message || 'Payment verification failed');
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            toast.error(err.response?.data?.message || err.message || 'Payment verification failed');
          }
        },
        prefill: {
          name: data.data.user?.name || '',
          email: data.data.user?.email || '',
          contact: data.data.user?.phone || ''
        },
        theme: {
          color: '#00ffab'
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.response?.data?.message || error.message || 'Payment failed');
      toast.error(error.response?.data?.message || error.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <div className="checkout-form">
            <h2>Loading your order...</h2>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <div className="checkout-form">
            <h2>Checkout Error</h2>
            <div className="error-message">{error}</div>
            <button 
              onClick={() => window.location.reload()}
              style={{ marginTop: '1rem' }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-form">
          <h2>Shipping Information</h2>
          
          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input
              type="text"
              id="address"
              name="address"
              value={checkoutData.shippingAddress.address}
              onChange={handleInputChange}
              required
              placeholder="Street address"
            />
          </div>

          <div className="form-group">
            <label htmlFor="city">City</label>
            <input
              type="text"
              id="city"
              name="city"
              value={checkoutData.shippingAddress.city}
              onChange={handleInputChange}
              required
              placeholder="City"
            />
          </div>

          <div className="form-group">
            <label htmlFor="postalCode">Postal Code</label>
            <input
              type="text"
              id="postalCode"
              name="postalCode"
              value={checkoutData.shippingAddress.postalCode}
              onChange={handleInputChange}
              required
              placeholder="Postal code"
            />
          </div>

          <div className="form-group">
            <label htmlFor="country">Country</label>
            <input
              type="text"
              id="country"
              name="country"
              value={checkoutData.shippingAddress.country}
              onChange={handleInputChange}
              required
              disabled
            />
          </div>

          <h2>Payment Method</h2>
          <div className="payment-method">
            <label>
              <input
                type="radio"
                name="paymentMethod"
                value="razorpay"
                checked
                readOnly
              />
              Razorpay (Credit/Debit Cards, UPI, Net Banking)
            </label>
          </div>

          <button
            onClick={handlePayment}
            disabled={processing || !razorpayLoaded}
            className={processing ? 'processing' : ''}
          >
            {processing ? 'Processing...' : `Pay ₹${checkoutData.total.toFixed(2)}`}
          </button>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="order-summary">
          <h2>Order Summary</h2>
          
          <div className="order-items">
            {checkoutData.items.map((item, index) => (
              <div key={`${item.product}-${index}`} className="order-item">
                <img src={item.image} alt={item.name} />
                <div>
                  <h4>{item.name}</h4>
                  <p>₹{item.price.toFixed(2)} × {item.qty}</p>
                  <p>₹{(item.price * item.qty).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="price-breakdown">
            <div className="price-row">
              <span>Subtotal</span>
              <span>₹{checkoutData.subtotal.toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span>Shipping</span>
              <span>₹{checkoutData.shipping.toFixed(2)}</span>
            </div>
            <div className="price-row">
              <span>Tax</span>
              <span>₹{checkoutData.tax.toFixed(2)}</span>
            </div>
            <div className="price-row total">
              <span>Total</span>
              <span>₹{checkoutData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;