import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Multer in-memory storage (suitable for piping to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/single', authenticateToken, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;

    // Upload to Cloudinary using stream
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: process.env.CLOUDINARY_FOLDER || 'shikfy/uploads',
        public_id: fileName.split('.')[0],
        resource_type: 'auto',
      }, (error, uploaded) => {
        if (error) return reject(error);
        resolve(uploaded);
      });

      stream.end(fileBuffer);
    });

    // Build a thumbnail for videos and include duration
    let videoThumbnail: string | undefined;
    let duration: number | undefined;
    if (result.resource_type === 'video') {
      duration = result.duration;
      // Generate a jpg thumbnail from 1s into the video
      const publicId = result.public_id; // includes folder
      // cloudinary.url will create a delivery URL with transformations
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { v2: cl } = require('cloudinary');
      videoThumbnail = cl.url(publicId, {
        resource_type: 'video',
        secure: true,
        format: 'jpg',
        transformation: [
          { start_offset: '1' },
          { crop: 'fill', width: 720, height: 1280 }
        ]
      });
    }

    res.status(201).json({
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      format: result.format,
      resource_type: result.resource_type,
      duration,
      thumbnail: videoThumbnail,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
