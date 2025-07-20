const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

// Icon sizes needed
const iconSizes = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];

// Function to draw the "Mi" logo on a canvas
function drawMiLogo(ctx, size) {
  // Set background to black
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, size, size);

  // Set gold color
  ctx.fillStyle = "#FFD700";

  // Draw the main "M" shape using simple rectangles and triangles
  // Left vertical leg
  ctx.fillRect(0.25 * size, 0.17 * size, 0.08 * size, 0.66 * size);

  // Right vertical leg
  ctx.fillRect(0.67 * size, 0.17 * size, 0.08 * size, 0.66 * size);

  // Center vertical stroke (part of the "i")
  ctx.fillRect(0.46 * size, 0.17 * size, 0.08 * size, 0.66 * size);

  // Left diagonal connection (top-left to center)
  ctx.beginPath();
  ctx.moveTo(0.25 * size, 0.17 * size);
  ctx.lineTo(0.5 * size, 0.5 * size);
  ctx.lineTo(0.33 * size, 0.5 * size);
  ctx.closePath();
  ctx.fill();

  // Right diagonal connection (center to top-right)
  ctx.beginPath();
  ctx.moveTo(0.5 * size, 0.5 * size);
  ctx.lineTo(0.75 * size, 0.17 * size);
  ctx.lineTo(0.67 * size, 0.5 * size);
  ctx.closePath();
  ctx.fill();

  // Left diagonal connection (center to bottom-left)
  ctx.beginPath();
  ctx.moveTo(0.5 * size, 0.5 * size);
  ctx.lineTo(0.33 * size, 0.83 * size);
  ctx.lineTo(0.33 * size, 0.5 * size);
  ctx.closePath();
  ctx.fill();

  // Right diagonal connection (bottom-right to center)
  ctx.beginPath();
  ctx.moveTo(0.67 * size, 0.83 * size);
  ctx.lineTo(0.5 * size, 0.5 * size);
  ctx.lineTo(0.67 * size, 0.5 * size);
  ctx.closePath();
  ctx.fill();

  // Draw the integrated "i" dot as a horizontal rectangle
  // Positioned above the central vertical stroke
  ctx.fillRect(0.46 * size, 0.38 * size, 0.08 * size, 0.02 * size);
}

// Function to generate a single icon
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Enable antialiasing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Draw the logo
  drawMiLogo(ctx, size);

  // Convert to buffer
  const buffer = canvas.toBuffer("image/png");

  // Write to file
  const filename = `public/icon-${size}x${size}.png`;
  fs.writeFileSync(filename, buffer);
  console.log(`Generated: ${filename}`);

  return buffer;
}

// Generate all icons
console.log('Generating PNG icons with the new "Mi" logo...\n');

iconSizes.forEach((size) => {
  generateIcon(size);
});

console.log("\n✅ All PNG icons generated successfully!");
console.log("\nGenerated icon sizes:");
iconSizes.forEach((size) => {
  console.log(`  - icon-${size}x${size}.png`);
});

console.log("\nNext steps:");
console.log("1. Update favicon.ico using an online converter");
console.log("2. Test the new icons in your browser");
console.log("3. Clean up temporary files when done");
