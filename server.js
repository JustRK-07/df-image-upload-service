const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const { UPLOAD_DIR } = require('./lib/constants');
const getIndexHtml = require('./views/index');
const uploadRoutes = require('./routes/upload');
const fileRoutes = require('./routes/files');
const batchRoutes = require('./routes/batch');
const codeShareRoutes = require('./routes/code-share');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use('/files', express.static(UPLOAD_DIR));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'file-upload-compress' });
});

// UI
app.get('/', (req, res) => {
  res.send(getIndexHtml());
});

// Routes
app.use(uploadRoutes);
app.use(fileRoutes);
app.use(batchRoutes);
app.use(codeShareRoutes);

// Error handler for multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Upload & Compress service running on port ${PORT}`);
  console.log(`Uploads stored in: ${UPLOAD_DIR}`);
});
