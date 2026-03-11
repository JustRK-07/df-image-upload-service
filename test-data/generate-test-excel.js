const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePaths = [
  '/Users/balavp/Desktop/IMG_0942.jpg',
  '/Users/balavp/Desktop/9323.jpg',
  '/Users/balavp/Desktop/9322.jpg',
  '/Users/balavp/Desktop/test-high-quality.jpg',
  '/Users/balavp/Desktop/download (1).png',
  '/Users/balavp/Desktop/Ytel-03-06-2026_01_47_AM.png',
  '/Users/balavp/Desktop/Screenshot 2026-02-15 at 4.41.30 PM.png',
  '/Users/balavp/Desktop/image (5).png',
  '/Users/balavp/Desktop/ServiceLetter.pdf',
  '/Users/balavp/Desktop/203.pdf',
  '/Users/balavp/Desktop/CCStatement30-05-2025 (1).pdf',
  '/Users/balavp/Downloads/WhatsApp Image 2025-04-16 at 10.49.47 (1).jpeg',
  '/Users/balavp/Downloads/1652460302760_RtQPBEGaStmp.jpg',
  '/Users/balavp/Downloads/ScreenShot Tool -20250529055136.png',
  '/Users/balavp/Downloads/NoBrokerHood (3).pdf',
];

// Verify which files exist
let existing = 0;
let missing = 0;
filePaths.forEach(fp => {
  if (fs.existsSync(fp)) {
    existing++;
  } else {
    missing++;
    console.log('  MISSING:', fp);
  }
});
console.log(`Found ${existing}/${filePaths.length} files (${missing} missing)`);

const data = filePaths.map(fp => ({ file_path: fp }));

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Files');

const outPath = path.join(__dirname, 'test-batch.xlsx');
XLSX.writeFile(wb, outPath);
console.log('Created:', outPath);
