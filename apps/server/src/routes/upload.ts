import { FastifyInstance } from 'fastify';
import { processImage, isValidImage } from '../utils/imageProcessor.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadRoutes(fastify: FastifyInstance) {
  // Upload image
  fastify.post('/upload/image', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const data = await request.file({
        limits: {
          fileSize: MAX_FILE_SIZE,
        },
      });

      if (!data) {
        reply.code(400).send({ error: 'No file uploaded' });
        return;
      }

      // Read file buffer
      const buffer = await data.toBuffer();

      // Validate it's a valid image
      const isValid = await isValidImage(buffer);
      if (!isValid) {
        reply.code(400).send({ error: 'Invalid image file' });
        return;
      }

      // Process image (resize, remove EXIF, convert to WebP)
      const processedImage = await processImage(buffer);

      return {
        url: processedImage.url,
        filename: processedImage.filename,
      };
    } catch (error) {
      console.error('Error uploading image:', error);

      // Handle file size limit error
      if (error instanceof Error && error.message.includes('File size limit')) {
        reply.code(413).send({ error: 'File too large. Maximum size is 10MB' });
        return;
      }

      reply.code(500).send({ error: 'Failed to upload image' });
    }
  });
}
