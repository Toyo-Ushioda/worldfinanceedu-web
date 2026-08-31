/**
 * OGP image generator for both column sites (2026-08-31).
 * Design matches the note eyecatch standard (2026-08-06 rules): warm paper
 * #F2EFE9, black Noto Serif JP title, small grey series label, NO colour,
 * no accent bars. JPEG output (note lesson: PNG gets re-encoded badly by
 * some platforms; JPEG q92 stays clean).
 *
 * Scans both repos' article folders + hubs + /links/, reads each page's
 * <title>, renders 1200x630, writes to <repo>/img/og/<slug>.jpg.
 * Skips images that already exist (delete a file to regenerate; --force for all).
 *
 * Run: node generate_og_images.js [--force]
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FORCE = process.argv.includes('--force');

const FIN = __dirname;
const ENG = 'C:\\Users\\toyou\\OneDrive\\04. Work (TOYO) from 2025 Aug\\Work TOYO\\03. WFE\\03. Course Materials\\04. English Learning for Japanese\\Udemy Course\\deploy';

const SITES = [
  { root: FIN, label: 'AI時代に生き残るファイナンス　学習コラム', extra: ['articles', 'links'] },
  { root: ENG, label: 'グローバルに活躍する日本人になるための英語力向上コラム', extra: ['articles'] },
];

function pageTitle(file) {
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(/<title>([^<]*)<\/title>/);
  if (!m) return null;
  return m[1].replace(/\s*\|\s*World Finance Edu\s*$/, '').trim();
}

function collect(site) {
  const jobs = [];
  const artDir = path.join(site.root, 'articles');
  for (const d of fs.readdirSync(artDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const f = path.join(artDir, d.name, 'index.html');
    if (fs.existsSync(f)) jobs.push({ slug: d.name, file: f });
  }
  for (const p of site.extra) {
    const f = path.join(site.root, p, 'index.html');
    if (fs.existsSync(f)) jobs.push({ slug: p === 'articles' ? 'articles-hub' : p, file: f });
  }
  return jobs;
}

function pageHtml(title, label) {
  // Same size steps as the note generator, scaled for 1200x630.
  const t = title.replace(/\|.*$/, '').trim(); // lead segment only, keeps the card readable
  const fontSize = t.length > 30 ? 52 : t.length > 24 ? 58 : 68;
  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500&family=Noto+Serif+JP:wght@600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    font-family: 'Noto Serif JP', serif;
    background: #F2EFE9; color: #1A1A1A;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 64px 76px 52px;
  }
  .label { font-family: 'Noto Sans JP', sans-serif; font-size: 24px; font-weight: 500; color: #6B675F; }
  .title { font-size: ${fontSize}px; font-weight: 600; line-height: 1.45; letter-spacing: 0.01em; }
  .brand { font-family: 'Noto Sans JP', sans-serif; font-size: 22px; font-weight: 400; color: #6B675F; align-self: flex-end; }
</style></head>
<body>
  <div class="label">${label}</div>
  <div class="title">${t}</div>
  <div class="brand">World Finance Edu</div>
</body></html>`;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  let made = 0, skipped = 0;
  for (const site of SITES) {
    const outDir = path.join(site.root, 'img', 'og');
    fs.mkdirSync(outDir, { recursive: true });
    for (const job of collect(site)) {
      const out = path.join(outDir, job.slug + '.jpg');
      if (fs.existsSync(out) && !FORCE) { skipped++; continue; }
      const title = pageTitle(job.file);
      if (!title) { console.warn('no title: ' + job.file); continue; }
      await page.setContent(pageHtml(title, site.label), { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      await new Promise((r) => setTimeout(r, 300));
      await page.screenshot({ path: out, type: 'jpeg', quality: 92 });
      console.log('  ' + path.basename(site.root === FIN ? 'fin' : 'eng') + '/' + job.slug + '.jpg (' + Math.round(fs.statSync(out).size / 1024) + 'KB)');
      made++;
    }
  }
  await browser.close();
  console.log('Done: ' + made + ' generated, ' + skipped + ' existing kept');
})();
