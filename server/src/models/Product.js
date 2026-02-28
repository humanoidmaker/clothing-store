const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      trim: true
    },
    color: {
      type: String,
      default: '',
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    images: {
      type: [String],
      default: []
    }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    image: {
      type: String,
      default: 'https://placehold.co/600x400?text=Product'
    },
    images: {
      type: [String],
      default: []
    },
    brand: {
      type: String,
      default: 'Generic'
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    gender: {
      type: String,
      trim: true,
      default: 'Unisex'
    },
    sizes: {
      type: [String],
      default: []
    },
    colors: {
      type: [String],
      default: []
    },
    material: {
      type: String,
      default: ''
    },
    fit: {
      type: String,
      default: ''
    },
    variants: {
      type: [variantSchema],
      default: []
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    countInStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    numReviews: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Product', productSchema);
