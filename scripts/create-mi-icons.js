const fs = require("fs");
const path = require("path");

// Create a simple SVG-based approach for now
// Since we don't have canvas libraries installed, let's create a simple HTML file
// that can be used to generate the icons manually

const svgTemplate = (
  size
) => `<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="512" height="512" fill="black"/>
<!-- Main "M" shape -->
<path d="M128 85H171V256L256 171L341 256V85H384V427H341V299L256 384L171 299V427H128V85Z" fill="#FFD700"/>
<!-- Integrated "i" dot -->
<rect x="235" y="192" width="42" height="11" fill="#FFD700"/>
</svg>`;

const iconSizes = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];

// Create individual SVG files for each size
iconSizes.forEach((size) => {
  const svgContent = svgTemplate(size);
  const filename = `public/icon-${size}x${size}-temp.svg`;
  fs.writeFileSync(filename, svgContent);
  console.log(`Created ${filename}`);
});

// Create a simple HTML file for manual conversion
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Mi Logo Icon Generator</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .icon-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .icon-item { text-align: center; padding: 10px; border: 1px solid #ccc; border-radius: 8px; }
        .icon-item img { border: 1px solid #ddd; margin: 10px 0; }
        .download-btn { background: #FFD700; color: black; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
        .download-btn:hover { background: #E6C200; }
    </style>
</head>
<body>
    <h1>Mi Logo Icon Generator</h1>
    <p>Click the download buttons to save each icon as PNG:</p>
    
    <div class="icon-grid">
        ${iconSizes
          .map(
            (size) => `
            <div class="icon-item">
                <h3>${size}x${size}</h3>
                <img src="/icon-${size}x${size}-temp.svg" width="${Math.min(
              size,
              100
            )}" height="${Math.min(size, 100)}" alt="${size}x${size} icon">
                <br>
                <button class="download-btn" onclick="downloadIcon(${size})">Download PNG</button>
            </div>
        `
          )
          .join("")}
    </div>

    <script>
        function downloadIcon(size) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            const img = new Image();
            img.onload = function() {
                ctx.drawImage(img, 0, 0, size, size);
                canvas.toBlob(function(blob) {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = \`icon-\${size}x\${size}.png\`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                }, 'image/png');
            };
            img.src = \`/icon-\${size}x\${size}-temp.svg\`;
        }
    </script>
</body>
</html>
`;

fs.writeFileSync("public/icon-generator.html", htmlContent);
console.log("Created public/icon-generator.html");

console.log("\nNext steps:");
console.log(
  "1. Open http://localhost:3000/icon-generator.html in your browser"
);
console.log("2. Click the download buttons to save each PNG icon");
console.log("3. Move the downloaded PNG files to the public/ directory");
console.log("4. Delete the temporary SVG files (icon-*-temp.svg)");
