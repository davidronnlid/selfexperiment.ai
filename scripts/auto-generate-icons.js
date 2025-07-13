const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

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

function drawMIcon(canvas, size) {
  const ctx = canvas.getContext("2d");

  // Clear canvas
  ctx.clearRect(0, 0, size, size);

  // Background
  ctx.fillStyle = "#FFD700";
  ctx.fillRect(0, 0, size, size);

  // Calculate M proportions based on size
  const padding = Math.max(2, size * 0.1);
  const strokeWidth = Math.max(1, size * 0.03);

  // Draw M shape
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = strokeWidth;

  // Save context for transformations
  ctx.save();
  ctx.translate(padding, padding);

  // Scale the M to fit within the canvas minus padding
  const scale = (size - padding * 2) / 160; // Original M is 160 units wide
  ctx.scale(scale, scale);

  // Draw the M shape path
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(40, 0);
  ctx.lineTo(80, 60);
  ctx.lineTo(120, 0);
  ctx.lineTo(160, 0);
  ctx.lineTo(160, 140);
  ctx.lineTo(120, 140);
  ctx.lineTo(120, 60);
  ctx.lineTo(80, 120);
  ctx.lineTo(80, 60);
  ctx.lineTo(40, 140);
  ctx.lineTo(0, 140);
  ctx.closePath();

  // Fill and stroke the M
  ctx.fill();
  ctx.stroke();

  // Restore context
  ctx.restore();
}

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  drawMIcon(canvas, size);

  // Convert to PNG buffer
  const buffer = canvas.toBuffer("image/png");

  // Save to public folder
  const outputPath = path.join(__dirname, "../public", filename);
  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ Generated ${filename} (${size}x${size})`);
}

async function generateAllIcons() {
  console.log("🎨 Generating Modular Health PWA Icons...\n");

  try {
    // Generate all icon sizes
    iconSizes.forEach((iconInfo) => {
      generateIcon(iconInfo.size, iconInfo.filename);
    });

    console.log("\n🎉 All icons generated successfully!");
    console.log("📁 Icons saved to public/ folder");
    console.log("🔄 Your PWA will automatically use the new icons");

    // List generated files
    console.log("\n📋 Generated files:");
    iconSizes.forEach((iconInfo) => {
      console.log(`   - public/${iconInfo.filename}`);
    });
  } catch (error) {
    console.error("❌ Error generating icons:", error.message);

    if (error.message.includes("canvas")) {
      console.log("\n💡 Solution: Install the canvas package:");
      console.log("   npm install canvas");
      console.log("   or");
      console.log("   npm install canvas --save-dev");
    }
  }
}

// Run the generator
generateAllIcons();
