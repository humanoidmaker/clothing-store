import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getStorageJson, setStorageJson, STORAGE_KEYS } from '../api/storage';

const CartContext = createContext(null);
const fallbackImage = 'https://placehold.co/600x400?text=Product';

const normalizeImageUrl = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value && typeof value === 'object') {
    return String(value.url || value.src || '').trim();
  }
  return '';
};

const getCartKey = (productId, selectedSize, selectedColor) =>
  `${productId}__${selectedSize || 'nosize'}__${selectedColor || 'nocolor'}`;

const getFirstImage = (images) => {
  if (!Array.isArray(images)) {
    return '';
  }
  for (const image of images) {
    const normalized = normalizeImageUrl(image);
    if (normalized) {
      return normalized;
    }
  }
  return '';
};

const findVariant = (product, selectedSize, selectedColor) => {
  if (!Array.isArray(product?.variants) || product.variants.length === 0) {
    return null;
  }

  const sizeMatched = product.variants.filter((variant) => variant.size === selectedSize);
  if (sizeMatched.length === 0) {
    return null;
  }

  if (!selectedColor) {
    return sizeMatched[0];
  }

  return sizeMatched.find((variant) => (variant.color || '') === selectedColor) || null;
};

const resolveCartImage = (product, selectedVariant) => {
  const variantImage = getFirstImage(selectedVariant?.images);
  const productImage = getFirstImage(product?.images);
  return variantImage || productImage || normalizeImageUrl(product?.image) || fallbackImage;
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const loadCart = async () => {
      const parsed = await getStorageJson(STORAGE_KEYS.cart, []);
      if (!active) {
        return;
      }
      if (Array.isArray(parsed)) {
        setItems(
          parsed.map((item) => ({
            ...item,
            image: normalizeImageUrl(item?.image) || fallbackImage
          }))
        );
      }
      setLoaded(true);
    };

    void loadCart();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    void setStorageJson(STORAGE_KEYS.cart, items);
  }, [items, loaded]);

  const addToCart = (
    product,
    quantity = 1,
    selectedSize = '',
    selectedColor = '',
    unitPrice,
    stockLimit
  ) => {
    const safeQty = Math.max(1, Number(quantity || 1));
    const cartKey = getCartKey(product._id, selectedSize, selectedColor);
    const selectedVariant = findVariant(product, selectedSize, selectedColor);
    const resolvedPrice = Number(unitPrice ?? selectedVariant?.price ?? product.price);
    const resolvedStock = Number(stockLimit ?? selectedVariant?.stock ?? product.countInStock ?? 999);
    const resolvedImage = resolveCartImage(product, selectedVariant);

    setItems((current) => {
      const existing = current.find((item) => item.cartKey === cartKey);
      if (existing) {
        return current.map((item) =>
          item.cartKey === cartKey
            ? {
                ...item,
                quantity: Math.min(item.quantity + safeQty, resolvedStock),
                image: resolvedImage,
                price: resolvedPrice,
                countInStock: resolvedStock
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
          image: resolvedImage,
          price: resolvedPrice,
          countInStock: resolvedStock,
          selectedSize,
          selectedColor,
          quantity: Math.min(safeQty, resolvedStock)
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
          ? {
              ...item,
              quantity: Math.min(safeQty, item.countInStock || 999)
            }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [items]
  );

  const itemsCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      loaded,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      subtotal,
      itemsCount
    }),
    [items, loaded, subtotal, itemsCount]
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
