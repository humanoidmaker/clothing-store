import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import ProductCard from '../components/ProductCard';

const categoryOptions = [
  '',
  'Home Robotics',
  'Industrial',
  'Healthcare',
  'Education',
  'Logistics',
  'Hospitality'
];

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [filters, setFilters] = useState({ search: '', category: '' });

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const params = {};

        if (filters.search) params.search = filters.search;
        if (filters.category) params.category = filters.category;

        const { data } = await api.get('/products', { params });
        setProducts(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters]);

  const heading = useMemo(() => {
    if (filters.search || filters.category) {
      return 'Filtered Products';
    }

    return 'Featured Humanoid Products';
  }, [filters]);

  const onSubmit = (event) => {
    event.preventDefault();
    setFilters({ search: searchInput.trim(), category: categoryInput });
  };

  const resetFilters = () => {
    setSearchInput('');
    setCategoryInput('');
    setFilters({ search: '', category: '' });
  };

  return (
    <section>
      <div className="page-header">
        <h1>{heading}</h1>
        <p className="muted">Search and buy robotic systems built for real-world deployments.</p>
      </div>

      <form className="card filter-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <div>
            <label htmlFor="search">Search by name</label>
            <input
              id="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Try: companion, warehouse, healthcare"
            />
          </div>

          <div>
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={categoryInput}
              onChange={(event) => setCategoryInput(event.target.value)}
            >
              {categoryOptions.map((value) => (
                <option key={value || 'all'} value={value}>
                  {value || 'All categories'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="inline">
          <button className="btn btn-primary" type="submit">
            Apply
          </button>
          <button className="btn btn-outline" type="button" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </form>

      {loading && <p>Loading products...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <div className="empty">No products found for the selected filters.</div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="grid">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};

export default HomePage;
