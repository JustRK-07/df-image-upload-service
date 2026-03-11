const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const archiver = require('archiver');
const router = express.Router();

const { BATCH_DIR, batchUpload, getMimeFromExt } = require('../lib/constants');
const { formatBytes } = require('../lib/meta');
const { compressImage, compressPdf } = require('../lib/compress');

// GET /batch-sample-excel — download sample Excel template
router.get('/batch-sample-excel', (req, res) => {
  const samplePath = path.join(__dirname, '..', 'test-data', 'test-batch-online.xlsx');
  if (!fs.existsSync(samplePath)) {
    return res.status(404).json({ error: 'Sample file not found' });
  }
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="batch-processing-sample.xlsx"',
  });
  res.sendFile(samplePath);
});

// Cleanup old batch directories (older than 1 hour)
function cleanupOldBatches() {
  try {
    if (!fs.existsSync(BATCH_DIR)) return;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const dirs = fs.readdirSync(BATCH_DIR);

    dirs.forEach(dir => {
      const dirPath = path.join(BATCH_DIR, dir);
      const stat = fs.statSync(dirPath);
      if (stat.isDirectory() && (now - stat.mtimeMs) > oneHour) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`Cleaned up old batch directory: ${dir}`);
      }
    });
  } catch (err) {
    console.error('Error cleaning up old batches:', err);
  }
}

// POST /batch-process — upload CSV/Excel, compress all listed files
router.post('/batch-process', batchUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Clean up old batch directories before starting
    cleanupOldBatches();

    // Parse the spreadsheet/CSV
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Spreadsheet is empty' });
    }

    // Auto-detect the file path column
    const firstRow = rows[0];
    const pathColCandidates = ['file_path', 'file', 'path', 'filepath', 'File_Path', 'File', 'Path', 'FilePath'];
    let pathCol = null;
    for (const candidate of pathColCandidates) {
      if (firstRow[candidate] !== undefined) {
        pathCol = candidate;
        break;
      }
    }
    // Case-insensitive fallback
    if (!pathCol) {
      const keys = Object.keys(firstRow);
      for (const key of keys) {
        if (pathColCandidates.map(c => c.toLowerCase()).includes(key.toLowerCase())) {
          pathCol = key;
          break;
        }
      }
    }
    if (!pathCol) {
      return res.status(400).json({
        error: 'Could not find a file path column. Expected one of: file_path, file, path, filepath',
        columns: Object.keys(firstRow),
      });
    }

    const batchId = uuidv4();
    const batchDir = path.join(BATCH_DIR, batchId);
    fs.mkdirSync(batchDir, { recursive: true });

    let totalOriginal = 0;
    let totalCompressed = 0;
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0; // Files skipped due to validation (>2MB)
    let totalSavingsPercent = 0; // Sum of individual savings percentages
    let filesWithSavings = 0; // Count of files with savings > 0%
    const fileResults = [];
    const fileManifest = {}; // Map index to saved filename

    // Process files in parallel (5 at a time)
    const BATCH_SIZE = 5;

    const processFile = async (row, index) => {
      const filePath = row[pathCol];
      const entry = {
        index: index + 1,
        filePath,
        status: 'pending',
        type: null,
        originalSize: 0,
        compressedSize: 0,
        savings: '0%',
        savingsPercent: 0,
        error: null,
        compressionTime: 0,
      };

      try {
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('Empty or invalid file path');
        }

        let buffer;
        let ext;

        // Check if it's a URL
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
          // Download from URL
          const response = await fetch(filePath);
          if (!response.ok) {
            throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);

          // Get extension from URL or Content-Type
          const urlPath = new URL(filePath).pathname;
          ext = path.extname(urlPath).toLowerCase();
          if (!ext) {
            const contentType = response.headers.get('content-type');
            if (contentType.includes('pdf')) ext = '.pdf';
            else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
            else if (contentType.includes('png')) ext = '.png';
          }
        } else {
          // Local file path
          if (!fs.existsSync(filePath)) {
            throw new Error('File not found');
          }
          buffer = fs.readFileSync(filePath);
          ext = path.extname(filePath).toLowerCase();
        }

        const mime = getMimeFromExt(ext);
        if (!mime) {
          throw new Error(`Unsupported file type: ${ext}`);
        }

        const originalSize = buffer.length;
        entry.originalSize = originalSize;

        // Validate file size: reject files > 2 MB
        const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
        if (originalSize > MAX_FILE_SIZE) {
          throw new Error(`File too large (${(originalSize / 1024 / 1024).toFixed(2)} MB). Maximum allowed: 2 MB`);
        }

        // Start compression timer (only measure compression, not download)
        const compressionStartTime = Date.now();

        let outputBuffer;
        if (mime === 'application/pdf') {
          entry.type = 'PDF';
          const result = await compressPdf(buffer);
          outputBuffer = result.outputBuffer;
        } else {
          entry.type = mime.includes('png') ? 'PNG' : 'JPEG';
          const result = await compressImage(buffer, mime, 85);
          outputBuffer = result.outputBuffer;
        }

        // Calculate compression time (excluding download and file I/O)
        entry.compressionTime = Date.now() - compressionStartTime;

        let compressedSize = outputBuffer.length;
        let finalBuffer = outputBuffer;

        // Smart skip: if compressed is larger, keep original
        if (compressedSize >= originalSize) {
          finalBuffer = buffer;
          compressedSize = originalSize;
        }

        entry.compressedSize = compressedSize;

        const savingsPercent = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;
        entry.savingsPercent = savingsPercent;
        entry.savings = savingsPercent + '%';
        entry.status = 'success';

        // Save both original and compressed files into batch dir
        const sanitizedBasename = path.basename(filePath).replace(/[^a-zA-Z0-9._-]/g, '_');
        const origName = `${index}_original_${sanitizedBasename}`;
        const compName = `${index}_compressed_${sanitizedBasename}`;

        fs.writeFileSync(path.join(batchDir, origName), buffer);
        fs.writeFileSync(path.join(batchDir, compName), finalBuffer);

        entry.originalFilename = origName;
        entry.compressedFilename = compName;

        return { entry, originalSize, compressedSize, success: true };
      } catch (err) {
        entry.status = 'error';
        entry.error = err.message;
        entry.compressionTime = 0; // No compression time for failed files
        return { entry, originalSize: 0, compressedSize: 0, success: false };
      }
    };

    // Process in batches of 5 files at a time
    let processedCount = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const promises = batch.map((row, idx) => processFile(row, i + idx));
      const results = await Promise.all(promises);

      results.forEach(result => {
        fileResults.push(result.entry);
        if (result.success) {
          // Calculate savings percentage for this file
          const savings = result.originalSize > 0
            ? Math.round((1 - result.compressedSize / result.originalSize) * 100)
            : 0;

          // Add to running totals (for byte-based calculation if needed)
          totalOriginal += result.originalSize;
          totalCompressed += result.compressedSize;

          // Add to average calculation (sum of percentages)
          if (savings > 0) {
            totalSavingsPercent += savings;
            filesWithSavings++;
          }

          successCount++;
        } else {
          // Check if it's a size validation error
          if (result.entry.error && result.entry.error.includes('File too large')) {
            skippedCount++;
          } else {
            failedCount++;
          }
        }
        processedCount++;
      });

      // Log progress
      console.log(`Batch progress: ${processedCount}/${rows.length} files processed`);
    }

    // Calculate average savings: sum of percentages / count of files with savings
    const avgSavings = filesWithSavings > 0 ? Math.round(totalSavingsPercent / filesWithSavings) : 0;
    const totalSaved = totalOriginal - totalCompressed;

    // Debug logging
    console.log(`Batch complete: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped`);
    console.log(`Files with savings: ${filesWithSavings}`);
    console.log(`Total Original: ${totalOriginal} bytes (${formatBytes(totalOriginal)})`);
    console.log(`Total Compressed: ${totalCompressed} bytes (${formatBytes(totalCompressed)})`);
    console.log(`Average Savings: ${avgSavings}% (sum: ${totalSavingsPercent}% / count: ${filesWithSavings})`);

    // Save manifest for preview access
    const manifest = {};
    fileResults.forEach(f => {
      if (f.originalFilename && f.compressedFilename) {
        manifest[f.index] = {
          original: f.originalFilename,
          compressed: f.compressedFilename,
          type: f.type,
        };
      }
    });
    fs.writeFileSync(path.join(batchDir, '_manifest.json'), JSON.stringify(manifest, null, 2));

    res.json({
      batchId,
      total: rows.length,
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
      totalOriginal,
      totalCompressed,
      totalSavings: avgSavings + '%',
      totalOriginalFormatted: formatBytes(totalOriginal),
      totalCompressedFormatted: formatBytes(totalCompressed),
      totalSavedFormatted: formatBytes(totalSaved > 0 ? totalSaved : 0),
      filesWithSavings: filesWithSavings,
      files: fileResults,
    });
  } catch (err) {
    console.error('Batch process error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /batch-download/:batchId — ZIP all compressed files and stream
router.get('/batch-download/:batchId', (req, res) => {
  const batchDir = path.join(BATCH_DIR, req.params.batchId);
  if (!fs.existsSync(batchDir)) {
    return res.status(404).json({ error: 'Batch not found' });
  }

  const archive = archiver('zip', { zlib: { level: 9 } });
  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="batch-${req.params.batchId}.zip"`,
  });

  archive.pipe(res);
  const files = fs.readdirSync(batchDir);
  // Only include compressed files in the ZIP (skip originals and manifest)
  for (const file of files) {
    if (file.startsWith('_') || file.includes('_original_')) {
      continue; // Skip manifest and original files
    }
    // Remove the index prefix for cleaner filenames in ZIP
    const cleanName = file.replace(/^\d+_compressed_/, '');
    archive.file(path.join(batchDir, file), { name: cleanName });
  }
  archive.finalize();
});

// GET /batch-file/:batchId/:index/:type — Get original or compressed file from batch
// type can be 'original' or 'compressed' (default: compressed)
router.get('/batch-file/:batchId/:index/:type?', (req, res) => {
  const batchDir = path.join(BATCH_DIR, req.params.batchId);
  if (!fs.existsSync(batchDir)) {
    return res.status(404).json({ error: 'Batch not found' });
  }

  const manifestPath = path.join(batchDir, '_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: 'Manifest not found' });
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const index = req.params.index;
  const type = req.params.type || 'compressed';

  if (!manifest[index]) {
    return res.status(404).json({ error: 'File not found in manifest' });
  }

  const fileInfo = manifest[index];
  const filename = type === 'original' ? fileInfo.original : fileInfo.compressed;

  if (!filename) {
    return res.status(404).json({ error: `${type} file not found in manifest` });
  }

  const filepath = path.join(batchDir, filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  const ext = path.extname(filename).toLowerCase();
  const mime = getMimeFromExt(ext);

  res.set('Content-Type', mime || 'application/octet-stream');
  res.sendFile(filepath);
});

module.exports = router;
