import { useEffect, useState } from 'react';
import api from '../api';

const initialForm = {
  name: '',
  description: '',
  image: '',
  brand: '',
  category: '',
  price: '',
  countInStock: ''
};

const AdminProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/products');
      setProducts(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const onCreate = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      await api.post('/products', {
        ...form,
        price: Number(form.price),
        countInStock: Number(form.countInStock || 0)
      });
      setForm(initialForm);
      await fetchProducts();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    const shouldDelete = window.confirm('Delete this product?');
    if (!shouldDelete) return;

    try {
      await api.delete(`/products/${id}`);
      setProducts((current) => current.filter((item) => item._id !== id));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to delete product');
    }
  };

  return (
    <section className="admin-layout">
      <form className="card form-stack" onSubmit={onCreate}>
        <h1>Add Product</h1>

        <div className="form-grid">
          <div>
            <label htmlFor="name">Name</label>
            <input id="name" name="name" value={form.name} onChange={onChange} required />
          </div>

          <div>
            <label htmlFor="category">Category</label>
            <input id="category" name="category" value={form.category} onChange={onChange} required />
          </div>

          <div>
            <label htmlFor="brand">Brand</label>
            <input id="brand" name="brand" value={form.brand} onChange={onChange} />
          </div>

          <div>
            <label htmlFor="price">Price</label>
            <input id="price" name="price" type="number" min="0" value={form.price} onChange={onChange} required />
          </div>

          <div>
            <label htmlFor="countInStock">Stock</label>
            <input
              id="countInStock"
              name="countInStock"
              type="number"
              min="0"
              value={form.countInStock}
              onChange={onChange}
            />
          </div>

          <div>
            <label htmlFor="image">Image URL</label>
            <input id="image" name="image" value={form.image} onChange={onChange} />
          </div>
        </div>

        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            rows="4"
            onChange={onChange}
            required
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Create product'}
        </button>
      </form>

      <div className="card table-wrap">
        <h2>Catalog</h2>

        {loading && <p>Loading products...</p>}

        {!loading && products.length === 0 && <div className="empty">No products yet.</div>}

        {!loading && products.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>${product.price.toLocaleString()}</td>
                  <td>{product.countInStock}</td>
                  <td>
                    <button className="btn btn-danger" onClick={() => onDelete(product._id)} type="button">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default AdminProductsPage;
