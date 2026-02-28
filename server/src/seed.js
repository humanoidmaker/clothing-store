const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');

dotenv.config();

const sampleProducts = [
  {
    name: 'Linen Resort Shirt',
    description: 'Breathable premium linen shirt with relaxed fit for warm-weather styling.',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
    brand: 'Astra Attire',
    category: 'Shirts',
    gender: 'Men',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['White', 'Sage', 'Sky Blue'],
    material: 'Linen',
    fit: 'Relaxed',
    price: 1999,
    countInStock: 28
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
    price: 1099,
    countInStock: 40
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
    price: 2499,
    countInStock: 22
  },
  {
    name: 'Tailored Formal Trousers',
    description: 'Lightweight formal trousers with slight taper and wrinkle resistance.',
    image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80',
    brand: 'Astra Attire',
    category: 'Trousers',
    gender: 'Men',
    sizes: ['30', '32', '34', '36', '38'],
    colors: ['Navy', 'Stone', 'Black'],
    material: 'Poly-Viscose Blend',
    fit: 'Tailored',
    price: 2199,
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
    colors: ['Coral', 'Teal', 'Floral Ivory'],
    material: 'Viscose',
    fit: 'Regular',
    price: 2799,
    countInStock: 18
  },
  {
    name: 'Quilted Bomber Jacket',
    description: 'Seasonal bomber jacket with soft lining and matte finish shell.',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80',
    brand: 'Astra Attire',
    category: 'Jackets',
    gender: 'Unisex',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Olive', 'Black', 'Sand'],
    material: 'Nylon Blend',
    fit: 'Regular',
    price: 3499,
    countInStock: 14
  },
  {
    name: 'Ribbed Crop Top',
    description: 'Stretch ribbed crop top for everyday pairing with high-rise bottoms.',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80',
    brand: 'Astra Attire',
    category: 'Tops',
    gender: 'Women',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Mocha', 'Ivory', 'Black'],
    material: 'Cotton-Spandex',
    fit: 'Slim',
    price: 899,
    countInStock: 32
  },
  {
    name: 'Athleisure Joggers',
    description: 'Tapered joggers with drawcord waist and brushed inner comfort.',
    image: 'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=900&q=80',
    brand: 'Astra Attire',
    category: 'Activewear',
    gender: 'Unisex',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Grey', 'Black', 'Navy'],
    material: 'Cotton Fleece',
    fit: 'Regular',
    price: 1599,
    countInStock: 36
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
  },
  {
    name: 'Pleated Co-ord Skirt',
    description: 'Light pleated skirt designed for effortless contemporary styling.',
    image: 'https://images.unsplash.com/photo-1583496661160-fb5886a13d46?auto=format&fit=crop&w=900&q=80',
    brand: 'Astra Attire',
    category: 'Skirts',
    gender: 'Women',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Mint', 'Black', 'Beige'],
    material: 'Poly Crepe',
    fit: 'A-Line',
    price: 1899,
    countInStock: 20
  }
];

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

    await Product.insertMany(sampleProducts);

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
