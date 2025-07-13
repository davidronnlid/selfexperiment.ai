const fs = require("fs");
const path = require("path");

// Create a basic favicon.ico file
// This is a simplified approach - for production use proper ICO libraries

function createBasicIco() {
  // ICO file header (6 bytes)
  const header = Buffer.from([
    0x00,
    0x00, // Reserved (must be 0)
    0x01,
    0x00, // Type (1 = ICO)
    0x01,
    0x00, // Number of images (1)
  ]);

  // Image directory entry (16 bytes)
  const imageDir = Buffer.from([
    0x10, // Width (16 pixels)
    0x10, // Height (16 pixels)
    0x00, // Color palette (0 = no palette)
    0x00, // Reserved (must be 0)
    0x01,
    0x00, // Color planes (1)
    0x20,
    0x00, // Bits per pixel (32 = RGBA)
    0x00,
    0x04,
    0x00,
    0x00, // Size of image data (1024 bytes for 16x16 RGBA)
    0x16,
    0x00,
    0x00,
    0x00, // Offset to image data (22 bytes)
  ]);

  // Create 16x16 RGBA image data for yellow M
  const imageData = Buffer.alloc(1024); // 16x16 * 4 bytes per pixel

  // Fill with yellow background (#FFD700)
  for (let i = 0; i < 1024; i += 4) {
    imageData[i] = 0x00; // Blue
    imageData[i + 1] = 0xd7; // Green
    imageData[i + 2] = 0xff; // Red
    imageData[i + 3] = 0xff; // Alpha
  }

  // Draw simple M pattern in black
  const mPixels = [
    // Row 2: start of M
    [2, 2],
    [3, 2],
    [12, 2],
    [13, 2],
    // Row 3
    [2, 3],
    [3, 3],
    [4, 3],
    [11, 3],
    [12, 3],
    [13, 3],
    // Row 4
    [2, 4],
    [3, 4],
    [5, 4],
    [10, 4],
    [12, 4],
    [13, 4],
    // Row 5
    [2, 5],
    [3, 5],
    [6, 5],
    [9, 5],
    [12, 5],
    [13, 5],
    // Row 6
    [2, 6],
    [3, 6],
    [7, 6],
    [8, 6],
    [12, 6],
    [13, 6],
    // Row 7-13: vertical lines
    [2, 7],
    [3, 7],
    [12, 7],
    [13, 7],
    [2, 8],
    [3, 8],
    [12, 8],
    [13, 8],
    [2, 9],
    [3, 9],
    [12, 9],
    [13, 9],
    [2, 10],
    [3, 10],
    [12, 10],
    [13, 10],
    [2, 11],
    [3, 11],
    [12, 11],
    [13, 11],
    [2, 12],
    [3, 12],
    [12, 12],
    [13, 12],
    [2, 13],
    [3, 13],
    [12, 13],
    [13, 13],
  ];

  // Set M pixels to black
  mPixels.forEach(([x, y]) => {
    const index = (y * 16 + x) * 4;
    if (index < imageData.length - 3) {
      imageData[index] = 0x00; // Blue
      imageData[index + 1] = 0x00; // Green
      imageData[index + 2] = 0x00; // Red
      imageData[index + 3] = 0xff; // Alpha
    }
  });

  // Combine all parts
  const icoFile = Buffer.concat([header, imageDir, imageData]);

  return icoFile;
}

// Generate the favicon.ico file
const icoData = createBasicIco();
const outputPath = path.join(__dirname, "../public/favicon.ico");

fs.writeFileSync(outputPath, icoData);

console.log("✅ favicon.ico created successfully!");
console.log(`📁 Saved to: ${outputPath}`);
console.log(
  "🔄 This is a basic implementation. For production, consider using:"
);
console.log("   - https://realfavicongenerator.net/");
console.log("   - https://favicon.io/");
console.log('   - npm packages like "to-ico" or "sharp"');

// Also create a simple 32x32 PNG for modern browsers
console.log("\n📋 Next steps:");
console.log("1. Open scripts/generate-all-icons.html in your browser");
console.log("2. Download all the generated PNG icons");
console.log("3. Replace the existing icon files in public/");
console.log("4. The PWA will automatically use the new icons");
