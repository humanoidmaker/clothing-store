export const formatINR = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) {
    return 'INR 0';
  }

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `INR ${amount.toFixed(2)}`;
  }
};
