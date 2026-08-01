/**
 * Generates World_Finance_Edu_Corporate_Introduction.pdf from index.html.
 *
 * The website and the deck are now the same file. This script is the only
 * place they diverge: it renders each .slide at a fixed 16:9 viewport and
 * assembles the frames into a landscape PDF.
 *
 * JPEG q92 keeps the file emailable; PNG at 2x produced a 19MB file.
 * Uses screenshot-per-slide + pdf-lib rather than page.pdf(), which has
 * produced broken output on these decks before.
 *
 * Requires the local server: node dev_server.js  (or the "wfe-website" launch config)
 *
 * Run: node generate_deck_pdf.js
 */

const puppeteer = require('puppeteer-core');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const URL = 'http://localhost:4173/index.html';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(__dirname, 'World_Finance_Edu_Corporate_Introduction.pdf');

// 16:9 at 2x for crisp text.
const W = 1600;
const H = 900;
const SCALE = 2;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: SCALE });

    const resp = await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
    if (!resp || !resp.ok()) {
      throw new Error(
        `Could not load ${URL} (${resp ? resp.status() : 'no response'}). ` +
          'Start the dev server first: node dev_server.js'
      );
    }

    // Force the print presentation so slides are exactly one viewport tall.
    await page.emulateMediaType('print');
    await page.evaluate(() => {
      document.querySelectorAll('.nav-rail, .progress-bar').forEach((e) => (e.style.display = 'none'));
    });

    // Let fonts settle so text does not render in a fallback face.
    await page.evaluateHandle('document.fonts.ready');

    const count = await page.evaluate(() => document.querySelectorAll('.slide').length);
    if (!count) throw new Error('No .slide elements found');
    console.log(`Rendering ${count} slides at ${W}x${H} @${SCALE}x ...`);

    const pdf = await PDFDocument.create();

    for (let i = 0; i < count; i++) {
      // Scroll the slide to the top of the viewport, then capture the viewport.
      await page.evaluate((idx) => {
        const s = document.querySelectorAll('.slide')[idx];
        window.scrollTo(0, s.offsetTop);
      }, i);
      await new Promise((r) => setTimeout(r, 220));

      const buf = await page.screenshot({ type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: W, height: H } });
      const png = await pdf.embedJpg(buf);
      const pageRef = pdf.addPage([W, H]);
      pageRef.drawImage(png, { x: 0, y: 0, width: W, height: H });
      console.log(`  slide ${i + 1}/${count}`);
    }

    const bytes = await pdf.save();
    let out = OUT;
    try {
      fs.writeFileSync(out, bytes);
    } catch (e) {
      if (e.code !== 'EBUSY' && e.code !== 'EPERM') throw e;
      // The PDF is open in a viewer, which holds a write lock on Windows.
      out = OUT.replace(/\.pdf$/, '_new.pdf');
      fs.writeFileSync(out, bytes);
      console.log(`\nNOTE: ${path.basename(OUT)} is open in a viewer and locked.`);
      console.log(`Wrote ${path.basename(out)} instead. Close the viewer and rename it.`);
    }
    const kb = Math.round(fs.statSync(out).size / 1024);
    console.log(`\nWrote ${path.basename(out)} (${kb}KB, ${count} pages)`);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
