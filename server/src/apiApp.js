const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const seoRoutes = require('./routes/seoRoutes');

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
connectDB();

const apiApp = express();

apiApp.use(cors());
apiApp.use(express.json({ limit: '100mb' }));

if (process.env.NODE_ENV !== 'production') {
  apiApp.use(morgan('dev'));
}

apiApp.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

apiApp.use('/auth', authRoutes);
apiApp.use('/products', productRoutes);
apiApp.use('/orders', orderRoutes);
apiApp.use('/settings', settingsRoutes);
apiApp.use('/seo', seoRoutes);

apiApp.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

apiApp.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Server error'
  });
});

module.exports = apiApp;
