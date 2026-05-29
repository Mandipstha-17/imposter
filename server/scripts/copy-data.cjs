const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../src/data/footballers.json');
const destDir = path.join(__dirname, '../dist/data');
const dest = path.join(destDir, 'footballers.json');

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log('Copied footballers.json -> dist/data/');
