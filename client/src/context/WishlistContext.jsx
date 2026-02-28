import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const WishlistContext = createContext(null);

const parseWishlist = () => {
  const raw = localStorage.getItem('wishlist');
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem('wishlist');
      return [];
    }

    return parsed
      .filter((item) => item && (item.productId || item._id))
      .map((item) => ({
        ...item,
        productId: item.productId || item._id,
        _id: item._id || item.productId
      }));
  } catch {
    localStorage.removeItem('wishlist');
    return [];
  }
};

const resolveDefaultVariant = (product) => {
  if (!Array.isArray(product?.variants) || product.variants.length === 0) {
    return null;
  }

  return product.variants[0];
};

const toWishlistItem = (product) => {
  const defaultVariant = resolveDefaultVariant(product);
  const selectedSize = defaultVariant?.size || product.sizes?.[0] || '';
  const selectedColor = defaultVariant?.color || product.colors?.[0] || '';
  const price = Number(defaultVariant?.price ?? product.price ?? 0);
  const countInStock = Number(defaultVariant?.stock ?? product.countInStock ?? 0);

  return {
    _id: product._id,
    productId: product._id,
    name: product.name,
    image: product.image,
    brand: product.brand || '',
    category: product.category || '',
    gender: product.gender || '',
    price,
    countInStock,
    selectedSize,
    selectedColor,
    addedAt: new Date().toISOString()
  };
};

export const WishlistProvider = ({ children }) => {
  const [items, setItems] = useState(parseWishlist);

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(items));
  }, [items]);

  const addToWishlist = useCallback((product) => {
    if (!product?._id) return;

    setItems((current) => {
      if (current.some((item) => item.productId === product._id)) {
        return current;
      }

      return [toWishlistItem(product), ...current];
    });
  }, []);

  const removeFromWishlist = useCallback((productId) => {
    if (!productId) return;
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const toggleWishlist = useCallback((product) => {
    if (!product?._id) return;

    setItems((current) => {
      const exists = current.some((item) => item.productId === product._id);
      if (exists) {
        return current.filter((item) => item.productId !== product._id);
      }
      return [toWishlistItem(product), ...current];
    });
  }, []);

  const isInWishlist = useCallback(
    (productId) => {
      if (!productId) return false;
      return items.some((item) => item.productId === productId);
    },
    [items]
  );

  const itemsCount = useMemo(() => items.length, [items]);

  const value = useMemo(
    () => ({
      items,
      itemsCount,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isInWishlist
    }),
    [items, itemsCount, addToWishlist, removeFromWishlist, toggleWishlist, isInWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }

  return context;
};
