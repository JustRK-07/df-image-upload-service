const path = require('path');
const multer = require('multer');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const THUMB_DIR = path.join(UPLOAD_DIR, 'thumbnails');
const META_DIR = path.join(UPLOAD_DIR, 'meta');
const ORIG_DIR = path.join(UPLOAD_DIR, 'originals');
const BATCH_DIR = path.join(UPLOAD_DIR, 'batch');

// Ensure upload directories exist
[UPLOAD_DIR, THUMB_DIR, META_DIR, ORIG_DIR, BATCH_DIR].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Multer config for single/multiple file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  },
});

// Multer config for batch CSV/Excel upload
const batchUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(file.mimetype) || ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel (.xlsx/.xls) files are allowed'));
    }
  },
});

function getExtFromMime(mime) {
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'application/pdf': '.pdf',
  };
  return map[mime] || '';
}

function getMimeFromExt(ext) {
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
  };
  return map[ext.toLowerCase()] || null;
}

module.exports = {
  UPLOAD_DIR,
  THUMB_DIR,
  META_DIR,
  ORIG_DIR,
  BATCH_DIR,
  upload,
  batchUpload,
  getExtFromMime,
  getMimeFromExt,
};
