const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const router = express.Router();

const { UPLOAD_DIR, THUMB_DIR, ORIG_DIR, upload, getExtFromMime } = require('../lib/constants');
const { saveMeta } = require('../lib/meta');
const { compressImage, compressPdf } = require('../lib/compress');

/**
 * POST /upload - Single file upload and compression
 *
 * Process:
 * 1. Receive file upload via multer (memory storage)
 * 2. Generate unique ID and save original file
 * 3. Compress based on file type (PDF or Image)
 * 4. Compare sizes and keep original if compressed is larger (smart skip)
 * 5. Generate thumbnail for images
 * 6. Save metadata and return results
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // Step 1.1: Validate file upload
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Step 1.2: Prepare file metadata
    const file = req.file;
    const id = uuidv4(); // Generate unique ID for this file
    const ext = path.extname(file.originalname).toLowerCase() || getExtFromMime(file.mimetype);
    const filename = `${id}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const originalSize = file.buffer.length;

    let result = {
      id,
      originalName: file.originalname,
      filename,
      originalSize,
      mimetype: file.mimetype,
      url: `${baseUrl}/files/${filename}`,
    };

    // Step 2: Save original file (for preview comparison)
    fs.writeFileSync(path.join(ORIG_DIR, filename), file.buffer);

    // Step 3: Start compression timer (measures compression only, not I/O)
    const compressionStartTime = Date.now();

    // Step 4: Compress based on file type
    if (file.mimetype === 'application/pdf') {
      // Step 4.1: PDF Compression using pdf-lib (lossless)
      const { outputBuffer, pageCount, title, author } = await compressPdf(file.buffer);
      fs.writeFileSync(filepath, outputBuffer);

      const compressionTime = Date.now() - compressionStartTime;
      const compressedSize = outputBuffer.length;
      const savingsPercent = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;

      result.type = 'pdf';
      result.compressedSize = compressedSize;
      result.savingsPercent = savingsPercent;
      result.size = compressedSize;
      result.pdf = { pageCount, title, author };
      result.compressionMethod = 'pdf-lib';
      result.compressionType = 'lossless';
      result.compressionTime = compressionTime;
    } else {
      // Step 4.2: Image Compression using sharp (quality: 85, near-lossless)
      const { outputBuffer, metadata } = await compressImage(file.buffer, file.mimetype, 85);

      const compressedSize = outputBuffer.length;
      const savingsPercent = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;

      // Step 4.3: Smart skip - if compressed is larger, keep original
      let finalBuffer = outputBuffer;
      let finalSize = compressedSize;
      let wasSkipped = false;

      if (compressedSize >= originalSize) {
        finalBuffer = file.buffer; // Use original instead
        finalSize = originalSize;
        wasSkipped = true;
      }

      // Step 4.4: Save the final file (compressed or original)
      fs.writeFileSync(filepath, finalBuffer);

      // Step 5: Generate thumbnail (200x200, 70% quality for preview)
      const thumbFilename = `thumb_${filename}`;
      await sharp(file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 70 })
        .toFile(path.join(THUMB_DIR, thumbFilename));

      const compressionTime = Date.now() - compressionStartTime;

      // Step 5.1: Populate image result metadata
      result.type = 'image';
      result.compressedSize = finalSize;
      result.savingsPercent = wasSkipped ? 0 : savingsPercent;
      result.size = finalSize;
      result.image = {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      };
      result.thumbnail = `${baseUrl}/files/thumbnails/${thumbFilename}`;
      result.compressionMethod = 'sharp';
      result.compressionType = wasSkipped ? 'none (original kept)' : 'near-lossless';
      result.quality = 85;
      result.compressionTime = compressionTime;
      result.compressionSkipped = wasSkipped;
    }

    // Step 6: Save metadata to JSON file for later retrieval
    saveMeta(id, result);

    // Step 7: Return success response with all metadata
    res.json(result);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Aggressive compress & download
router.post('/compress', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.file;
    const originalSize = file.buffer.length;
    let outputBuffer;
    let outputName;
    let contentType;

    if (file.mimetype === 'application/pdf') {
      const result = await compressPdf(file.buffer);
      outputBuffer = result.outputBuffer;
      outputName = file.originalname.replace(/\.pdf$/i, '_compressed.pdf');
      contentType = 'application/pdf';
    } else if (file.mimetype.includes('jpeg') || file.mimetype.includes('jpg')) {
      const result = await compressImage(file.buffer, file.mimetype, 50);
      outputBuffer = result.outputBuffer;
      outputName = file.originalname.replace(/\.(jpe?g)$/i, '_compressed.$1');
      contentType = 'image/jpeg';
    } else if (file.mimetype.includes('png')) {
      const result = await compressImage(file.buffer, file.mimetype, 30);
      outputBuffer = result.outputBuffer;
      outputName = file.originalname.replace(/\.png$/i, '_compressed.png');
      contentType = 'image/png';
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const compressedSize = outputBuffer.length;
    const savingsPercent = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${outputName}"`,
      'X-Original-Size': originalSize,
      'X-Compressed-Size': compressedSize,
      'X-Savings-Percent': savingsPercent,
    });
    res.send(outputBuffer);
  } catch (err) {
    console.error('Compress error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upload multiple files (up to 10)
router.post('/upload/multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const results = [];

    for (const file of req.files) {
      const id = uuidv4();
      const ext = path.extname(file.originalname).toLowerCase() || getExtFromMime(file.mimetype);
      const filename = `${id}${ext}`;
      const filepath = path.join(UPLOAD_DIR, filename);
      const originalSize = file.buffer.length;

      let result = {
        id,
        originalName: file.originalname,
        filename,
        originalSize,
        mimetype: file.mimetype,
        url: `${baseUrl}/files/${filename}`,
      };

      // Save original file
      fs.writeFileSync(path.join(ORIG_DIR, filename), file.buffer);

      const compressionStartTime = Date.now();

      if (file.mimetype === 'application/pdf') {
        const { outputBuffer, pageCount, title, author } = await compressPdf(file.buffer);
        fs.writeFileSync(filepath, outputBuffer);
        const compressionTime = Date.now() - compressionStartTime;
        const compressedSize = outputBuffer.length;
        result.type = 'pdf';
        result.compressedSize = compressedSize;
        result.savingsPercent = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;
        result.size = compressedSize;
        result.pdf = { pageCount, title, author };
        result.compressionMethod = 'pdf-lib';
        result.compressionType = 'lossless';
        result.compressionTime = compressionTime;
      } else {
        const { outputBuffer, metadata } = await compressImage(file.buffer, file.mimetype, 85);
        const compressedSize = outputBuffer.length;

        let finalBuffer = outputBuffer;
        let finalSize = compressedSize;
        let wasSkipped = false;

        if (compressedSize >= originalSize) {
          finalBuffer = file.buffer;
          finalSize = originalSize;
          wasSkipped = true;
        }

        fs.writeFileSync(filepath, finalBuffer);

        const thumbFilename = `thumb_${filename}`;
        await sharp(file.buffer)
          .resize(200, 200, { fit: 'cover' })
          .jpeg({ quality: 70 })
          .toFile(path.join(THUMB_DIR, thumbFilename));

        const compressionTime = Date.now() - compressionStartTime;

        result.type = 'image';
        result.compressedSize = finalSize;
        result.savingsPercent = wasSkipped ? 0 : (originalSize > 0 ? Math.round((1 - finalSize / originalSize) * 100) : 0);
        result.size = finalSize;
        result.image = { width: metadata.width, height: metadata.height, format: metadata.format };
        result.thumbnail = `${baseUrl}/files/thumbnails/${thumbFilename}`;
        result.compressionMethod = 'sharp';
        result.compressionType = wasSkipped ? 'none (original kept)' : 'near-lossless';
        result.quality = 85;
        result.compressionTime = compressionTime;
        result.compressionSkipped = wasSkipped;
      }

      saveMeta(id, result);
      results.push(result);
    }

    res.json({ count: results.length, files: results });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
