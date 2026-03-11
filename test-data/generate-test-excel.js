const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePaths = [
  // Desktop PDFs
  '/Users/balavp/Desktop/17449736170230DcPHIdLwnJZniOq.pdf',
  '/Users/balavp/Desktop/ServiceLetter.pdf',

  // Desktop Images
  '/Users/balavp/Desktop/download (1).png',
  '/Users/balavp/Desktop/Ytel-03-06-2026_01_47_AM.png',
  '/Users/balavp/Desktop/Screenshot 2026-02-15 at 4.41.30 PM.png',
  '/Users/balavp/Desktop/9323.jpg',
  '/Users/balavp/Desktop/image (5).png',
  '/Users/balavp/Desktop/test-high-quality.jpg',

  // App Icon PNGs (small sizes, good for testing)
  '/Users/balavp/Desktop/ytelapp/ios/ytel/Images.xcassets/AppIcon.appiconset/1024.png',
  '/Users/balavp/Desktop/ytelapp/ios/ytel/Images.xcassets/AppIcon.appiconset/216.png',
  '/Users/balavp/Desktop/ytelapp/ios/ytel/Images.xcassets/AppIcon.appiconset/167.png',
  '/Users/balavp/Desktop/ytelapp/ios/ytel/Images.xcassets/AppIcon.appiconset/128.png',
  '/Users/balavp/Desktop/ytelapp/ios/ytel/Images.xcassets/AppIcon.appiconset/114.png',
  '/Users/balavp/Desktop/ytelapp/ios/ytel/Images.xcassets/AppIcon.appiconset/100.png',
  '/Users/balavp/Desktop/ytelapp/ios/ytel/Images.xcassets/AppIcon.appiconset/88.png',
  '/Users/balavp/Desktop/ytelapp/ios/ytel/Images.xcassets/AppIcon.appiconset/76.png',
  '/Users/balavp/Desktop/ytelapp/ios/ytel/Images.xcassets/AppIcon.appiconset/72.png',
  '/Users/balavp/Desktop/ytelapp/ios/ytel/Images.xcassets/AppIcon.appiconset/66.png',
  '/Users/balavp/Desktop/ytelapp/ios/ytel/Images.xcassets/AppIcon.appiconset/60.png',
  '/Users/balavp/Desktop/ytelapp/ios/ytel/Images.xcassets/AppIcon.appiconset/58.png',

  // Downloads
  '/Users/balavp/Downloads/NoBrokerHood (3).pdf',
  '/Users/balavp/Downloads/ServiceLetter.pdf',
  '/Users/balavp/Downloads/screenshot-nimbusweb.me-2024.05.01-05_45_12 (1).png',
  '/Users/balavp/Downloads/chatsdk2/performance_model.png',
];

// Verify which files exist
console.log('Checking files...');
let existing = 0;
let missing = 0;
const validFiles = [];

filePaths.forEach(fp => {
  if (fs.existsSync(fp)) {
    existing++;
    validFiles.push(fp);
    const size = fs.statSync(fp).size;
    const ext = path.extname(fp).toUpperCase();
    console.log(`  ✓ ${ext.padEnd(5)} ${(size / 1024).toFixed(1).padStart(8)} KB - ${path.basename(fp)}`);
  } else {
    missing++;
    console.log(`  ✗ MISSING: ${fp}`);
  }
});

console.log(`\nFound ${existing}/${filePaths.length} files (${missing} missing)`);

if (validFiles.length === 0) {
  console.error('ERROR: No valid files found!');
  process.exit(1);
}

// Create Excel with file_path column
const data = validFiles.map((fp, idx) => ({
  id: idx + 1,
  file_path: fp,
  description: `Test file ${idx + 1} - ${path.basename(fp)}`,
}));

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Files');

const outPath = path.join(__dirname, 'test-batch.xlsx');
XLSX.writeFile(wb, outPath);
console.log(`\n✓ Created: ${outPath}`);
console.log(`  Total records: ${validFiles.length}`);
