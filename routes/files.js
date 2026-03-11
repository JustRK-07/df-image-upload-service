const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const router = express.Router();

const { UPLOAD_DIR, THUMB_DIR, META_DIR, ORIG_DIR } = require('../lib/constants');
const { loadMeta } = require('../lib/meta');

// Download source code as zip
router.get('/download-code', (req, res) => {
  const archive = archiver('zip', { zlib: { level: 9 } });
  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="upload-compress-service-poc.zip"',
  });
  archive.pipe(res);
  const projectDir = path.join(__dirname, '..');

  // Root files
  archive.file(path.join(projectDir, 'server.js'), { name: 'server.js' });
  archive.file(path.join(projectDir, 'package.json'), { name: 'package.json' });
  archive.file(path.join(projectDir, 'package-lock.json'), { name: 'package-lock.json' });

  // lib/
  archive.file(path.join(projectDir, 'lib', 'constants.js'), { name: 'lib/constants.js' });
  archive.file(path.join(projectDir, 'lib', 'meta.js'), { name: 'lib/meta.js' });
  archive.file(path.join(projectDir, 'lib', 'compress.js'), { name: 'lib/compress.js' });

  // routes/
  archive.file(path.join(projectDir, 'routes', 'upload.js'), { name: 'routes/upload.js' });
  archive.file(path.join(projectDir, 'routes', 'files.js'), { name: 'routes/files.js' });
  archive.file(path.join(projectDir, 'routes', 'batch.js'), { name: 'routes/batch.js' });

  // views/
  archive.file(path.join(projectDir, 'views', 'index.js'), { name: 'views/index.js' });

  // test-data/
  archive.file(path.join(projectDir, 'test-data', 'generate-test-excel.js'), { name: 'test-data/generate-test-excel.js' });

  // Optional root files
  ['.gitignore', '.env.example', 'Dockerfile', 'Procfile'].forEach(f => {
    const fp = path.join(projectDir, f);
    if (fs.existsSync(fp)) archive.file(fp, { name: f });
  });

  archive.finalize();
});

// Download original file
router.get('/download/:id/original', (req, res) => {
  const files = fs.readdirSync(ORIG_DIR);
  const match = files.find(f => f.startsWith(req.params.id));
  if (!match) {
    const compFiles = fs.readdirSync(UPLOAD_DIR);
    const compMatch = compFiles.find(f => f.startsWith(req.params.id) && !['thumbnails', 'meta', 'originals', 'batch'].includes(f));
    if (!compMatch) return res.status(404).json({ error: 'File not found' });
    const meta = loadMeta(req.params.id);
    const dlName = meta ? meta.originalName : compMatch;
    res.set('Content-Disposition', `attachment; filename="${dlName}"`);
    return res.sendFile(path.join(UPLOAD_DIR, compMatch));
  }
  const meta = loadMeta(req.params.id);
  const dlName = meta ? meta.originalName : match;
  res.set('Content-Disposition', `attachment; filename="${dlName}"`);
  res.sendFile(path.join(ORIG_DIR, match));
});

// Download compressed file
router.get('/download/:id/compressed', (req, res) => {
  const files = fs.readdirSync(UPLOAD_DIR);
  const match = files.find(f => f.startsWith(req.params.id) && !['thumbnails', 'meta', 'originals', 'batch'].includes(f));
  if (!match) return res.status(404).json({ error: 'File not found' });
  const meta = loadMeta(req.params.id);
  const baseName = meta ? meta.originalName.replace(/(\.[^.]+)$/, '_compressed$1') : match;
  res.set('Content-Disposition', `attachment; filename="${baseName}"`);
  res.sendFile(path.join(UPLOAD_DIR, match));
});

// Preview file in browser
router.get('/preview/:id', (req, res) => {
  const files = fs.readdirSync(UPLOAD_DIR);
  const match = files.find(f => f.startsWith(req.params.id) && !['thumbnails', 'meta', 'originals', 'batch'].includes(f));
  if (!match) return res.status(404).json({ error: 'File not found' });
  res.set('Content-Disposition', 'inline');
  res.sendFile(path.join(UPLOAD_DIR, match));
});

// Preview original file in browser
router.get('/preview/:id/original', (req, res) => {
  const files = fs.readdirSync(ORIG_DIR);
  const match = files.find(f => f.startsWith(req.params.id));
  if (!match) return res.status(404).json({ error: 'Original file not found' });
  res.set('Content-Disposition', 'inline');
  res.sendFile(path.join(ORIG_DIR, match));
});

// Get file info by id
router.get('/file/:id', (req, res) => {
  const meta = loadMeta(req.params.id);
  if (meta) return res.json(meta);

  const files = fs.readdirSync(UPLOAD_DIR);
  const match = files.find(f => f.startsWith(req.params.id) && !['thumbnails', 'meta', 'originals', 'batch'].includes(f));
  if (!match) return res.status(404).json({ error: 'File not found' });

  const filepath = path.join(UPLOAD_DIR, match);
  const stat = fs.statSync(filepath);
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.json({
    id: req.params.id,
    filename: match,
    size: stat.size,
    url: `${baseUrl}/files/${match}`,
    createdAt: stat.birthtime,
  });
});

// Delete file by id
router.delete('/file/:id', (req, res) => {
  const files = fs.readdirSync(UPLOAD_DIR);
  const match = files.find(f => f.startsWith(req.params.id) && !['thumbnails', 'meta', 'originals', 'batch'].includes(f));
  if (!match) return res.status(404).json({ error: 'File not found' });

  fs.unlinkSync(path.join(UPLOAD_DIR, match));

  const thumbFiles = fs.readdirSync(THUMB_DIR);
  const thumbMatch = thumbFiles.find(f => f.includes(req.params.id));
  if (thumbMatch) fs.unlinkSync(path.join(THUMB_DIR, thumbMatch));

  const origPath = path.join(ORIG_DIR, match);
  if (fs.existsSync(origPath)) fs.unlinkSync(origPath);

  const metaPath = path.join(META_DIR, `${req.params.id}.json`);
  if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);

  res.json({ deleted: true, id: req.params.id });
});

// List all uploaded files with compression metadata
router.get('/files-list', (req, res) => {
  const files = fs.readdirSync(UPLOAD_DIR)
    .filter(f => !['thumbnails', 'meta', 'originals', 'batch'].includes(f))
    .map(f => {
      const id = f.replace(/\.[^.]+$/, '');
      const stat = fs.statSync(path.join(UPLOAD_DIR, f));
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      const meta = loadMeta(id);
      if (meta) {
        meta.url = `${baseUrl}/files/${f}`;
        if (meta.thumbnail) {
          meta.thumbnail = `${baseUrl}/files/thumbnails/thumb_${f}`;
        }
        return meta;
      }

      const isPdf = f.endsWith('.pdf');
      return {
        id,
        filename: f,
        originalName: f,
        originalSize: stat.size,
        compressedSize: stat.size,
        savingsPercent: 0,
        size: stat.size,
        type: isPdf ? 'pdf' : 'image',
        mimetype: isPdf ? 'application/pdf' : 'image/jpeg',
        url: `${baseUrl}/files/${f}`,
        thumbnail: isPdf ? null : `${baseUrl}/files/thumbnails/thumb_${f}`,
        createdAt: stat.birthtime,
      };
    });

  res.json({ count: files.length, files });
});

module.exports = router;
