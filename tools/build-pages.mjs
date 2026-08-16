/**
 * Generates the static, indexable half of the site.
 *
 * A <canvas> is opaque to search engines: nothing inside the 3D view can ever
 * be found by someone searching "starship hot stage ring". These pages carry
 * the same text as real HTML, each one linking into the 3D view at that part,
 * so the app becomes findable rather than only shareable.
 *
 * Run it whenever data/vehicle.js changes; the output is committed.
 *
 *   node tools/build-pages.mjs [--base https://example.com/cutaway-os]
 */

import { writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'parts');

const baseArg = process.argv.indexOf('--base');
const BASE = (baseArg > -1 ? process.argv[baseArg + 1] : 'https://ruchishshah.github.io/cutaway-os')
  .replace(/\/+$/, '');

const {
  PARTS,
  VARIANTS,
  DEFAULT_VARIANT,
  SOURCES,
  LAST_VERIFIED,
  vehicleOf,
  stageById,
  stagesTopDown,
  partsForStage,
  partLabel,
  partSpecs,
} = await import(join(ROOT, 'src/data/vehicle.js'));

const variant = VARIANTS[DEFAULT_VARIANT];
const vehicle = vehicleOf(variant);

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

function page({ title, description, canonical, body, breadcrumb }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="color-scheme" content="dark" />
    <link rel="canonical" href="${canonical}" />
    <link rel="stylesheet" href="../styles/main.css" />
    <link rel="stylesheet" href="../styles/page.css" />
    <link
      rel="icon"
      href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E%F0%9F%9A%80%3C/text%3E%3C/svg%3E"
    />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${BASE}/share/cover.png" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body class="doc">
    <div class="doc-wrap">
      <nav class="doc-nav" aria-label="Breadcrumb">${breadcrumb}</nav>
      ${body}
      <footer class="doc-foot">
        <p>
          Figures last checked ${esc(LAST_VERIFIED)}. Starship is an actively changing vehicle and
          public numbers shift between test flights.
          Not affiliated with or endorsed by SpaceX.
        </p>
        <ul>
          ${SOURCES.map((s) => `<li><a href="${s.url}" rel="noopener">${esc(s.label)}</a></li>`).join('\n          ')}
        </ul>
      </footer>
    </div>
  </body>
</html>
`;
}

/* --------------------------------------------------------------- part pages */

const pages = [];

for (const p of PARTS) {
  const name = partLabel(p, variant);
  const stage = stageById(variant, p.stage);
  const rows = partSpecs(p, variant);
  const canonical = `${BASE}/parts/${p.id}.html`;
  const viewUrl = `../index.html?part=${p.id}${p.internal ? '&cut=1' : ''}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${name} — ${vehicle.operator} ${stage.name}`,
    description: p.blurb,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'CutawayOS', url: `${BASE}/` },
    about: { '@type': 'Product', name: `${vehicle.operator} ${stage.name}` },
  };

  const body = `
      <article>
        <p class="doc-eyebrow">${esc(stage.name)} · ${esc(p.group)}${p.internal ? ' · internal' : ''}</p>
        <h1>${esc(name)}</h1>
        <p class="doc-lead">${esc(p.blurb)}</p>

        <a class="doc-cta" href="${viewUrl}">View it in 3D →</a>

        ${
          rows.length
            ? `<h2>Published figures</h2>
        <table class="spec-table">
          <tbody>
            ${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('\n            ')}
          </tbody>
        </table>`
            : ''
        }

        <h2>Where this sits</h2>
        <p>
          Part of the <strong>${esc(stage.name)}</strong> ${esc(stage.sub)} on
          ${esc(variant.name)} (${esc(variant.years)}), a ${variant.height} m vehicle
          ${variant.diameter} m in diameter.
          <a href="./index.html">See every component →</a>
        </p>
      </article>
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;

  pages.push({
    file: `${p.id}.html`,
    url: canonical,
    html: page({
      title: `${name} — ${vehicle.operator} ${stage.name} | CutawayOS`,
      description: p.blurb.slice(0, 300),
      canonical,
      breadcrumb: `<a href="../index.html">CutawayOS</a> <span>/</span> <a href="./index.html">Components</a> <span>/</span> ${esc(name)}`,
      body,
    }),
  });
}

/* --------------------------------------------------------------- the index */

/** One <h2> plus list per stage, nose-first, so any vehicle shape reads right. */
const stageSections = stagesTopDown(variant)
  .map(
    (stage) => `
        <h2>${esc(stage.name)} <span class="doc-sub">${esc(stage.sub)}</span></h2>
        <ul class="doc-list">
          ${partsForStage(stage.id)
            .map(
              (p) =>
                `<li><a href="./${p.id}.html"><strong>${esc(partLabel(p, variant))}</strong>
            <span>${esc(p.group)}${p.internal ? ' · internal' : ''}</span></a></li>`
            )
            .join('\n          ')}
        </ul>`
  )
  .join('\n');

const indexCanonical = `${BASE}/parts/index.html`;
pages.push({
  file: 'index.html',
  url: indexCanonical,
  html: page({
    title: 'Every component of Starship and Super Heavy | CutawayOS',
    description:
      'A reference index of every modelled component of SpaceX Starship and Super Heavy — tanks, ' +
      'engines, flaps, heat shield, grid fins — with published figures and a 3D view of each.',
    canonical: indexCanonical,
    breadcrumb: `<a href="../index.html">CutawayOS</a> <span>/</span> Components`,
    body: `
      <article>
        <p class="doc-eyebrow">Reference</p>
        <h1>Every component</h1>
        <p class="doc-lead">
          ${PARTS.length} parts of SpaceX's Starship and Super Heavy, each with what it does, its
          published figures, and a link into the interactive 3D model. Figures are drawn from
          public sources and marked with ≈ where SpaceX has never formally published them.
        </p>
        <a class="doc-cta" href="../index.html">Open the 3D model →</a>

        ${stageSections}
      </article>`,
  }),
});

/* ------------------------------------------------------------------ write */

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const p of pages) await writeFile(join(OUT, p.file), p.html);

const urls = [`${BASE}/`, ...pages.map((p) => p.url)];
await writeFile(
  join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`
);

await writeFile(
  join(ROOT, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`
);

console.log(`wrote ${pages.length} pages to parts/, plus sitemap.xml and robots.txt`);
