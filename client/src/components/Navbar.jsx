import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const { itemsCount } = useCart();

  return (
    <header className="nav-wrap">
      <div className="nav container">
        <Link className="brand" to="/">
          HumanoidMaker
          <span>Storefront</span>
        </Link>

        <nav className="nav-links">
          <NavLink to="/">Products</NavLink>
          <NavLink to="/cart">Cart ({itemsCount})</NavLink>
          {user && <NavLink to="/orders">My Orders</NavLink>}
          {isAdmin && <NavLink to="/admin/products">Admin</NavLink>}
        </nav>

        <div className="auth-links">
          {!user && (
            <>
              <Link to="/login">Login</Link>
              <Link className="btn btn-outline" to="/register">
                Register
              </Link>
            </>
          )}

          {user && (
            <>
              <span className="muted">{user.name}</span>
              <button className="btn btn-outline" onClick={logout} type="button">
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
