const mongoose = require('mongoose');
const { defaultSeoMeta } = require('../utils/seo');

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
    purchasePrice: {
      type: Number,
      min: 0,
      default: 0
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
    purchasePrice: {
      type: Number,
      min: 0,
      default: 0
    },
    seo: {
      title: { type: String, trim: true, default: defaultSeoMeta.title, maxlength: 120 },
      description: { type: String, trim: true, default: defaultSeoMeta.description, maxlength: 320 },
      keywords: { type: String, trim: true, default: defaultSeoMeta.keywords, maxlength: 320 },
      canonicalUrl: { type: String, trim: true, default: defaultSeoMeta.canonicalUrl, maxlength: 500 },
      robots: { type: String, trim: true, default: defaultSeoMeta.robots, maxlength: 220 },
      ogTitle: { type: String, trim: true, default: defaultSeoMeta.ogTitle, maxlength: 120 },
      ogDescription: { type: String, trim: true, default: defaultSeoMeta.ogDescription, maxlength: 320 },
      ogImage: { type: String, trim: true, default: defaultSeoMeta.ogImage, maxlength: 1000 },
      ogImageAlt: { type: String, trim: true, default: defaultSeoMeta.ogImageAlt, maxlength: 420 },
      ogType: { type: String, trim: true, default: defaultSeoMeta.ogType, maxlength: 60 },
      twitterCard: { type: String, trim: true, default: defaultSeoMeta.twitterCard, maxlength: 40 },
      twitterTitle: { type: String, trim: true, default: defaultSeoMeta.twitterTitle, maxlength: 120 },
      twitterDescription: { type: String, trim: true, default: defaultSeoMeta.twitterDescription, maxlength: 200 },
      twitterImage: { type: String, trim: true, default: defaultSeoMeta.twitterImage, maxlength: 1000 },
      twitterImageAlt: { type: String, trim: true, default: defaultSeoMeta.twitterImageAlt, maxlength: 420 },
      twitterSite: { type: String, trim: true, default: defaultSeoMeta.twitterSite, maxlength: 30 },
      twitterCreator: { type: String, trim: true, default: defaultSeoMeta.twitterCreator, maxlength: 30 }
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

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);

