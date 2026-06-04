const sharp = require('sharp');
const fs = require('fs');
const logger = require('../utils/logger');

const IMAGE_QUALITY_THRESHOLDS = {
  MIN_BRIGHTNESS: 25,
  MAX_BRIGHTNESS: 240,
  MIN_CONTRAST: 15,
  MIN_SHARPNESS: 10,
  MIN_FILE_SIZE: 1024,
  MAX_ASPECT_RATIO: 5,
};

const assessImageQuality = async (filePath, mimeType) => {
  if (!mimeType || !mimeType.startsWith('image/')) {
    return { pass: true, message: 'Not an image, skipping quality check', score: 100 };
  }

  const issues = [];

  const stats = fs.statSync(filePath);
  if (stats.size < IMAGE_QUALITY_THRESHOLDS.MIN_FILE_SIZE) {
    return {
      pass: false,
      score: 0,
      message: 'Image file is too small (possibly corrupt or empty)',
      quality: 'unusable',
      issues: ['File size too small'],
    };
  }

  const metadata = await sharp(filePath).metadata();

  if (metadata.width < 100 || metadata.height < 100) {
    issues.push({ severity: 'error', field: 'dimensions', message: `Image dimensions too small (${metadata.width}x${metadata.height})` });
  }

  if (metadata.width / metadata.height > IMAGE_QUALITY_THRESHOLDS.MAX_ASPECT_RATIO ||
      metadata.height / metadata.width > IMAGE_QUALITY_THRESHOLDS.MAX_ASPECT_RATIO) {
    issues.push({ severity: 'warning', field: 'aspectRatio', message: 'Extreme aspect ratio may indicate a corrupted or unusual image' });
  }

  const { data, info } = await sharp(filePath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  let totalBrightness = 0;
  let minR = 255, maxR = 0;
  const pixelCount = info.width * info.height;

  for (let i = 0; i < pixels.length; i += 3) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    totalBrightness += brightness;
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
  }

  const avgBrightness = totalBrightness / pixelCount;
  const contrast = maxR - minR;

  if (avgBrightness < IMAGE_QUALITY_THRESHOLDS.MIN_BRIGHTNESS) {
    issues.push({ severity: 'error', field: 'brightness', message: `Image is too dark (brightness: ${avgBrightness.toFixed(1)})` });
  } else if (avgBrightness > IMAGE_QUALITY_THRESHOLDS.MAX_BRIGHTNESS) {
    issues.push({ severity: 'warning', field: 'brightness', message: `Image is overexposed (brightness: ${avgBrightness.toFixed(1)})` });
  }

  if (contrast < IMAGE_QUALITY_THRESHOLDS.MIN_CONTRAST) {
    issues.push({ severity: 'error', field: 'contrast', message: `Image has very low contrast (${contrast.toFixed(1)})` });
  }

  const laplacianVariance = await _detectBlurriness(filePath);

  if (laplacianVariance < IMAGE_QUALITY_THRESHOLDS.MIN_SHARPNESS) {
    issues.push({ severity: 'error', field: 'sharpness', message: `Image appears blurry (sharpness: ${laplacianVariance.toFixed(1)})` });
  }

  const hasErrors = issues.filter(i => i.severity === 'error');

  let quality;
  if (hasErrors.length >= 2) {
    quality = 'unusable';
  } else if (hasErrors.length === 1) {
    quality = 'poor';
  } else if (issues.filter(i => i.severity === 'warning').length > 0) {
    quality = 'fair';
  } else {
    quality = 'good';
  }

  const errorDeduction = hasErrors.length * 30;
  const warningDeduction = issues.filter(i => i.severity === 'warning').length * 10;
  const score = Math.max(0, 100 - errorDeduction - warningDeduction);

  return {
    pass: quality !== 'unusable',
    score,
    quality,
    issues,
    metadata: {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      sizeBytes: stats.size,
    },
    brightness: parseFloat(avgBrightness.toFixed(1)),
    contrast: parseFloat(contrast.toFixed(1)),
    sharpness: parseFloat(laplacianVariance.toFixed(1)),
  };
};

const _detectBlurriness = async (filePath) => {
  try {
    const { data, info } = await sharp(filePath)
      .grayscale()
      .resize(300, null, { fit: 'inside' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Uint8Array(data);
    const width = info.width;
    const height = info.height;
    let sum = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const laplacian = Math.abs(
          pixels[idx] * 4
          - pixels[idx - 1]
          - pixels[idx + 1]
          - pixels[idx - width]
          - pixels[idx + width]
        );
        sum += laplacian;
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  } catch (err) {
    logger.warn(`Blur detection failed: ${err.message}`);
    return 100;
  }
};

module.exports = { assessImageQuality, IMAGE_QUALITY_THRESHOLDS };