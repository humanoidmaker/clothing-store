const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const sampleProducts = [
  {
    name: 'Nike Air Max Pulse',
    description: 'Breathable running-inspired Nike shoes with responsive cushioning for all-day comfort.',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
    brand: 'Nike',
    category: 'Shoes',
    gender: 'Men',
    sizes: ['7', '8', '9', '10', '11'],
    colors: ['Black/White'],
    material: 'Mesh + Rubber',
    fit: 'Regular',
    variants: [
      { size: '7', color: 'Black/White', price: 6499, stock: 4 },
      { size: '8', color: 'Black/White', price: 6699, stock: 6 },
      { size: '9', color: 'Black/White', price: 6899, stock: 7 },
      { size: '10', color: 'Black/White', price: 7099, stock: 5 },
      { size: '11', color: 'Black/White', price: 7299, stock: 3 }
    ],
    price: 6499,
    countInStock: 25
  },
  {
    name: 'Nike Court Vision Low',
    description: 'Classic low-top sneaker silhouette with durable outsole and clean Nike styling.',
    image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=80',
    brand: 'Nike',
    category: 'Shoes',
    gender: 'Unisex',
    sizes: ['6', '7', '8', '9', '10'],
    colors: ['White/Green'],
    material: 'Synthetic Leather',
    fit: 'Regular',
    variants: [
      { size: '6', color: 'White/Green', price: 5399, stock: 5 },
      { size: '7', color: 'White/Green', price: 5499, stock: 7 },
      { size: '8', color: 'White/Green', price: 5599, stock: 8 },
      { size: '9', color: 'White/Green', price: 5799, stock: 6 },
      { size: '10', color: 'White/Green', price: 5999, stock: 4 }
    ],
    price: 5399,
    countInStock: 30
  },
  {
    name: 'Linen Resort Shirt',
    description: 'Breathable premium linen shirt with relaxed fit for warm-weather styling.',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
    brand: 'Astra Attire',
    category: 'Shirts',
    gender: 'Men',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['White', 'Sage'],
    material: 'Linen',
    fit: 'Relaxed',
    variants: [
      { size: 'S', color: 'White', price: 1799, stock: 6 },
      { size: 'M', color: 'White', price: 1899, stock: 8 },
      { size: 'L', color: 'White', price: 1999, stock: 7 },
      { size: 'XL', color: 'White', price: 2099, stock: 4 },
      { size: 'M', color: 'Sage', price: 1949, stock: 5 },
      { size: 'L', color: 'Sage', price: 2049, stock: 5 }
    ],
    price: 1799,
    countInStock: 35
  },
  {
    name: 'Oversized Graphic Tee',
    description: 'Soft cotton oversized t-shirt with streetwear-inspired back print.',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
    brand: 'Astra Attire',
    category: 'T-Shirts',
    gender: 'Unisex',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black', 'Off White', 'Charcoal'],
    material: 'Cotton',
    fit: 'Oversized',
    variants: [
      { size: 'S', color: 'Black', price: 999, stock: 10 },
      { size: 'M', color: 'Black', price: 1099, stock: 12 },
      { size: 'L', color: 'Black', price: 1149, stock: 11 },
      { size: 'XL', color: 'Black', price: 1199, stock: 8 },
      { size: 'M', color: 'Off White', price: 1129, stock: 8 },
      { size: 'L', color: 'Off White', price: 1179, stock: 7 }
    ],
    price: 999,
    countInStock: 56
  },
  {
    name: 'High Rise Wide-Leg Jeans',
    description: 'Structured denim jeans with a modern high-rise silhouette.',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80',
    brand: 'Astra Attire',
    category: 'Jeans',
    gender: 'Women',
    sizes: ['26', '28', '30', '32', '34'],
    colors: ['Indigo', 'Washed Blue'],
    material: 'Denim',
    fit: 'Wide Leg',
    variants: [
      { size: '26', color: 'Indigo', price: 2299, stock: 4 },
      { size: '28', color: 'Indigo', price: 2399, stock: 6 },
      { size: '30', color: 'Indigo', price: 2499, stock: 7 },
      { size: '32', color: 'Indigo', price: 2599, stock: 5 },
      { size: '34', color: 'Indigo', price: 2699, stock: 4 }
    ],
    price: 2299,
    countInStock: 26
  },
  {
    name: 'Flowy Midi Dress',
    description: 'Printed midi dress with soft drape and all-day comfort.',
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80',
    brand: 'Astra Attire',
    category: 'Dresses',
    gender: 'Women',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Coral', 'Teal'],
    material: 'Viscose',
    fit: 'Regular',
    variants: [
      { size: 'XS', color: 'Coral', price: 2399, stock: 3 },
      { size: 'S', color: 'Coral', price: 2499, stock: 5 },
      { size: 'M', color: 'Coral', price: 2599, stock: 6 },
      { size: 'L', color: 'Coral', price: 2699, stock: 4 },
      { size: 'M', color: 'Teal', price: 2649, stock: 5 }
    ],
    price: 2399,
    countInStock: 23
  },
  {
    name: 'Athleisure Joggers',
    description: 'Tapered joggers with drawcord waist and brushed inner comfort.',
    image: 'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=900&q=80',
    brand: 'Astra Attire',
    category: 'Activewear',
    gender: 'Unisex',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Grey', 'Black'],
    material: 'Cotton Fleece',
    fit: 'Regular',
    variants: [
      { size: 'S', color: 'Grey', price: 1399, stock: 6 },
      { size: 'M', color: 'Grey', price: 1499, stock: 8 },
      { size: 'L', color: 'Grey', price: 1599, stock: 9 },
      { size: 'XL', color: 'Grey', price: 1699, stock: 5 },
      { size: 'M', color: 'Black', price: 1549, stock: 7 },
      { size: 'L', color: 'Black', price: 1649, stock: 6 }
    ],
    price: 1399,
    countInStock: 41
  },
  {
    name: 'Classic Polo Shirt',
    description: 'Breathable pique polo suitable for casual office and weekend wear.',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80',
    brand: 'Astra Attire',
    category: 'Polos',
    gender: 'Men',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Maroon', 'Navy', 'White'],
    material: 'Pique Cotton',
    fit: 'Regular',
    price: 1299,
    countInStock: 30
  }
];

const estimatePurchasePrice = (sellPrice) => Math.max(0, Math.round(Number(sellPrice || 0) * 0.58));

const withPurchasePricing = sampleProducts.map((product) => {
  const variants = Array.isArray(product.variants)
    ? product.variants.map((variant) => ({
      ...variant,
      purchasePrice: Number(variant.purchasePrice ?? estimatePurchasePrice(variant.price))
    }))
    : [];

  return {
    ...product,
    variants,
    purchasePrice: Number(
      product.purchasePrice ??
      (variants.length > 0 ? Math.min(...variants.map((variant) => variant.purchasePrice)) : estimatePurchasePrice(product.price))
    )
  };
});

const seed = async () => {
  try {
    await connectDB();

    await User.deleteMany({});
    await Product.deleteMany({});

    await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      isAdmin: true
    });

    await Product.insertMany(withPurchasePricing);

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();

