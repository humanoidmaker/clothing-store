import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();

  return (
    <article className="card product-card">
      <Link to={`/products/${product._id}`}>
        <img src={product.image} alt={product.name} loading="lazy" />
      </Link>

      <div className="content">
        <p className="tag">{product.category}</p>
        <h3>
          <Link to={`/products/${product._id}`}>{product.name}</Link>
        </h3>
        <p className="muted">{product.description}</p>

        <div className="product-row">
          <strong>${product.price.toLocaleString()}</strong>
          <button
            className="btn btn-primary"
            type="button"
            disabled={product.countInStock < 1}
            onClick={() => addToCart(product, 1)}
          >
            {product.countInStock > 0 ? 'Add to cart' : 'Out of stock'}
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
