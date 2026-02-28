const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');

dotenv.config();

const sampleProducts = [
  {
    name: 'Humanoid Home Assistant',
    description: 'A voice-enabled humanoid for household routines and reminders.',
    image: 'https://images.unsplash.com/photo-1561144257-e32e8efc6c4f?auto=format&fit=crop&w=900&q=80',
    brand: 'HumanoidMaker',
    category: 'Home Robotics',
    price: 249900,
    countInStock: 8
  },
  {
    name: 'Industrial Inspection Bot',
    description: 'Factory-floor autonomous inspection robot with thermal cameras.',
    image: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=900&q=80',
    brand: 'HumanoidMaker',
    category: 'Industrial',
    price: 599900,
    countInStock: 4
  },
  {
    name: 'Healthcare Support Droid',
    description: 'Assists clinics with basic patient logistics and guidance.',
    image: 'https://images.unsplash.com/photo-1581091215367-59ab6a7d31ef?auto=format&fit=crop&w=900&q=80',
    brand: 'HumanoidMaker',
    category: 'Healthcare',
    price: 719900,
    countInStock: 6
  },
  {
    name: 'Education Companion Robot',
    description: 'Interactive classroom assistant for STEM learning experiences.',
    image: 'https://images.unsplash.com/photo-1535378620166-273708d44e4c?auto=format&fit=crop&w=900&q=80',
    brand: 'HumanoidMaker',
    category: 'Education',
    price: 329900,
    countInStock: 12
  },
  {
    name: 'Warehouse Mobility Unit',
    description: 'Humanoid warehouse mover built for long-cycle logistics tasks.',
    image: 'https://images.unsplash.com/photo-1581090700227-1e8f8c7f02e9?auto=format&fit=crop&w=900&q=80',
    brand: 'HumanoidMaker',
    category: 'Logistics',
    price: 829900,
    countInStock: 3
  },
  {
    name: 'Service Concierge Robot',
    description: 'Guest-facing humanoid with multilingual support for front desks.',
    image: 'https://images.unsplash.com/photo-1573164574572-cb89e39749b4?auto=format&fit=crop&w=900&q=80',
    brand: 'HumanoidMaker',
    category: 'Hospitality',
    price: 459900,
    countInStock: 10
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
