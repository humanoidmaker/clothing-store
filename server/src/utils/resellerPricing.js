const {
  normalizeHost,
  normalizeMargin,
  resolveRequestHost,
  findResellerByHost
} = require('./resellerStore');

const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));

const shouldApplyResellerPricing = (req, reseller) =>
  Boolean(reseller?.id) && !Boolean(req?.user?.isAdmin);

const resolveResellerContext = async (req) => {
  const host = resolveRequestHost(req);
  if (!host) {
    return {
      host: '',
      reseller: null
    };
  }

  const reseller = await findResellerByHost(host);
  return {
    host: normalizeHost(host),
    reseller
  };
};

const getProductMarginPercent = (reseller, productId) => {
  if (!reseller || !reseller.id) {
    return 0;
  }

  const normalizedId = String(productId || '').trim();
  const productMarginOverrides =
    reseller.productMargins && typeof reseller.productMargins === 'object' && !Array.isArray(reseller.productMargins)
      ? reseller.productMargins
      : {};

  if (Object.prototype.hasOwnProperty.call(productMarginOverrides, normalizedId)) {
    return normalizeMargin(productMarginOverrides[normalizedId], 0);
  }

  return normalizeMargin(reseller.defaultMarginPercent, 0);
};

const applyMarginToAmount = (amount, marginPercent) => {
  const baseAmount = Number(amount || 0);
  const normalizedMargin = normalizeMargin(marginPercent, 0);
  if (!Number.isFinite(baseAmount)) {
    return 0;
  }
  return roundCurrency(baseAmount * (1 + normalizedMargin / 100));
};

const applyResellerPricingToProduct = (product, reseller) => {
  if (!product || !reseller) {
    return product;
  }

  const source = typeof product.toObject === 'function' ? product.toObject() : { ...product };
  const marginPercent = getProductMarginPercent(reseller, source._id);
  const variants = Array.isArray(source.variants) ? source.variants : [];

  if (variants.length > 0) {
    const pricedVariants = variants.map((variant) => ({
      ...variant,
      price: applyMarginToAmount(variant?.price, marginPercent)
    }));

    const minVariantPrice = pricedVariants.reduce(
      (minimum, variant) => (Number(variant?.price || 0) < minimum ? Number(variant?.price || 0) : minimum),
      Number(pricedVariants[0]?.price || 0)
    );

    source.variants = pricedVariants;
    source.price = minVariantPrice;
  } else {
    source.price = applyMarginToAmount(source.price, marginPercent);
  }

  source.pricing = {
    applied: true,
    resellerId: reseller.id,
    resellerName: reseller.name,
    marginPercent
  };

  return source;
};

module.exports = {
  resolveResellerContext,
  shouldApplyResellerPricing,
  getProductMarginPercent,
  applyMarginToAmount,
  applyResellerPricingToProduct
};
