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

// Generate favicon PNG files
console.log("Generating favicon PNG files...\n");

// Generate favicon-16x16.png
const canvas16 = createCanvas(16, 16);
const ctx16 = canvas16.getContext("2d");
ctx16.imageSmoothingEnabled = true;
ctx16.imageSmoothingQuality = "high";
drawMiLogo(ctx16, 16);
const buffer16 = canvas16.toBuffer("image/png");
fs.writeFileSync("public/favicon-16x16.png", buffer16);
console.log("Generated: public/favicon-16x16.png");

// Generate favicon-32x32.png
const canvas32 = createCanvas(32, 32);
const ctx32 = canvas32.getContext("2d");
ctx32.imageSmoothingEnabled = true;
ctx32.imageSmoothingQuality = "high";
drawMiLogo(ctx32, 32);
const buffer32 = canvas32.toBuffer("image/png");
fs.writeFileSync("public/favicon-32x32.png", buffer32);
console.log("Generated: public/favicon-32x32.png");

console.log("\n✅ Favicon PNG files generated successfully!");
console.log(
  "\nNext step: Update favicon.ico using an online converter with the new favicon-32x32.png"
);
