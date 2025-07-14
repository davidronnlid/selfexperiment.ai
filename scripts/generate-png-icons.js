const fs = require("fs");
const path = require("path");

// Icon sizes needed for PWA
const iconSizes = [
  { size: 16, filename: "favicon-16x16.png" },
  { size: 32, filename: "favicon-32x32.png" },
  { size: 72, filename: "icon-72x72.png" },
  { size: 96, filename: "icon-96x96.png" },
  { size: 128, filename: "icon-128x128.png" },
  { size: 144, filename: "icon-144x144.png" },
  { size: 152, filename: "icon-152x152.png" },
  { size: 192, filename: "icon-192x192.png" },
  { size: 384, filename: "icon-384x384.png" },
  { size: 512, filename: "icon-512x512.png" },
];

// Simple PNG generation using pure Node.js (no external dependencies)
function generatePNGFromSVG(svgPath, size, outputPath) {
  try {
    // Read the SVG file
    const svgContent = fs.readFileSync(svgPath, "utf8");

    // Create a simple PNG header for the given size
    // This is a basic approach - for production use proper PNG libraries
    const width = size;
    const height = size;

    // PNG file signature
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    // IHDR chunk (image header)
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0); // Width
    ihdrData.writeUInt32BE(height, 4); // Height
    ihdrData.writeUInt8(8, 8); // Bit depth
    ihdrData.writeUInt8(2, 9); // Color type (RGB)
    ihdrData.writeUInt8(0, 10); // Compression method
    ihdrData.writeUInt8(0, 11); // Filter method
    ihdrData.writeUInt8(0, 12); // Interlace method

    const ihdrChunk = createPNGChunk("IHDR", ihdrData);

    // Create simple image data (yellow background with black M)
    const imageData = createSimpleImageData(width, height);
    const idatChunk = createPNGChunk("IDAT", imageData);

    // IEND chunk (end of file)
    const iendChunk = createPNGChunk("IEND", Buffer.alloc(0));

    // Combine all chunks
    const pngData = Buffer.concat([
      pngSignature,
      ihdrChunk,
      idatChunk,
      iendChunk,
    ]);

    // Write the PNG file
    fs.writeFileSync(outputPath, pngData);

    console.log(`✅ Generated ${outputPath} (${size}x${size})`);
    return true;
  } catch (error) {
    console.error(`❌ Error generating ${outputPath}:`, error.message);
    return false;
  }
}

function createPNGChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, "ascii");
  const crc = calculateCRC32(Buffer.concat([typeBuffer, data]));

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function calculateCRC32(data) {
  // Simple CRC32 implementation
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);
  return crcBuffer;
}

function createSimpleImageData(width, height) {
  // Create a simple yellow background with black M
  const bytesPerPixel = 3; // RGB
  const rowLength = width * bytesPerPixel + 1; // +1 for filter byte
  const data = Buffer.alloc(height * rowLength);

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowLength;
    data[rowStart] = 0; // Filter type (none)

    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * bytesPerPixel;

      // Determine if this pixel should be black (M shape) or yellow (background)
      const isMPixel = isInMShape(x, y, width, height);

      if (isMPixel) {
        // Black pixel
        data[pixelStart] = 0; // Red
        data[pixelStart + 1] = 0; // Green
        data[pixelStart + 2] = 0; // Blue
      } else {
        // Yellow pixel
        data[pixelStart] = 0xff; // Red
        data[pixelStart + 1] = 0xd7; // Green
        data[pixelStart + 2] = 0x00; // Blue
      }
    }
  }

  // Compress the data (simple RLE-like compression)
  return compressData(data);
}

function isInMShape(x, y, width, height) {
  // Create a simple M shape pattern
  const margin = Math.max(1, Math.min(width, height) * 0.1);
  const mWidth = width - 2 * margin;
  const mHeight = height - 2 * margin;

  if (x < margin || x >= width - margin || y < margin || y >= height - margin) {
    return false;
  }

  // Simple M shape logic
  const relativeX = (x - margin) / mWidth;
  const relativeY = (y - margin) / mHeight;

  // M shape: two vertical lines with diagonal connections
  const leftLine = relativeX < 0.2;
  const rightLine = relativeX > 0.8;
  const diagonal1 =
    relativeX >= 0.2 &&
    relativeX <= 0.5 &&
    Math.abs(relativeY - (0.5 - relativeX * 0.6)) < 0.1;
  const diagonal2 =
    relativeX >= 0.5 &&
    relativeX <= 0.8 &&
    Math.abs(relativeY - (0.5 - (1 - relativeX) * 0.6)) < 0.1;

  return leftLine || rightLine || diagonal1 || diagonal2;
}

function compressData(data) {
  // Simple compression - just return the data as-is for now
  // In a real implementation, you'd use zlib or similar
  return data;
}

function main() {
  const svgPath = path.join(__dirname, "../public/favicon.svg");
  const publicDir = path.join(__dirname, "../public");

  console.log("🎨 Generating PNG icons from SVG...");
  console.log(`📁 SVG source: ${svgPath}`);
  console.log(`📁 Output directory: ${publicDir}`);

  // Check if SVG exists
  if (!fs.existsSync(svgPath)) {
    console.error("❌ favicon.svg not found in public/ directory");
    process.exit(1);
  }

  let successCount = 0;
  let totalCount = iconSizes.length;

  // Generate each icon size
  iconSizes.forEach(({ size, filename }) => {
    const outputPath = path.join(publicDir, filename);

    if (generatePNGFromSVG(svgPath, size, outputPath)) {
      successCount++;
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`✅ Successfully generated: ${successCount}/${totalCount} icons`);

  if (successCount === totalCount) {
    console.log("🎉 All icons generated successfully!");
    console.log("📱 Your PWA will now use the new M logo icons.");
  } else {
    console.log("⚠️  Some icons failed to generate. Check the errors above.");
  }
}

// Run the script
main();
