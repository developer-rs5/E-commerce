import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './MyOrders.css'; // We'll create this CSS file next

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('http://localhost:8000/api/orders/myorders', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        
        const data = await response.json();
        setOrders(data.data || []);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#FFA500';
      case 'processing': return '#3498db';
      case 'shipped': return '#9b59b6';
      case 'delivered': return '#2ecc71';
      case 'cancelled': return '#e74c3c';
      default: return '#ffffff';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">!</div>
        <h3>Error Loading Orders</h3>
        <p>{error}</p>
        <button 
          className="retry-btn"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h1>My Orders</h1>
        <div className="breadcrumbs">
          <Link to="/">Home</Link>
          <span>/</span>
          <span>My Orders</span>
        </div>
      </div>

      <div className="status-filters">
        {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
          <button
            key={status}
            className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
            onClick={() => setStatusFilter(status)}
            style={{ borderColor: getStatusColor(status) }}
          >
            {status === 'all' ? 'All Orders' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-orders">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24">
              <path d="M19,5H5C3.9,5,3,5.9,3,7v10c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V7C21,5.9,20.1,5,19,5z M19,17H5V7h14V17z M9,10H7V8h2V10z M13,10h-2V8h2V10z M17,10h-2V8h2V10z M9,14H7v-2h2V14z M13,14h-2v-2h2V14z M17,14h-2v-2h2V14z"/>
            </svg>
          </div>
          <h3>No Orders Found</h3>
          <p>{statusFilter === 'all' 
            ? "You haven't placed any orders yet." 
            : `You don't have any ${statusFilter} orders.`}
          </p>
          <Link to="/products" className="browse-btn">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map(order => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <div className="order-meta">
                  <h3>Order #{order._id.slice(-6).toUpperCase()}</h3>
                  <p>Placed on {formatDate(order.createdAt)}</p>
                </div>
                <div className="order-status">
                  <span 
                    className="status-badge"
                    style={{ 
                      backgroundColor: getStatusColor(order.status),
                      color: order.status === 'pending' ? '#000' : '#fff'
                    }}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="order-body">
                <div className="order-items">
                  <h4>Items</h4>
                  <div className="items-table">
                    {order.orderItems.map((item, index) => (
                      <div key={index} className="item-row">
                        <div className="item-image">
                          <img src={item.image} alt={item.name} />
                        </div>
                        <div className="item-details">
                          <h5>{item.name}</h5>
                          <p>Qty: {item.qty}</p>
                        </div>
                        <div className="item-price">
                          ₹{(item.price * item.qty).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="order-summary">
                  <div className="summary-row">
                    <span>Subtotal:</span>
                    <span>₹{order.itemsPrice.toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Shipping:</span>
                    <span>₹{order.shippingPrice.toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Tax:</span>
                    <span>₹{order.taxPrice.toFixed(2)}</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total:</span>
                    <span>₹{order.totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div className="order-details">
                  <div className="shipping-info">
                    <h4>Shipping Address</h4>
                    <p>{order.shippingAddress.address}</p>
                    <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
                    <p>{order.shippingAddress.country}</p>
                  </div>

                  <div className="payment-info">
                    <h4>Payment</h4>
                    <p>
                      <strong>Method:</strong> {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay'}
                    </p>
                    <p>
                      <strong>Status:</strong> {order.isPaid ? 'Paid' : 'Not Paid'}
                    </p>
                    {order.isPaid && order.paymentMethod === 'razorpay' && (
                      <p>
                        <strong>Transaction ID:</strong> {order.paymentResult?.razorpayPaymentId || 'N/A'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="order-footer">
                <Link to={`/order/${order._id}`} className="details-btn">
                  View Order Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;