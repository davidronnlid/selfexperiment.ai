const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

// Function to draw the logo on canvas
function drawLogo(ctx, size) {
  // Scale factor based on size
  const scale = size / 100;

  // Clear canvas with dark background
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(0, 0, size, size);

  // Draw left M pillar
  ctx.fillStyle = "#2a2a2a";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3 * scale;
  ctx.fillRect(10 * scale, 15 * scale, 20 * scale, 70 * scale);
  ctx.strokeRect(10 * scale, 15 * scale, 20 * scale, 70 * scale);

  // Draw right M pillar
  ctx.fillRect(70 * scale, 15 * scale, 20 * scale, 70 * scale);
  ctx.strokeRect(70 * scale, 15 * scale, 20 * scale, 70 * scale);

  // Draw gold rectangles in left pillar
  ctx.fillStyle = "#FFD700";
  ctx.fillRect(13 * scale, 20 * scale, 6 * scale, 6 * scale);
  ctx.fillRect(21 * scale, 20 * scale, 6 * scale, 6 * scale);
  ctx.fillRect(13 * scale, 70 * scale, 6 * scale, 6 * scale);
  ctx.fillRect(21 * scale, 70 * scale, 6 * scale, 6 * scale);

  // Draw gold rectangles in right pillar
  ctx.fillRect(73 * scale, 20 * scale, 6 * scale, 6 * scale);
  ctx.fillRect(81 * scale, 20 * scale, 6 * scale, 6 * scale);
  ctx.fillRect(73 * scale, 70 * scale, 6 * scale, 6 * scale);
  ctx.fillRect(81 * scale, 70 * scale, 6 * scale, 6 * scale);

  // Draw central chevron/arrow
  ctx.fillStyle = "#FFD700";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(40 * scale, 25 * scale);
  ctx.lineTo(50 * scale, 45 * scale);
  ctx.lineTo(60 * scale, 25 * scale);
  ctx.lineTo(50 * scale, 35 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw M connecting lines
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3 * scale;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(30 * scale, 15 * scale);
  ctx.lineTo(40 * scale, 25 * scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(60 * scale, 25 * scale);
  ctx.lineTo(70 * scale, 15 * scale);
  ctx.stroke();

  // Draw additional structural lines
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(20 * scale, 30 * scale);
  ctx.lineTo(30 * scale, 40 * scale);
  ctx.lineTo(40 * scale, 30 * scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(60 * scale, 30 * scale);
  ctx.lineTo(70 * scale, 40 * scale);
  ctx.lineTo(80 * scale, 30 * scale);
  ctx.stroke();
}

// Generate icons for different sizes
const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  console.log("Generating PNG icons with new logo design...");

  for (const size of sizes) {
    console.log(`Creating icon-${size}x${size}.png...`);

    // Create canvas
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Draw logo
    drawLogo(ctx, size);

    // Save PNG
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(
      path.join(__dirname, `../public/icon-${size}x${size}.png`),
      buffer
    );
  }

  // Generate favicon sizes
  console.log("Creating favicon-16x16.png...");
  const favicon16 = createCanvas(16, 16);
  const ctx16 = favicon16.getContext("2d");
  drawLogo(ctx16, 16);
  fs.writeFileSync(
    path.join(__dirname, "../public/favicon-16x16.png"),
    favicon16.toBuffer("image/png")
  );

  console.log("Creating favicon-32x32.png...");
  const favicon32 = createCanvas(32, 32);
  const ctx32 = favicon32.getContext("2d");
  drawLogo(ctx32, 32);
  fs.writeFileSync(
    path.join(__dirname, "../public/favicon-32x32.png"),
    favicon32.toBuffer("image/png")
  );

  console.log("✅ All icons generated successfully!");
  console.log("Generated files:");
  sizes.forEach((size) => {
    console.log(`  - icon-${size}x${size}.png`);
  });
  console.log("  - favicon-16x16.png");
  console.log("  - favicon-32x32.png");
}

generateIcons().catch(console.error);
