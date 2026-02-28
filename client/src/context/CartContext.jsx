import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);

const parseCart = () => {
  const raw = localStorage.getItem('cart');
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem('cart');
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(parseCart);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product._id);
      const safeQty = Math.max(1, Number(quantity || 1));

      if (existing) {
        return current.map((item) =>
          item.productId === product._id
            ? {
                ...item,
                quantity: Math.min(item.quantity + safeQty, product.countInStock || 999)
              }
            : item
        );
      }

      return [
        ...current,
        {
          productId: product._id,
          name: product.name,
          image: product.image,
          price: product.price,
          countInStock: product.countInStock,
          quantity: Math.min(safeQty, product.countInStock || 999)
        }
      ];
    });
  };

  const removeFromCart = (productId) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    const safeQty = Math.max(1, Number(quantity || 1));
    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(safeQty, item.countInStock || 999) }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const itemsCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      subtotal,
      itemsCount
    }),
    [items, subtotal, itemsCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }

  return context;
};
