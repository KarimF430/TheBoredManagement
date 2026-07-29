const fs = require('fs');
const content = fs.readFileSync('src/components/IndiaMap.tsx', 'utf8');
const matches = [...content.matchAll(/name:\s*\"([^\"]+)\"/g)].map(m => m[1]);
console.log(matches.join(', '));
