import sharp from 'sharp';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const MAX_SIZE = 1280;

interface ProcessedImage {
  filename: string;
  path: string;
  url: string;
}

/**
 * Process an image: resize to max 1280px, remove EXIF, convert to WebP
 * @param buffer - Image buffer to process
 * @returns Processed image information
 */
export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  const filename = `${randomUUID()}.webp`;
  const filePath = path.join(UPLOAD_DIR, filename);

  // Get image metadata to determine orientation
  const metadata = await sharp(buffer).metadata();

  // Determine resize dimensions based on orientation
  let resizeOptions: { width?: number; height?: number } = {};

  if (metadata.width && metadata.height) {
    if (metadata.width > metadata.height) {
      // Landscape: limit width
      if (metadata.width > MAX_SIZE) {
        resizeOptions.width = MAX_SIZE;
      }
    } else {
      // Portrait or square: limit height
      if (metadata.height > MAX_SIZE) {
        resizeOptions.height = MAX_SIZE;
      }
    }
  }

  // Process image: resize, strip EXIF, convert to WebP
  await sharp(buffer)
    .resize(resizeOptions.width || resizeOptions.height ? resizeOptions : undefined)
    .withMetadata(false) // Remove all EXIF/metadata
    .webp({ quality: 85 }) // Convert to WebP with good quality
    .toFile(filePath);

  return {
    filename,
    path: filePath,
    url: `/uploads/${filename}`,
  };
}

/**
 * Validate if the buffer is a valid image
 * @param buffer - Buffer to validate
 * @returns true if valid image
 */
export async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return !!metadata.format;
  } catch (error) {
    return false;
  }
}
