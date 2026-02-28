import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatINR } from '../utils/currency';

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const CheckoutPage = () => {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Razorpay');
  const [form, setForm] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
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
      const payload = {
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        shippingAddress: form
      };

      if (paymentMethod === 'Cash on Delivery') {
        await api.post('/orders', {
          ...payload,
          paymentMethod: 'Cash on Delivery'
        });

        clearCart();
        navigate('/orders');
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Check internet connection.');
      }

      const { data } = await api.post('/orders/razorpay/order', payload);
      const paymentResult = await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: 'HumanoidMaker',
          description: 'Robotics order payment',
          order_id: data.orderId,
          handler: (response) => resolve(response),
          prefill: {
            name: user?.name || '',
            email: user?.email || ''
          },
          theme: {
            color: '#0f5c4b'
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled'))
          }
        });

        rzp.open();
      });

      await api.post('/orders/razorpay/verify', {
        ...payload,
        razorpayOrderId: paymentResult.razorpay_order_id,
        razorpayPaymentId: paymentResult.razorpay_payment_id,
        razorpaySignature: paymentResult.razorpay_signature
      });

      clearCart();
      navigate('/orders');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Could not place order');
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
            <label htmlFor="paymentMethod">Payment Method</label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              <option value="Razorpay">Razorpay (Test Mode)</option>
              <option value="Cash on Delivery">Cash on Delivery</option>
            </select>
          </div>

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
          {submitting ? 'Processing...' : paymentMethod === 'Razorpay' ? 'Pay with Razorpay' : 'Place order'}
        </button>
      </form>

      <aside className="card summary-card">
        <h2>Order Review</h2>
        <ul className="review-list">
          {items.map((item) => (
            <li key={item.productId}>
              <span>{item.name}</span>
              <span>
                {item.quantity} x {formatINR(item.price)}
              </span>
            </li>
          ))}
        </ul>

        <p className="summary-total">{formatINR(subtotal)}</p>
      </aside>
    </section>
  );
};

export default CheckoutPage;
