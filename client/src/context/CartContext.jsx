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

const getCartKey = (productId, selectedSize, selectedColor) =>
  `${productId}__${selectedSize || 'nosize'}__${selectedColor || 'nocolor'}`;

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(parseCart);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product, quantity = 1, selectedSize = '', selectedColor = '') => {
    const safeQty = Math.max(1, Number(quantity || 1));
    const cartKey = getCartKey(product._id, selectedSize, selectedColor);

    setItems((current) => {
      const existing = current.find((item) => item.cartKey === cartKey);

      if (existing) {
        return current.map((item) =>
          item.cartKey === cartKey
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
          cartKey,
          productId: product._id,
          name: product.name,
          image: product.image,
          price: product.price,
          countInStock: product.countInStock,
          selectedSize,
          selectedColor,
          quantity: Math.min(safeQty, product.countInStock || 999)
        }
      ];
    });
  };

  const removeFromCart = (cartKey) => {
    setItems((current) => current.filter((item) => item.cartKey !== cartKey));
  };

  const updateQuantity = (cartKey, quantity) => {
    const safeQty = Math.max(1, Number(quantity || 1));

    setItems((current) =>
      current.map((item) =>
        item.cartKey === cartKey
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
