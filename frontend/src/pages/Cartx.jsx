import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { createSlice, configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import './Cart.css';


// 1. Redux Cart Slice
const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    cartItems: [],
    loading: false,
    error: null
  },
  reducers: {
    fetchCartStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchCartSuccess(state, action) {
      state.cartItems = Array.isArray(action.payload?.items) ? action.payload.items : [];
      state.loading = false;
    },
    fetchCartFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.cartItems = [];
    },
    updateCartItem(state, action) {
      const { productId, quantity, selectedSize, selectedColor } = action.payload;
      const itemIndex = state.cartItems.findIndex(
        item => item?.product?._id === productId &&
               item.selectedSize === selectedSize &&
               item.selectedColor === selectedColor
      );
      if (itemIndex >= 0) {
        state.cartItems[itemIndex].quantity = quantity;
      }
    },
    removeFromCart(state, action) {
      const { productId, selectedSize, selectedColor } = action.payload;
      state.cartItems = state.cartItems.filter(
        item => !(item?.product?._id === productId &&
                 item.selectedSize === selectedSize &&
                 item.selectedColor === selectedColor)
      );
    },
    clearCart(state) {
      state.cartItems = [];
    }
  }
});

const { actions, reducer } = cartSlice;
const store = configureStore({ reducer: { cart: reducer } });

// 2. Custom Cart Hook
const useCart = () => {
  const dispatch = useDispatch();
  const { cartItems = [], loading, error } = useSelector(state => state.cart);

  const fetchCart = async () => {
    try {
      dispatch(actions.fetchCartStart());
      const { data } = await axios.get('/api/cart');
      console.log(data)
      dispatch(actions.fetchCartSuccess(data));
    } catch (err) {
      dispatch(actions.fetchCartFailure(err.response?.data?.message || err.message));
      console.error('Fetch cart error:', err);
    }
  };

  const updateItemQuantity = async (item, newQuantity) => {
    try {
      await axios.put(`/api/cart/${item.product._id}`, { 
        quantity: newQuantity,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor
      });
      dispatch(actions.updateCartItem({
        productId: item.product._id,
        quantity: newQuantity,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor
      }));
    } catch (err) {
      console.error('Update quantity error:', err);
    }
  };

  const removeItem = async (item) => {
    try {
      await axios.delete(`/api/cart/${item.product._id}`, {
        data: {
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor
        }
      });
      dispatch(actions.removeFromCart({
        productId: item.product._id,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor
      }));
    } catch (err) {
      console.error('Remove item error:', err);
    }
  };

  const clearCart = async () => {
    try {
      await axios.delete('/api/cart');
      dispatch(actions.clearCart());
    } catch (err) {
      console.error('Clear cart error:', err);
    }
  };

  const calculateTotals = () => {
    const validItems = cartItems.filter(item => 
      item?.product?._id && 
      typeof item.price === 'number' && 
      typeof item.quantity === 'number'
    );

    const subtotal = validItems.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );
    const shipping = subtotal > 100 ? 0 : 10;
    const tax = subtotal * 0.15;
    const total = subtotal + shipping + tax;
    const itemCount = validItems.reduce((count, item) => count + item.quantity, 0);

    return {
      subtotal: subtotal.toFixed(2),
      shipping: shipping.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      itemCount
    };
  };

  return {
    cartItems,
    loading,
    error,
    ...calculateTotals(),
    fetchCart,
    updateItemQuantity,
    removeItem,
    clearCart
  };
};

// 3. Main Cart Component
const CartComponent = () => {
  const { 
    cartItems, 
    loading, 
    error,
    subtotal, 
    shipping, 
    tax, 
    total,
    itemCount,
    fetchCart,
    updateItemQuantity,
    removeItem,
    clearCart
  } = useCart();
  
  const [removingItem, setRemovingItem] = useState(null);

  useEffect(() => {
    fetchCart();
  }, []);

  const handleQuantityChange = (item, newQuantity) => {
    updateItemQuantity(item, Number(newQuantity));
  };

  const confirmRemove = () => {
    if (removingItem) {
      removeItem(removingItem);
    }
    setRemovingItem(null);
  };

  if (loading) return <div className="loading">Loading cart...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const validCartItems = cartItems.filter(item => item?.product?._id);

  return (
    <div className="cart-page">
      <h1 className="cart-title">Your Shopping Cart</h1>
      
      {validCartItems.length === 0 ? (
        <div className="empty-cart">
          <p>Your cart is empty</p>
          <a href="/products" className="continue-shopping">Continue Shopping</a>
        </div>
      ) : (
        <div className="cart-container">
          <div className="cart-items">
            {validCartItems.map(item => (
              <div 
                key={`${item.product._id}-${item.selectedSize || ''}-${item.selectedColor || ''}`}
                className="cart-item"
              >
                <div className="item-image-container">
                  <img 
                    src={item.product.image || '/placeholder-product.png'} 
                    alt={item.product.name || 'Product'} 
                    className="item-image"
                    onError={(e) => e.target.src = '/placeholder-product.png'}
                  />
                </div>
                
                <div className="item-details">
                  <h3 className="item-name">{item.product.name || 'Product'}</h3>
                  
                  {item.selectedSize && (
                    <p className="item-option">
                      <span className="option-label">Size:</span> 
                      <span className="option-value">{item.selectedSize}</span>
                    </p>
                  )}
                  
                  {item.selectedColor && (
                    <p className="item-option">
                      <span className="option-label">Color:</span>
                      <span 
                        className="color-swatch"
                        style={{ backgroundColor: item.selectedColor.toLowerCase() }}
                        title={item.selectedColor}
                      />
                      <span className="option-value">{item.selectedColor}</span>
                    </p>
                  )}
                  
                  <p className="item-price">${item.price?.toFixed(2) || '0.00'}</p>
                </div>
                
                <div className="quantity-selector">
                  <select
                    value={item.quantity || 1}
                    onChange={(e) => handleQuantityChange(item, e.target.value)}
                    disabled={!item.product.countInStock}
                  >
                    {[...Array(item.product.countInStock || 0).keys()].map(x => (
                      <option key={x + 1} value={x + 1}>
                        {x + 1}
                      </option>
                    ))}
                  </select>
                </div>
                
                <p className="item-total">
                  ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                </p>
                
                <button 
                  className="remove-btn"
                  onClick={() => setRemovingItem(item)}
                  aria-label="Remove item"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h2 className="summary-title">Order Summary</h2>
            
            <div className="summary-row">
              <span className="row-label">Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
              <span className="row-value">${subtotal}</span>
            </div>
            
            <div className="summary-row">
              <span className="row-label">Shipping</span>
              <span className="row-value">{shipping === '0.00' ? 'FREE' : `$${shipping}`}</span>
            </div>
            
            <div className="summary-row">
              <span className="row-label">Tax (15%)</span>
              <span className="row-value">${tax}</span>
            </div>
            
            <div className="summary-total">
              <span className="total-label">Total</span>
              <span className="total-value">${total}</span>
            </div>
            
            <button 
              className="checkout-btn"
              disabled={validCartItems.length === 0}
            >
              Proceed to Checkout
            </button>
            
            {validCartItems.length > 0 && (
              <button 
                className="clear-cart-btn"
                onClick={clearCart}
              >
                Clear Cart
              </button>
            )}
          </div>
        </div>
      )}

      {removingItem && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h3>Remove Item</h3>
            <p>Are you sure you want to remove this item from your cart?</p>
            <div className="confirmation-buttons">
              <button 
                onClick={() => setRemovingItem(null)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={confirmRemove}
                className="confirm-btn"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 4. Export the wrapped component
const Cart = () => (
  <Provider store={store}>
    <CartComponent />
  </Provider>
);

export default Cart;