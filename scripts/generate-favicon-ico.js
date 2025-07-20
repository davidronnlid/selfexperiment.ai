const { createCanvas } = require("canvas");
const fs = require("fs");

// Function to draw the "Mi" logo on a canvas (same as before)
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

console.log("Generating favicon.ico...\n");

// Create a simple ICO file structure
// ICO files contain multiple sizes, typically 16x16, 32x32, and 48x48

// Generate 16x16 icon
const canvas16 = createCanvas(16, 16);
const ctx16 = canvas16.getContext("2d");
ctx16.imageSmoothingEnabled = true;
ctx16.imageSmoothingQuality = "high";
drawMiLogo(ctx16, 16);
const buffer16 = canvas16.toBuffer("image/png");

// Generate 32x32 icon
const canvas32 = createCanvas(32, 32);
const ctx32 = canvas32.getContext("2d");
ctx32.imageSmoothingEnabled = true;
ctx32.imageSmoothingQuality = "high";
drawMiLogo(ctx32, 32);
const buffer32 = canvas32.toBuffer("image/png");

// For now, let's create a simple approach by copying the 32x32 PNG as favicon.ico
// This is a temporary solution - in production you'd want a proper ICO encoder
fs.writeFileSync("public/favicon.ico", buffer32);
console.log("Generated: public/favicon.ico (using 32x32 PNG as ICO)");

console.log("\n⚠️ Note: This creates a PNG file with .ico extension.");
console.log("For a proper ICO file, you may need to use an online converter:");
console.log("1. Go to https://favicon.io/favicon-converter/");
console.log("2. Upload public/favicon-32x32.png");
console.log("3. Download the generated favicon.ico");
console.log("4. Replace public/favicon.ico with the downloaded file");

console.log("\n✅ Temporary favicon.ico created!");
console.log("Try refreshing your browser now.");
