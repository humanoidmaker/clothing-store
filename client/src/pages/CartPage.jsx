import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatINR } from '../utils/currency';

const CartPage = () => {
  const { items, subtotal, removeFromCart, updateQuantity } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const proceedToCheckout = () => {
    if (items.length === 0) return;
    navigate(isAuthenticated ? '/checkout' : '/login');
  };

  return (
    <section>
      <div className="page-header">
        <h1>Your Cart</h1>
      </div>

      {items.length === 0 && (
        <div className="empty">
          Your cart is empty. <Link to="/">Browse products</Link>
        </div>
      )}

      {items.length > 0 && (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => (
              <article key={item.productId} className="card cart-item">
                <img src={item.image} alt={item.name} />

                <div>
                  <Link to={`/products/${item.productId}`}>
                    <strong>{item.name}</strong>
                  </Link>
                  <p className="muted">{formatINR(item.price)} each</p>
                </div>

                <select
                  value={item.quantity}
                  onChange={(event) => updateQuantity(item.productId, Number(event.target.value))}
                >
                  {Array.from({ length: Math.max(1, item.countInStock || 1) }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </select>

                <button className="btn btn-danger" onClick={() => removeFromCart(item.productId)} type="button">
                  Remove
                </button>
              </article>
            ))}
          </div>

          <aside className="card summary-card">
            <h2>Summary</h2>
            <p className="muted">Subtotal ({items.length} item types)</p>
            <p className="summary-total">{formatINR(subtotal)}</p>
            <button className="btn btn-accent" type="button" onClick={proceedToCheckout}>
              Proceed to checkout
            </button>
          </aside>
        </div>
      )}
    </section>
  );
};

export default CartPage;
