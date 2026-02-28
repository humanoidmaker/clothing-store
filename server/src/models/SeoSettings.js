const mongoose = require('mongoose');
const {
  defaultSeoMeta,
  buildDefaultPublicPages
} = require('../utils/seo');

const seoMetaSchema = new mongoose.Schema(
  {
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
  { _id: false }
);

const publicPageSeoSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    path: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140
    },
    meta: {
      type: seoMetaSchema,
      default: () => ({ ...defaultSeoMeta })
    }
  },
  { _id: false }
);

const seoSettingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      required: true,
      default: 'default',
      unique: true
    },
    defaults: {
      type: seoMetaSchema,
      default: () => ({ ...defaultSeoMeta })
    },
    publicPages: {
      type: [publicPageSeoSchema],
      default: () => buildDefaultPublicPages()
    }
  },
  {
    timestamps: true
  }
);

seoSettingsSchema.statics.defaultSeoMeta = defaultSeoMeta;
seoSettingsSchema.statics.defaultPublicPages = buildDefaultPublicPages;

module.exports = mongoose.models.SeoSettings || mongoose.model('SeoSettings', seoSettingsSchema);

