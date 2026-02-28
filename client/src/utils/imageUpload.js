export const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const maxImageFileSizeBytes = 10 * 1024 * 1024;
export const minImageDimension = 200;

const imageOptimizationProfiles = {
  product: {
    maxDimension: 1400,
    targetMaxBytes: 450 * 1024,
    initialQuality: 0.84,
    minimumQuality: 0.68,
    minimumDimensionAfterCompression: 1000
  },
  variant: {
    maxDimension: 1200,
    targetMaxBytes: 320 * 1024,
    initialQuality: 0.82,
    minimumQuality: 0.64,
    minimumDimensionAfterCompression: 800
  }
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected image'));
    reader.readAsDataURL(file);
  });

const readImageDimensions = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => reject(new Error('Invalid image file'));
    image.src = dataUrl;
  });

const loadImageElement = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Invalid image file'));
    image.src = dataUrl;
  });

const getDataUrlSizeBytes = (dataUrl) => {
  const base64Body = String(dataUrl || '').split(',')[1] || '';
  return Math.ceil((base64Body.length * 3) / 4);
};

const canvasToOptimizedDataUrl = (canvas, quality) => {
  const webpResult = canvas.toDataURL('image/webp', quality);
  if (webpResult.startsWith('data:image/webp')) {
    return webpResult;
  }

  return canvas.toDataURL('image/jpeg', quality);
};

const optimizeImageDataUrl = async (dataUrl, profileKey = 'product') => {
  const profile = imageOptimizationProfiles[profileKey] || imageOptimizationProfiles.product;
  const sourceImage = await loadImageElement(dataUrl);
  const largestSide = Math.max(sourceImage.width, sourceImage.height);
  const resizeRatio = Math.min(1, profile.maxDimension / largestSide);
  const resizedWidth = Math.max(1, Math.round(sourceImage.width * resizeRatio));
  const resizedHeight = Math.max(1, Math.round(sourceImage.height * resizeRatio));

  const canvas = document.createElement('canvas');
  canvas.width = resizedWidth;
  canvas.height = resizedHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    return dataUrl;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(sourceImage, 0, 0, resizedWidth, resizedHeight);

  const attemptedQualities = [
    profile.initialQuality,
    Math.max(profile.minimumQuality, profile.initialQuality - 0.1),
    profile.minimumQuality
  ];

  let bestResult = canvasToOptimizedDataUrl(canvas, attemptedQualities[0]);

  for (const quality of attemptedQualities) {
    const candidate = canvasToOptimizedDataUrl(canvas, quality);
    if (getDataUrlSizeBytes(candidate) < getDataUrlSizeBytes(bestResult)) {
      bestResult = candidate;
    }
    if (getDataUrlSizeBytes(candidate) <= profile.targetMaxBytes) {
      return candidate;
    }
  }

  const resizedLargestSide = Math.max(resizedWidth, resizedHeight);
  if (resizedLargestSide > profile.minimumDimensionAfterCompression) {
    const downscaleRatio = profile.minimumDimensionAfterCompression / resizedLargestSide;
    const compactWidth = Math.max(1, Math.round(resizedWidth * downscaleRatio));
    const compactHeight = Math.max(1, Math.round(resizedHeight * downscaleRatio));

    const compactCanvas = document.createElement('canvas');
    compactCanvas.width = compactWidth;
    compactCanvas.height = compactHeight;
    const compactContext = compactCanvas.getContext('2d');

    if (compactContext) {
      compactContext.imageSmoothingEnabled = true;
      compactContext.imageSmoothingQuality = 'high';
      compactContext.drawImage(sourceImage, 0, 0, compactWidth, compactHeight);

      const compactResult = canvasToOptimizedDataUrl(compactCanvas, profile.minimumQuality);
      if (getDataUrlSizeBytes(compactResult) < getDataUrlSizeBytes(bestResult)) {
        bestResult = compactResult;
      }
    }
  }

  return bestResult;
};

export const validateAndReadImage = async (file, profileKey = 'product') => {
  if (!allowedImageTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG, and WEBP images are allowed');
  }

  if (file.size > maxImageFileSizeBytes) {
    throw new Error('Each image size must be 10MB or less');
  }

  const dataUrl = await readFileAsDataUrl(file);
  const dimensions = await readImageDimensions(dataUrl);

  if (dimensions.width < minImageDimension || dimensions.height < minImageDimension) {
    throw new Error(`Each image must be at least ${minImageDimension}x${minImageDimension}`);
  }

  return optimizeImageDataUrl(dataUrl, profileKey);
};

export const readValidatedImages = async (files, profileKey = 'product') => {
  const validated = [];
  for (const file of files) {
    const dataUrl = await validateAndReadImage(file, profileKey);
    validated.push({
      file,
      dataUrl
    });
  }
  return validated;
};
