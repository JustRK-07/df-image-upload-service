const fs = require('fs');
const path = require('path');
const { META_DIR } = require('./constants');

function saveMeta(id, meta) {
  fs.writeFileSync(path.join(META_DIR, `${id}.json`), JSON.stringify(meta));
}

function loadMeta(id) {
  const metaPath = path.join(META_DIR, `${id}.json`);
  if (fs.existsSync(metaPath)) {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  }
  return null;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

module.exports = { saveMeta, loadMeta, formatBytes };
