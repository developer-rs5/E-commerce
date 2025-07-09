import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Products from './pages/Products';
import Product from './pages/Productx'
import Cart from './pages/Cartx'
import CheckoutPage from './pages/Checkout';
import MyOrdersPage from './pages/MyOrders';
import VerifyEmail from './pages/VerifyEmail';
// import OrderSuccessPage from './pages/OrderSuccessPage';

const App = () => {
  return (
    <>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/products" element={<Products />}/>
        <Route path="/product/:id" element={<Product/>}/>
        <Route path="/cart" element={<Cart/>}/>
        <Route path="/checkout/:productId?" element={<CheckoutPage />} />
        <Route path="/myorders" element={<MyOrdersPage/>}/>
        <Route path="/verify-email" element={<VerifyEmail/>}/>
        {/* <Route path="/order/:id" element={<OrderSuccessPage />} /> */}
      </Routes>
    </>
  );
};

export default App;
