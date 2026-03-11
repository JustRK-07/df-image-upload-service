const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

/**
 * Compress an image buffer (JPEG or PNG).
 * @param {Buffer} buffer - raw image bytes
 * @param {string} mimetype - e.g. 'image/jpeg', 'image/png'
 * @param {number} quality - 1-100 (default 85)
 * @returns {Promise<{outputBuffer: Buffer, metadata: object}>}
 */
async function compressImage(buffer, mimetype, quality = 85) {
  const metadata = await sharp(buffer).metadata();
  let outputBuffer;

  if (mimetype.includes('jpeg') || mimetype.includes('jpg')) {
    outputBuffer = await sharp(buffer).jpeg({ quality }).toBuffer();
  } else if (mimetype.includes('png')) {
    outputBuffer = await sharp(buffer).png({ quality, compressionLevel: 9 }).toBuffer();
  } else {
    throw new Error(`Unsupported image mimetype: ${mimetype}`);
  }

  return { outputBuffer, metadata };
}

/**
 * Compress / re-serialize a PDF buffer to strip unused objects.
 * @param {Buffer} buffer - raw PDF bytes
 * @returns {Promise<{outputBuffer: Buffer, pageCount: number, title: string|null, author: string|null}>}
 */
async function compressPdf(buffer) {
  const pdfDoc = await PDFDocument.load(buffer);
  const pageCount = pdfDoc.getPageCount();
  const title = pdfDoc.getTitle() || null;
  const author = pdfDoc.getAuthor() || null;

  const compressedBytes = await pdfDoc.save();
  const outputBuffer = Buffer.from(compressedBytes);

  return { outputBuffer, pageCount, title, author };
}

module.exports = { compressImage, compressPdf };
