const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('deck.html', 'utf8');

// Find all occurrences of background-image with base64 data, plus 200 chars before for context
const regex = /background-image:\s*url\(['"]?(data:image\/(jpeg|png);base64,([^'")\s]+))['"]?\)/g;

const imgDir = path.join(__dirname, 'img');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir);

let match;
let idx = 0;
const results = [];

while ((match = regex.exec(html)) !== null) {
  const ext = match[2];
  const b64 = match[3];
  const buf = Buffer.from(b64, 'base64');
  const filename = `photo${idx + 1}.${ext === 'png' ? 'png' : 'jpg'}`;
  fs.writeFileSync(path.join(imgDir, filename), buf);

  // Get context (200 chars before match to identify which element this is)
  const contextStart = Math.max(0, match.index - 300);
  const context = html.slice(contextStart, match.index).replace(/\s+/g, ' ').slice(-200);

  results.push({ file: filename, size: Math.round(buf.length / 1024) + 'KB', context });
  idx++;
}

results.forEach((r, i) => {
  console.log(`\n[${i + 1}] img/${r.file} (${r.size})`);
  console.log('    Context: ...' + r.context.slice(-150));
});

console.log(`\nDone. Extracted ${results.length} images to img/`);
