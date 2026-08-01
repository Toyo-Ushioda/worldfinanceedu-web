/**
 * ONE-TIME MIGRATION, ALREADY RUN on 2026-08-01. Kept as a record.
 *
 * DO NOT RUN AGAIN. index.html is the source of truth for the homepage now:
 * edit index.html directly. Its input deck.images.html no longer exists, so a
 * re-run would fail immediately.
 *
 * Turns deck.images.html into the new homepage: bigger type, SEO head,
 * one h1, lazy images, and slides that can grow instead of clipping.
 *
 * Input : deck.images.html (output of extract_deck_images.js)
 * Output: index.html
 *
 * Run: node patch_deck_homepage.js
 */

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SITE = 'https://worldfinanceedu.com';

let html = fs.readFileSync(path.join(DIR, 'deck.images.html'), 'utf8');

// ---------------------------------------------------------------- 1. SEO head

const OLD_TITLE = '<title>World Finance Edu — Corporate Introduction</title>';
if (!html.includes(OLD_TITLE)) throw new Error('deck title not found - aborting');

const SEO_HEAD = `<title>World Finance Edu | Corporate Finance Training and Fractional CFO, Singapore</title>
<meta name="description" content="World Finance Edu delivers corporate finance training and seminars for working professionals, and fractional CFO support for companies that need senior finance capability without a full-time hire. Based in Singapore." />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="World Finance Edu" />
<meta property="og:title" content="World Finance Edu | Corporate Finance Training and Fractional CFO" />
<meta property="og:description" content="Corporate finance training and seminars for working professionals, plus fractional CFO support. Singapore." />
<meta property="og:url" content="${SITE}/" />
<meta property="og:image" content="${SITE}/img/deck-founder.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="World Finance Edu | Corporate Finance Training and Fractional CFO" />
<meta name="twitter:description" content="Corporate finance training and seminars for working professionals, plus fractional CFO support. Singapore." />
<meta name="twitter:image" content="${SITE}/img/deck-founder.jpg" />
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

html = html.replace(OLD_TITLE, SEO_HEAD);

// ---------------------------------------------------------------- 2. One h1

// A page should have a single h1. Keep the cover title; demote the two
// section-divider h1s to h2 so the heading hierarchy is valid.
html = html.replace(
  '<h1>Corporate finance <em>training.</em></h1>',
  '<h2>Corporate finance <em>training.</em></h2>'
);
html = html.replace(
  '<h1>Fractional <em>CFO</em> services.</h1>',
  '<h2>Fractional <em>CFO</em> services.</h2>'
);

// ---------------------------------------------------------------- 3. Lazy images

// The three testimonial photos are 400x400 and ~20KB each. width/height are
// their intrinsic size, which reserves layout space and avoids layout shift.
// Deliberately NOT loading="lazy": the deck's scroll container stops the lazy
// observer from ever firing, so the images never load at all. At 60KB total
// the eager cost is negligible.
html = html.replace(
  /<img class="author-photo" alt="([^"]+)" src="([^"]+)"/g,
  '<img class="author-photo" alt="$1" src="$2" decoding="async" width="400" height="400"'
);

// ---------------------------------------------------------------- 4. Article hub links

// The old homepage linked both column hubs; the deck did not. The homepage is
// the strongest internal link a page can get, so the hubs need it back or the
// articles lose their main path from the root domain.
const LINKS_ITEM = `    <div class="contact-item">
      <div class="contact-label">日本語 · Japanese-language courses and columns</div>
      <div class="contact-value"><a href="/links/">日本語の講座・学習コラムはこちら</a></div>
    </div>`;

const HUB_ITEMS = `${LINKS_ITEM}
    <div class="contact-item">
      <div class="contact-label">学習コラム · Finance</div>
      <div class="contact-value"><a href="/articles/">AI時代に生き残るファイナンス　学習コラム</a></div>
    </div>
    <div class="contact-item">
      <div class="contact-label">学習コラム · English</div>
      <div class="contact-value"><a href="https://english.worldfinanceedu.com/articles/">グローバルに活躍する日本人になるための英語力向上コラム</a></div>
    </div>`;

if (!html.includes(LINKS_ITEM)) throw new Error('contact links item not found - aborting');
html = html.replace(LINKS_ITEM, HUB_ITEMS);

// ---------------------------------------------------------------- 5. Readability

// Two problems being fixed together:
//  (a) type is too small: main body was 16px and 62 elements sat at 13px or less
//  (b) slides are locked to height:100vh, so larger type would clip. Switch to
//      min-height so a slide grows when its content needs the room.
const READABILITY_CSS = `
  /* ===== READABILITY PASS (2026-08-01) =====
     Deck became the homepage. Type was sized for a projected slide, which
     reads as too small on a monitor. Each step below is a +1 to +2px bump
     that preserves the existing hierarchy. Paired with min-height slides so
     nothing clips at the new sizes. */
  .slide { height: auto; min-height: 100vh; }

  .track-card-tag { font-size: 12px; }

  .cover-meta, .cover-tag, .credential, .audience-tag,
  .pillars-strip-title, .divider-stat-label, .pricing-eyebrow { font-size: 13px; }

  .eyebrow, .founder-role, .track-card-org, .author-role { font-size: 14px; }

  .logo-text, .sub, .pillar-desc, .track-card-desc,
  .cfo-scope-desc, .pricing-unit, .disclaimer-text { font-size: 15px; }

  .author-name, .pricing-includes, .deel-note-text, .b-desc { font-size: 16px; }

  .lead { font-size: 18px; line-height: 1.65; }

  .cover-mission, .divider-summary, .testimonial-quote { font-size: 19px; line-height: 1.6; }

  .pillar-title, .course-meta-value { font-size: 20px; }
  .cfo-scope-title, .b-title { font-size: 20px; }

  /* Second pass: the small mono labels. Floor is 13px, nothing below.
     Some need the extra specificity to beat the original rules. */
  .course-meta-label, .slide-marker, .pricing-tier, .deel-note-label,
  .disclaimer-label, .contact-label, .closing-tag, .track-card-tag { font-size: 13px; }

  .track-card-meta, .track-card-meta span,
  .biz-chip, .biz-chip span,
  .divider-meta, .divider-meta span { font-size: 13px; }

  span.credential { font-size: 14px; }
  li.sub { font-size: 15px; }
  span.pricing-currency { font-size: 15px; }

  /* On phones a 100vh lock is what clips slide content. Let them breathe. */
  @media (max-width: 640px) {
    .slide { min-height: auto; padding-top: 56px; padding-bottom: 56px; }
    .lead { font-size: 17px; }
  }

  /* Print/PDF keeps the one-slide-per-page behaviour. */
  @media print {
    .slide { height: 100vh; min-height: 0; page-break-after: always; }
  }
</style>`;

if (!/\n<\/style>/.test(html)) throw new Error('no </style> found - aborting');
html = html.replace(/\n<\/style>/, '\n' + READABILITY_CSS);

fs.writeFileSync(path.join(DIR, 'index.html'), html, 'utf8');

console.log('index.html written (' + Math.round(html.length / 1024) + 'KB)');
console.log('h1 count:', (html.match(/<h1/g) || []).length);
console.log('h2 count:', (html.match(/<h2/g) || []).length);
console.log('lazy images:', (html.match(/loading="lazy"/g) || []).length);
console.log('canonical:', /rel="canonical"/.test(html));
console.log('json-ld:', /application\/ld\+json/.test(html));
