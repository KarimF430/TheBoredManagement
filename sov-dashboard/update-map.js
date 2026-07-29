const fs = require('fs');
let content = fs.readFileSync('src/components/IndiaMap.tsx', 'utf8');

// Replace langCode for Assam, Punjab, and Jammu and Kashmir
content = content.replace(/(name:\s*"Assam",\s*langCode:\s*")[^"]+(")/g, '$1hi$2');
content = content.replace(/(name:\s*"Punjab",\s*langCode:\s*")[^"]+(")/g, '$1hi$2');
content = content.replace(/(name:\s*"Jammu and Kashmir",\s*langCode:\s*")[^"]+(")/g, '$1hi$2');

fs.writeFileSync('src/components/IndiaMap.tsx', content);
console.log('Map updated.');
