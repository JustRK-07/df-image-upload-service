const XLSX = require('xlsx');
const path = require('path');

// Online sample files - PDFs and images
const onlineFiles = [
  // Sample PDFs (under 3MB)
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://www.orimi.com/pdf-test.pdf',
  'https://www.antennahouse.com/hubfs/xsl-fo-sample/pdf/basic-link-1.pdf',
  'https://filesamples.com/samples/document/pdf/sample1.pdf',
  'https://filesamples.com/samples/document/pdf/sample2.pdf',
  'https://filesamples.com/samples/document/pdf/sample3.pdf',
  'https://pdfobject.com/pdf/sample.pdf',
  'https://www.w3.org/WAI/WCAG21/working-examples/pdf-table/table.pdf',
  'https://www.iso.org/files/live/sites/isoorg/files/store/en/PUB100080.pdf',
  'https://www.learningcontainer.com/wp-content/uploads/2019/09/sample-pdf-file.pdf',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',

  // Sample JPEGs/PNGs (under 500KB)
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=400',
  'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=400',
  'https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=400',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
  'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=400',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=400',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400',
  'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400',
  'https://picsum.photos/400/300',
  'https://picsum.photos/500/400',
];

// Create Excel with file_path column
const data = onlineFiles.map((url, idx) => {
  const isPdf = url.toLowerCase().includes('.pdf') || url.includes('sample-pdf');
  const type = isPdf ? 'PDF' : 'Image';
  const description = isPdf
    ? `Sample PDF document ${idx + 1}`
    : `Sample image ${idx + 1}`;

  return {
    id: idx + 1,
    file_path: url,
    type: type,
    description: description,
  };
});

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Files');

const outPath = path.join(__dirname, 'test-batch-online.xlsx');
XLSX.writeFile(wb, outPath);

console.log(`✓ Created: ${outPath}`);
console.log(`  Total records: ${onlineFiles.length}`);
console.log(`  PDFs: ${data.filter(d => d.type === 'PDF').length}`);
console.log(`  Images: ${data.filter(d => d.type === 'Image').length}`);
console.log('\nColumns: id, file_path, type, description');
console.log('\nReady for batch processing with online URLs!');
