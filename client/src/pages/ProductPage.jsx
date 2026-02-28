import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { useCart } from '../context/CartContext';
import { formatINR } from '../utils/currency';

const ProductPage = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) return <p>Loading product...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!product) return <div className="empty">Product not found.</div>;

  const maxQty = Math.max(1, product.countInStock || 1);

  return (
    <section className="card product-detail">
      <img src={product.image} alt={product.name} />

      <div>
        <p className="tag">{product.category}</p>
        <h1>{product.name}</h1>
        <p className="muted">{product.description}</p>

        <p>
          <strong>Brand:</strong> {product.brand}
        </p>
        <p>
          <strong>Stock:</strong> {product.countInStock}
        </p>

        <div className="product-row detail-row">
          <strong className="price">{formatINR(product.price)}</strong>

          <div className="inline">
            <label htmlFor="qty">Qty</label>
            <select
              id="qty"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              disabled={product.countInStock < 1}
            >
              {Array.from({ length: maxQty }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="inline">
          <button
            className="btn btn-primary"
            onClick={() => addToCart(product, quantity)}
            disabled={product.countInStock < 1}
            type="button"
          >
            {product.countInStock > 0 ? 'Add to cart' : 'Out of stock'}
          </button>
          <Link className="btn btn-outline" to="/cart">
            View cart
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ProductPage;
