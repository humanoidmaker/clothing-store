import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const WishlistContext = createContext(null);
const fallbackImage = 'https://placehold.co/600x400?text=Product';

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

const findVariant = (product, selectedSize, selectedColor) => {
  if (!Array.isArray(product?.variants) || product.variants.length === 0) {
    return null;
  }

  if (!selectedSize) {
    return null;
  }

  const sizeMatches = product.variants.filter((variant) => variant.size === selectedSize);

  if (sizeMatches.length === 0) {
    return null;
  }

  if (!selectedColor) {
    return sizeMatches[0];
  }

  return sizeMatches.find((variant) => (variant.color || '') === selectedColor) || null;
};

const getFirstImage = (images) => {
  if (!Array.isArray(images)) return '';
  return images.find(Boolean) || '';
};

const toWishlistItem = (product, options = {}) => {
  const requestedSize = String(options.selectedSize || '').trim();
  const requestedColor = String(options.selectedColor || '').trim();

  const variant = findVariant(product, requestedSize, requestedColor) || resolveDefaultVariant(product);
  const selectedSize = requestedSize || variant?.size || product.sizes?.[0] || '';
  const selectedColor = requestedColor || variant?.color || product.colors?.[0] || '';
  const price = Number(variant?.price ?? product.price ?? 0);
  const countInStock = Number(variant?.stock ?? product.countInStock ?? 0);
  const image = getFirstImage(variant?.images) || getFirstImage(product?.images) || product.image || fallbackImage;

  return {
    _id: product._id,
    productId: product._id,
    name: product.name,
    image,
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

  const addToWishlist = useCallback((product, options = {}) => {
    if (!product?._id) return;

    setItems((current) => {
      if (current.some((item) => item.productId === product._id)) {
        return current;
      }

      return [toWishlistItem(product, options), ...current];
    });
  }, []);

  const removeFromWishlist = useCallback((productId) => {
    if (!productId) return;
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const toggleWishlist = useCallback((product, options = {}) => {
    if (!product?._id) return;

    setItems((current) => {
      const exists = current.some((item) => item.productId === product._id);
      if (exists) {
        return current.filter((item) => item.productId !== product._id);
      }
      return [toWishlistItem(product, options), ...current];
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
