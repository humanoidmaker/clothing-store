import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

const parseUser = () => {
  const raw = localStorage.getItem('user');
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const mapError = (error) => error.response?.data?.message || 'Request failed';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(parseUser);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));

  const saveAuth = (authData) => {
    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify({
      _id: authData._id,
      name: authData.name,
      email: authData.email,
      isAdmin: authData.isAdmin
    }));
    setToken(authData.token);
    setUser({
      _id: authData._id,
      name: authData.name,
      email: authData.email,
      isAdmin: authData.isAdmin
    });
  };

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const fetchProfile = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
    } catch {
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password }).catch((error) => {
      throw new Error(mapError(error));
    });

    saveAuth(data);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password }).catch((error) => {
      throw new Error(mapError(error));
    });

    saveAuth(data);
    return data;
  };

  const logout = () => {
    clearAuth();
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(user?.isAdmin),
      login,
      register,
      logout
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
