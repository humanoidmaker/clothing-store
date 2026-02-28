import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useCart } from '../context/CartContext';

const CheckoutPage = () => {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: ''
  });

  const canCheckout = useMemo(() => items.length > 0, [items.length]);

  const onChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!canCheckout) {
      setError('Your cart is empty');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await api.post('/orders', {
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        shippingAddress: form,
        paymentMethod: 'Cash on Delivery'
      });

      clearCart();
      navigate('/orders');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCheckout) {
    return (
      <div className="empty">
        Cart is empty. <Link to="/">Shop products</Link>
      </div>
    );
  }

  return (
    <section className="checkout-layout">
      <form className="card form-stack" onSubmit={onSubmit}>
        <h1>Checkout</h1>

        <div className="form-grid">
          <div>
            <label htmlFor="street">Street</label>
            <input id="street" name="street" value={form.street} onChange={onChange} required />
          </div>

          <div>
            <label htmlFor="city">City</label>
            <input id="city" name="city" value={form.city} onChange={onChange} required />
          </div>

          <div>
            <label htmlFor="state">State</label>
            <input id="state" name="state" value={form.state} onChange={onChange} required />
          </div>

          <div>
            <label htmlFor="postalCode">Postal code</label>
            <input id="postalCode" name="postalCode" value={form.postalCode} onChange={onChange} required />
          </div>

          <div>
            <label htmlFor="country">Country</label>
            <input id="country" name="country" value={form.country} onChange={onChange} required />
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Placing order...' : 'Place order'}
        </button>
      </form>

      <aside className="card summary-card">
        <h2>Order Review</h2>
        <ul className="review-list">
          {items.map((item) => (
            <li key={item.productId}>
              <span>{item.name}</span>
              <span>
                {item.quantity} x ${item.price.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>

        <p className="summary-total">${subtotal.toLocaleString()}</p>
      </aside>
    </section>
  );
};

export default CheckoutPage;
