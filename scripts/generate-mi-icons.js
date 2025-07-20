const fs = require("fs");
const path = require("path");

// SVG content for the new "Mi" logo
const svgContent = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="512" height="512" fill="black"/>
<!-- Main "M" shape -->
<path d="M128 85H171V256L256 171L341 256V85H384V427H341V299L256 384L171 299V427H128V85Z" fill="#FFD700"/>
<!-- Integrated "i" dot -->
<rect x="235" y="192" width="42" height="11" fill="#FFD700"/>
</svg>`;

// Icon sizes needed
const iconSizes = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];

// Create a simple HTML file to convert SVG to PNG using browser APIs
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Icon Generator</title>
</head>
<body>
    <div id="output"></div>
    <script>
        const svgContent = \`${svgContent}\`;
        const iconSizes = [${iconSizes.join(", ")}];
        
        async function generateIcons() {
            const output = document.getElementById('output');
            
            for (const size of iconSizes) {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                
                // Create image from SVG
                const img = new Image();
                const svgBlob = new Blob([svgContent], {type: 'image/svg+xml'});
                const url = URL.createObjectURL(svgBlob);
                
                img.onload = function() {
                    // Clear canvas and draw image
                    ctx.clearRect(0, 0, size, size);
                    ctx.drawImage(img, 0, 0, size, size);
                    
                    // Convert to blob and download
                    canvas.toBlob(function(blob) {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = \`icon-\${size}x\${size}.png\`;
                        a.click();
                        URL.revokeObjectURL(a.href);
                    }, 'image/png');
                    
                    URL.revokeObjectURL(url);
                };
                
                img.src = url;
                
                // Add delay between generations
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            output.innerHTML = '<h2>Icon generation complete! Check your downloads folder.</h2>';
        }
        
        generateIcons();
    </script>
</body>
</html>
`;

// Write the HTML file
fs.writeFileSync("icon-generator.html", htmlContent);

console.log("Icon generator HTML file created: icon-generator.html");
console.log("Open this file in a browser to generate all PNG icons.");
console.log("The icons will be downloaded to your downloads folder.");
console.log("");
console.log("After generating, move the PNG files to the public/ directory.");
console.log("");
console.log("Icon sizes to generate:");
iconSizes.forEach((size) => {
  console.log(`  - icon-${size}x${size}.png`);
});
