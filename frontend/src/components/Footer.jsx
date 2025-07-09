import "./Footer.css";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-columns">
        <div>
          <h3>ShopX</h3>
          <p>Your go-to online store for everything!</p>
        </div>
        <div>
          <h4>Policies</h4>
          <ul>
            <li>Privacy Policy</li>
            <li>Terms & Conditions</li>
            <li>Refund Policy</li>
          </ul>
        </div>
        <div>
          <h4>Contact Us</h4>
          <p>Email: support@shopx.com</p>
          <p>Phone: +91 1234567890</p>
        </div>
      </div>
      <div className="bottom-text">© 2025 ShopX. All rights reserved.</div>
    </footer>
  );
}

export default Footer;
