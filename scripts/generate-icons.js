const fs = require("fs");
const path = require("path");

// Create a simple HTML file to render the SVG and capture it
const createIconHtml = (size) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: white; }
    .icon { width: ${size}px; height: ${size}px; }
  </style>
</head>
<body>
  <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 140">
    <!-- Yellow M background -->
    <path d="M 0 0 L 40 0 L 80 60 L 120 0 L 160 0 L 160 140 L 120 140 L 120 60 L 80 120 L 80 60 L 40 140 L 0 140 Z" 
          fill="#FFD700" stroke="#000" stroke-width="4"/>
    
    <!-- Black M outline -->
    <path d="M 0 0 L 40 0 L 80 60 L 120 0 L 160 0 L 160 140 L 120 140 L 120 60 L 80 120 L 80 60 L 40 140 L 0 140 Z" 
          fill="none" stroke="#000" stroke-width="6"/>
  </svg>
</body>
</html>
`;

// Create favicon SVG optimized for small sizes
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <!-- Simplified M for favicon -->
  <rect width="32" height="32" fill="#FFD700"/>
  <path d="M 4 4 L 8 4 L 16 16 L 24 4 L 28 4 L 28 28 L 24 28 L 24 12 L 16 24 L 16 12 L 8 28 L 4 28 Z" 
        fill="#000" stroke="#000" stroke-width="1"/>
</svg>`;

// Write the favicon SVG
fs.writeFileSync(path.join(__dirname, "../public/favicon.svg"), faviconSvg);

// Create different sized HTML files for manual conversion
const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach((size) => {
  const html = createIconHtml(size);
  fs.writeFileSync(
    path.join(__dirname, `../public/icon-${size}x${size}.html`),
    html
  );
});

console.log("Icon HTML files generated. You can:");
console.log("1. Open each HTML file in a browser");
console.log("2. Take screenshots at the exact size");
console.log("3. Or use a tool like Puppeteer to automate this");
console.log("");
console.log("For now, I'll create a simple ICO file manually...");

// Create a simple favicon.ico content (this is a basic placeholder)
// In a real implementation, you'd use a proper ICO generation library
const icoHeader = Buffer.from([
  0x00,
  0x00, // Reserved
  0x01,
  0x00, // ICO type
  0x01,
  0x00, // Number of images
  0x10,
  0x10, // Width, Height (16x16)
  0x00,
  0x00, // Colors, Reserved
  0x01,
  0x00, // Planes
  0x20,
  0x00, // Bits per pixel
  0x00,
  0x00,
  0x00,
  0x00, // Size of image data
  0x16,
  0x00,
  0x00,
  0x00, // Offset to image data
]);

console.log("Basic favicon structure created.");
console.log(
  "For proper favicon generation, consider using online tools or proper libraries."
);
