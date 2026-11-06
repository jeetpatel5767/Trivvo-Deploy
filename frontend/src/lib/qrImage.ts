import jsQR from 'jsqr';

/**
 * Read a QR code out of a picture (a screenshot or a photo of the code).
 *
 * The in-app camera scanner relies on the browser's BarcodeDetector, which desktop
 * Chrome on Windows does not have. This decodes the pixels ourselves instead, so a
 * saved screenshot works anywhere. Returns the text inside the code, or null if no
 * QR code could be found.
 */
export async function decodeQrFromImage(file: Blob): Promise<string | null> {
  // createImageBitmap applies the photo's rotation, so phone pictures stay upright.
  const bitmap = await createImageBitmap(file);

  // Huge screenshots are slow to scan and gain nothing; keep the longest side <= 1800px.
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    return null;
  }
  // White behind the picture so a transparent PNG doesn't read as a black square.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const pixels = ctx.getImageData(0, 0, width, height);
  // attemptBoth also reads light-on-dark codes, e.g. a screenshot taken in dark mode.
  const hit = jsQR(pixels.data, width, height, { inversionAttempts: 'attemptBoth' });
  return hit?.data ?? null;
}
