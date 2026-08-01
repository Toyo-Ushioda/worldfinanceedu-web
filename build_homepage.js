/**
 * ONE-TIME MIGRATION, ALREADY RUN on 2026-08-01. Kept as a record of what changed.
 *
 * DO NOT RUN AGAIN. index.html is now the source of truth for the homepage:
 * edit index.html directly. mobile.html is now only a redirect, so re-running
 * this script would find no content and abort (it fails safe, but do not try).
 *
 * Builds the real homepage at / from the old content page (mobile.html).
 *
 * Why this exists: the old index.html was an empty JS-redirect shell that sent
 * desktop visitors to /deck.html and mobile visitors to /mobile.html. Google
 * therefore never indexed the root URL, and GA4 showed 0s engagement on /.
 * This script makes / the real, indexable page.
 *
 * What it does:
 *   1. index.html  = mobile.html content + SEO head + desktop container + header deck link
 *   2. mobile.html = redirect to / (its content now lives in index.html)
 *   3. deck.html   = canonical -> / so it stops competing with the homepage
 *   4. sitemap.xml = add /links/
 *
 * Run: node build_homepage.js
 */

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SITE = 'https://worldfinanceedu.com';

// ---------------------------------------------------------------- 1. index.html

let src = fs.readFileSync(path.join(DIR, 'mobile.html'), 'utf8');

const SEO_HEAD = `<title>World Finance Edu | Corporate Finance Training and Fractional CFO, Singapore</title>
<meta name="description" content="World Finance Edu delivers corporate finance training and seminars for working professionals, and fractional CFO support for companies that need senior finance capability without a full-time hire. Based in Singapore." />
<link rel="canonical" href="${SITE}/" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="World Finance Edu" />
<meta property="og:title" content="World Finance Edu | Corporate Finance Training and Fractional CFO" />
<meta property="og:description" content="Corporate finance training and seminars for working professionals, plus fractional CFO support. Singapore." />
<meta property="og:url" content="${SITE}/" />
<meta property="og:image" content="${SITE}/img/photo1.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="World Finance Edu | Corporate Finance Training and Fractional CFO" />
<meta name="twitter:description" content="Corporate finance training and seminars for working professionals, plus fractional CFO support. Singapore." />
<meta name="twitter:image" content="${SITE}/img/photo1.jpg" />
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "${SITE}/#organization",
      "name": "World Finance Edu",
      "url": "${SITE}/",
      "description": "Corporate finance training and seminars for working professionals, and fractional CFO support for companies that need senior finance capability without a full-time hire.",
      "address": { "@type": "PostalAddress", "addressCountry": "SG", "addressLocality": "Singapore" },
      "email": "Operation@worldfinanceedu.com",
      "telephone": "+65 8502 8907",
      "sameAs": ["https://www.linkedin.com/company/world-finance-edu"],
      "founder": { "@id": "${SITE}/#toyo" }
    },
    {
      "@type": "Person",
      "@id": "${SITE}/#toyo",
      "name": "Toyo Ushioda",
      "alternateName": "潮田 豊幸",
      "jobTitle": "Founder",
      "worksFor": { "@id": "${SITE}/#organization" },
      "alumniOf": [
        { "@type": "CollegeOrUniversity", "name": "INSEAD" },
        { "@type": "CollegeOrUniversity", "name": "Columbia Business School" }
      ],
      "hasCredential": "Certified Public Accountant (Washington State)",
      "sameAs": [
        "https://x.com/Toyo25805074",
        "https://note.com/toyo_ushioda",
        "https://www.linkedin.com/in/toyoyuki-ushioda/",
        "https://toyoyukiushioda.substack.com/"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "${SITE}/#website",
      "url": "${SITE}/",
      "name": "World Finance Edu",
      "publisher": { "@id": "${SITE}/#organization" }
    }
  ]
}
</script>`;

if (!src.includes('<title>World Finance Edu</title>')) {
  throw new Error('mobile.html title block not found - aborting so nothing is corrupted');
}
let out = src.replace('<title>World Finance Edu</title>', SEO_HEAD);

// Desktop container. The source page was authored at mobile width with no
// max-width and no media queries, so on a wide monitor every section would
// stretch edge to edge. Keep section backgrounds full-bleed but centre the
// content to a readable column.
const DESKTOP_CSS = `
  /* ===== DESKTOP CONTAINER (added 2026-08-01) =====
     Source page was authored mobile-first with no max-width. On wider screens
     keep backgrounds full-bleed and centre content into a readable column. */
  @media (min-width: 760px) {
    .header,
    .hero-section,
    .section,
    .divider-section {
      padding-left: max(24px, calc((100% - 880px) / 2));
      padding-right: max(24px, calc((100% - 880px) / 2));
    }
    .hero-section { padding-top: 88px; padding-bottom: 72px; }
    .section, .divider-section { padding-top: 68px; padding-bottom: 68px; }
    .hero-h1 { font-size: 46px; }
    .founder-photo { width: 96px; height: 96px; }
  }
  .header-right { display: flex; align-items: center; gap: 14px; }
  .header-deck {
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--slate-deep);
    text-decoration: none;
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 5px 9px;
    white-space: nowrap;
  }
  .header-deck:hover { background: var(--mint-soft); color: var(--ink); }
</style>`;

out = out.replace(/\n<\/style>/, '\n' + DESKTOP_CSS);

// Header: keep the Singapore tag, add a deck link so desktop visitors who used
// to land straight on the deck still have a one-click route to it.
const OLD_HEADER = `  <div class="header-tag">Singapore</div>`;
const NEW_HEADER = `  <div class="header-right">
    <span class="header-tag">Singapore</span>
    <a class="header-deck" href="/deck.html">Deck &rarr;</a>
  </div>`;
if (!out.includes(OLD_HEADER)) throw new Error('header tag block not found - aborting');
out = out.replace(OLD_HEADER, NEW_HEADER);

fs.writeFileSync(path.join(DIR, 'index.html'), out, 'utf8');
console.log('index.html written (' + Math.round(out.length / 1024) + 'KB)');

// ---------------------------------------------------------------- 2. mobile.html

const MOBILE_REDIRECT = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>World Finance Edu</title>
<link rel="canonical" href="${SITE}/" />
<meta name="robots" content="noindex, follow" />
<meta http-equiv="refresh" content="0; url=/" />
<script>window.location.replace('/');</script>
</head>
<body>
<p>This page has moved to <a href="/">worldfinanceedu.com</a>.</p>
</body>
</html>
`;
fs.writeFileSync(path.join(DIR, 'mobile.html'), MOBILE_REDIRECT, 'utf8');
console.log('mobile.html -> redirect to /');

// ---------------------------------------------------------------- 3. deck.html

let deck = fs.readFileSync(path.join(DIR, 'deck.html'), 'utf8');
if (deck.includes('rel="canonical"')) {
  console.log('deck.html already has a canonical, left unchanged');
} else {
  const m = deck.match(/<\/title>/i);
  if (!m) throw new Error('deck.html has no </title> - aborting');
  deck = deck.replace(/<\/title>/i, `</title>\n<link rel="canonical" href="${SITE}/" />`);
  fs.writeFileSync(path.join(DIR, 'deck.html'), deck, 'utf8');
  console.log('deck.html canonical -> /');
}

// ---------------------------------------------------------------- 4. sitemap.xml

let sm = fs.readFileSync(path.join(DIR, 'sitemap.xml'), 'utf8');
if (sm.includes('/links/')) {
  console.log('sitemap already lists /links/');
} else {
  sm = sm.replace(
    `  <url>\n    <loc>${SITE}/articles/</loc>`,
    `  <url>\n    <loc>${SITE}/links/</loc>\n    <lastmod>2026-08-01</lastmod>\n  </url>\n  <url>\n    <loc>${SITE}/articles/</loc>`
  );
  fs.writeFileSync(path.join(DIR, 'sitemap.xml'), sm, 'utf8');
  console.log('sitemap.xml + /links/');
}

console.log('\nDone. Verify locally, then git push to deploy.');
