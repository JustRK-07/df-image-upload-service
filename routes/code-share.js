const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const getCodeShareHtml = require('../views/code-share');

const SHARE_DIR = path.join(__dirname, '..', 'uploads', 'code-shares');
const META_FILE = path.join(SHARE_DIR, '_versions.json');

fs.mkdirSync(SHARE_DIR, { recursive: true });

// Multer for ZIP uploads
const zipUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, SHARE_DIR),
    filename: (req, file, cb) => cb(null, `temp_${Date.now()}_${file.originalname}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed'));
    }
  },
});

// Load/save version metadata
function loadVersions() {
  if (fs.existsSync(META_FILE)) {
    return JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
  }
  return [];
}

function saveVersions(versions) {
  fs.writeFileSync(META_FILE, JSON.stringify(versions, null, 2));
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Code sharing UI page
router.get('/code-share', (req, res) => {
  res.send(getCodeShareHtml());
});

// Source files to include when packaging current code
const SOURCE_FILES = [
  'server.js',
  'package.json',
  'package-lock.json',
  'lib/constants.js',
  'lib/meta.js',
  'lib/compress.js',
  'routes/upload.js',
  'routes/files.js',
  'routes/batch.js',
  'routes/code-share.js',
  'views/index.js',
  'views/code-share.js',
  'test-data/generate-test-excel.js',
];
const OPTIONAL_FILES = ['.gitignore', '.env.example', 'Dockerfile', 'Procfile'];

// GET /code-share/download-current — download current source as versioned ZIP
router.get('/code-share/download-current', (req, res) => {
  const projectDir = path.join(__dirname, '..');
  const versions = loadVersions();
  const versionNum = versions.length + 1;
  const versionTag = 'v' + versionNum;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipName = `source-${versionTag}-${timestamp}.zip`;

  const archive = archiver('zip', { zlib: { level: 9 } });
  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${zipName}"`,
  });
  archive.pipe(res);

  for (const relPath of SOURCE_FILES) {
    const absPath = path.join(projectDir, relPath);
    if (fs.existsSync(absPath)) {
      archive.file(absPath, { name: relPath });
    }
  }
  for (const relPath of OPTIONAL_FILES) {
    const absPath = path.join(projectDir, relPath);
    if (fs.existsSync(absPath)) {
      archive.file(absPath, { name: relPath });
    }
  }

  archive.finalize();

  // Save version entry after piping starts
  res.on('finish', () => {
    const entry = {
      id: uuidv4(),
      version: versionTag,
      filename: zipName,
      direction: 'download',
      note: req.query.note || 'Source code download',
      createdAt: new Date().toISOString(),
      createdBy: req.query.author || 'unknown',
    };
    versions.push(entry);
    saveVersions(versions);
  });
});

// POST /code-share/upload — upload a source ZIP (shared by another person)
router.post('/code-share/upload', zipUpload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const versions = loadVersions();
    const versionNum = versions.length + 1;
    const versionTag = 'v' + versionNum;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const finalName = `source-${versionTag}-${timestamp}.zip`;
    const finalPath = path.join(SHARE_DIR, finalName);

    // Rename temp file to versioned name
    fs.renameSync(req.file.path, finalPath);

    const stat = fs.statSync(finalPath);
    const entry = {
      id: uuidv4(),
      version: versionTag,
      filename: finalName,
      originalName: req.file.originalname,
      size: stat.size,
      sizeFormatted: formatBytes(stat.size),
      direction: 'upload',
      note: req.body.note || 'Source code upload',
      createdAt: new Date().toISOString(),
      createdBy: req.body.author || 'unknown',
    };

    versions.push(entry);
    saveVersions(versions);

    res.json(entry);
  } catch (err) {
    // Clean up temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Code share upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /code-share/versions — list all versions
router.get('/code-share/versions', (req, res) => {
  const versions = loadVersions();
  // Add size info for files that exist on disk
  const enriched = versions.map(v => {
    const fp = path.join(SHARE_DIR, v.filename);
    if (fs.existsSync(fp)) {
      const stat = fs.statSync(fp);
      return { ...v, size: stat.size, sizeFormatted: formatBytes(stat.size), exists: true };
    }
    return { ...v, exists: false };
  });
  res.json({ count: enriched.length, versions: enriched.reverse() });
});

// GET /code-share/download/:id — download a specific version ZIP
router.get('/code-share/download/:id', (req, res) => {
  const versions = loadVersions();
  const entry = versions.find(v => v.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Version not found' });

  const fp = path.join(SHARE_DIR, entry.filename);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'ZIP file not found on disk' });

  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${entry.filename}"`,
  });
  res.sendFile(fp);
});

// DELETE /code-share/:id — delete a version
router.delete('/code-share/:id', (req, res) => {
  let versions = loadVersions();
  const entry = versions.find(v => v.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Version not found' });

  const fp = path.join(SHARE_DIR, entry.filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);

  versions = versions.filter(v => v.id !== req.params.id);
  saveVersions(versions);

  res.json({ deleted: true, id: req.params.id });
});

module.exports = router;
