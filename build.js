const { execSync } = require('child_process');
const { minify } = require('terser');
const fs = require('fs');
const path = require('path');

// Compile TypeScript
execSync('tsc', { stdio: 'inherit' });

// Minify the output
const inputPath = path.join(__dirname, 'dist', 'index.js');
const outputPath = path.join(__dirname, 'dist', 'index.min.js');

const code = fs.readFileSync(inputPath, 'utf8');

minify(code, {
  compress: true,
  mangle: true,
  format: {
    comments: false
  }
}).then(result => {
  fs.writeFileSync(outputPath, result.code);
}).catch(error => {
  process.exit(1);
}); 