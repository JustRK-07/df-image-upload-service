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

// POST /batch-process — upload CSV/Excel, compress all listed files
router.post('/batch-process', batchUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

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
    const fileResults = [];

    for (let i = 0; i < rows.length; i++) {
      const filePath = rows[i][pathCol];
      const entry = {
        index: i + 1,
        filePath,
        status: 'pending',
        type: null,
        originalSize: 0,
        compressedSize: 0,
        savings: '0%',
        savingsPercent: 0,
        error: null,
      };

      try {
        if (!filePath || typeof filePath !== 'string') {
          throw new Error('Empty or invalid file path');
        }

        if (!fs.existsSync(filePath)) {
          throw new Error('File not found');
        }

        const ext = path.extname(filePath).toLowerCase();
        const mime = getMimeFromExt(ext);
        if (!mime) {
          throw new Error(`Unsupported file type: ${ext}`);
        }

        const buffer = fs.readFileSync(filePath);
        const originalSize = buffer.length;
        entry.originalSize = originalSize;
        totalOriginal += originalSize;

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

        const compressedSize = outputBuffer.length;
        entry.compressedSize = compressedSize;
        totalCompressed += compressedSize;

        const savingsPercent = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;
        entry.savingsPercent = savingsPercent;
        entry.savings = savingsPercent + '%';
        entry.status = 'success';
        successCount++;

        // Save compressed file into batch dir
        const outName = path.basename(filePath);
        fs.writeFileSync(path.join(batchDir, outName), outputBuffer);
      } catch (err) {
        entry.status = 'error';
        entry.error = err.message;
        failedCount++;
      }

      fileResults.push(entry);
    }

    const totalSavings = totalOriginal > 0 ? Math.round((1 - totalCompressed / totalOriginal) * 100) : 0;

    res.json({
      batchId,
      total: rows.length,
      success: successCount,
      failed: failedCount,
      totalOriginal,
      totalCompressed,
      totalSavings: totalSavings + '%',
      totalOriginalFormatted: formatBytes(totalOriginal),
      totalCompressedFormatted: formatBytes(totalCompressed),
      totalSavedFormatted: formatBytes(totalOriginal - totalCompressed),
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
  for (const file of files) {
    archive.file(path.join(batchDir, file), { name: file });
  }
  archive.finalize();
});

module.exports = router;
