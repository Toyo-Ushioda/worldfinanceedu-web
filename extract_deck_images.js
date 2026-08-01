/**
 * Extracts the base64 images embedded in deck.html into real files under /img/,
 * replaces each occurrence with a normal URL, and drops images that sit inside
 * hidden containers.
 *
 * Why: deck.html is 2,494KB of which 2,429KB (97%) is base64. Base64 images
 * cannot be cached separately or lazy-loaded, which hurts LCP and Core Web
 * Vitals, and therefore search ranking.
 *
 * Input : deck.html
 * Output: deck.images.html (same markup, external images) + img/deck-*.{png,jpg}
 *
 * Run: node extract_deck_images.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = __dirname;
const IMG_DIR = path.join(DIR, 'img');

// Order matches the 12 embedded images as they appear in the file.
// null = drop this image entirely (it lives in a display:none container).
const NAMES = [
  'deck-logo',            // 1  .logo-w background
  'deck-founder',         // 2  .founder-photo background
  'deck-logo',            // 3  cover decoration, same asset as 1
  'deck-divider-1',       // 4  divider foreground photo
  'deck-track-1',         // 5  track card 1
  'deck-track-2',         // 6  track card 2
  'deck-track-3',         // 7  track card 3
  'deck-author-aditya',   // 8  testimonial author
  'deck-author-edmund',   // 9  testimonial author
  'deck-author-makiko',   // 10 testimonial author
  'deck-divider-2',       // 11 divider foreground photo, slide 7
  null,                   // 12 inside .detail-photo-removed (display:none) -> drop
];

let html = fs.readFileSync(path.join(DIR, 'deck.html'), 'utf8');
const originalSize = html.length;

if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

const re = /data:image\/(\w+);base64,([A-Za-z0-9+/=]+)/g;
const matches = [...html.matchAll(re)];

if (matches.length !== NAMES.length) {
  throw new Error(
    `Expected ${NAMES.length} embedded images, found ${matches.length}. ` +
      'deck.html changed since this script was written. Aborting so nothing is corrupted.'
  );
}

const written = new Map(); // hash -> filename
const replacements = []; // [fullDataUri, replacementUrlOrNull]
let savedBytes = 0;

matches.forEach((m, i) => {
  const [full, ext, b64] = m;
  const name = NAMES[i];

  if (name === null) {
    replacements.push([full, null]);
    savedBytes += b64.length;
    console.log(`  image ${i + 1}: DROPPED (hidden container), ${Math.round(b64.length / 1024)}KB saved`);
    return;
  }

  const buf = Buffer.from(b64, 'base64');
  const hash = crypto.createHash('sha1').update(buf).digest('hex');

  let file;
  if (written.has(hash)) {
    file = written.get(hash);
    console.log(`  image ${i + 1}: duplicate of ${file}, reusing`);
  } else {
    const cleanExt = ext === 'jpeg' ? 'jpg' : ext;
    file = `${name}.${cleanExt}`;
    fs.writeFileSync(path.join(IMG_DIR, file), buf);
    written.set(hash, file);
    console.log(`  image ${i + 1}: -> img/${file} (${Math.round(buf.length / 1024)}KB)`);
  }
  replacements.push([full, `/img/${file}`]);
});

// Replace longest-first so no data URI is a prefix of another.
const seen = new Set();
for (const [full, url] of replacements) {
  if (seen.has(full)) continue;
  seen.add(full);
  if (url === null) {
    // Leave the (hidden) element but strip the payload so the file shrinks.
    html = html.split(full).join('');
  } else {
    html = html.split(full).join(url);
  }
}

fs.writeFileSync(path.join(DIR, 'deck.images.html'), html, 'utf8');

console.log('');
console.log(`deck.html      : ${Math.round(originalSize / 1024)}KB`);
console.log(`deck.images.html: ${Math.round(html.length / 1024)}KB`);
console.log(`reduction      : ${Math.round((1 - html.length / originalSize) * 100)}%`);
console.log(`unique images  : ${written.size} written to img/`);
