/**
 * A5: shrink a camera photo before upload.
 * Phone photos are 3-8 MB; the AI check needs far less. Longest side -> `max` px, JPEG.
 * createImageBitmap applies the EXIF rotation, so portrait photos stay upright.
 */
export async function downscalePhoto(file: Blob, max = 1024, quality = 0.8): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}
