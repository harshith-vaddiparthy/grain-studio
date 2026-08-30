/* Static generation for the search-addressable look pages.

   These pages exist so someone searching for "halftone effect" or "cyanotype" can
   land on a real explanation and then open that exact look in the editor. Each one
   is a plain static document with no application JavaScript, so it is fast, fully
   indexable, and works with scripting disabled.

   Files are emitted through Rollup rather than written with node:fs, which keeps
   this free of Node type declarations that the repository does not install. */

import type { Plugin } from "vite";
import { LOOKS, SITE } from "../src/data/looks";

const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const STYLES = `
:root { color-scheme: dark; --bg:#0d0e0c; --panel:#15170f14; --text:#e8e9e1; --muted:#9ea196; --line:#2d2f2a; --accent:#d7ff59; }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--text); font:400 16px/1.65 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; -webkit-font-smoothing:antialiased; }
a { color:inherit; }
.wrap { max-width:720px; margin:0 auto; padding:34px 22px 64px; }
nav { display:flex; gap:8px; align-items:center; font-size:12px; color:var(--muted); margin-bottom:34px; }
nav a { text-decoration:none; border-bottom:1px solid transparent; }
nav a:hover { color:var(--text); border-bottom-color:var(--line); }
.eyebrow { margin:0 0 9px; font:500 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.11em; text-transform:uppercase; color:var(--accent); }
h1 { margin:0 0 14px; font-size:clamp(27px,5vw,38px); line-height:1.14; letter-spacing:-.02em; font-weight:600; }
.summary { margin:0 0 26px; font-size:17px; color:#c9cbc1; }
h2 { margin:38px 0 13px; font-size:16px; font-weight:600; letter-spacing:-.01em; }
p { margin:0 0 14px; }
ul { margin:0 0 14px; padding-left:19px; }
li { margin-bottom:9px; }
dl { margin:0; }
dt { margin-top:15px; font:500 13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--accent); }
dd { margin:3px 0 0; color:#c9cbc1; }
.cta { display:flex; flex-wrap:wrap; gap:10px; margin:30px 0 6px; }
.cta a { display:inline-flex; align-items:center; gap:8px; padding:11px 17px; border-radius:9px; font-size:14px; font-weight:500; text-decoration:none; }
.cta a.primary { background:var(--accent); color:#131409; }
.cta a.primary:hover { filter:brightness(1.07); }
.cta a.secondary { border:1px solid var(--line); color:var(--text); }
.cta a.secondary:hover { border-color:#4a4d43; }
.note { margin:8px 0 0; font-size:13px; color:var(--muted); }
.caveat { margin:14px 0 0; padding:13px 15px; border-left:2px solid var(--line); color:var(--muted); font-size:14px; }
.grid { display:grid; gap:11px; margin:26px 0 0; padding:0; list-style:none; }
.grid a { display:block; padding:15px 17px; border:1px solid var(--line); border-radius:11px; text-decoration:none; }
.grid a:hover { border-color:#4a4d43; background:#14160f; }
.grid strong { display:block; font-size:15px; font-weight:600; margin-bottom:4px; }
.grid span { color:var(--muted); font-size:13px; }
footer { margin-top:52px; padding-top:20px; border-top:1px solid var(--line); font-size:13px; color:var(--muted); }
footer a { text-decoration:none; border-bottom:1px solid var(--line); }
`.trim();

type Meta = {
  title: string;
  description: string;
  path: string;
  jsonLd: unknown;
  body: string;
};

const htmlDocument = ({ title, description, path, jsonLd, body }: Meta) => {
  const url = `${SITE.origin}${path}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}" />
<link rel="canonical" href="${url}" />
<meta name="theme-color" content="#0d0e0c" />
<link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="${escape(SITE.name)}" />
<meta property="og:title" content="${escape(title)}" />
<meta property="og:description" content="${escape(description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${SITE.origin}/icons/icon-512.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escape(title)}" />
<meta name="twitter:description" content="${escape(description)}" />
<style>${STYLES}</style>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<div class="wrap">
${body}
<footer>
  <p>${escape(SITE.name)} runs entirely in your browser. Images are never uploaded, and there is no account.
  Source is available on <a href="${SITE.repository}">GitHub</a>.</p>
</footer>
</div>
</body>
</html>
`;
};

const lookPage = (look: (typeof LOOKS)[number]) => {
  const openUrl = `/?r=${look.recipe}`;
  const body = `<nav><a href="/">Grain Studio</a> <span>/</span> <a href="/looks/">Looks</a> <span>/</span> <span>${escape(look.job)}</span></nav>
<p class="eyebrow">${escape(look.job)}</p>
<h1>${escape(look.title)}</h1>
<p class="summary">${escape(look.summary)}</p>
<div class="cta">
  <a class="primary" href="${openUrl}">Open this look in the editor</a>
  <a class="secondary" href="/looks/">See the other looks</a>
</div>
<p class="note">The link carries the settings only. Your image is added in the browser and never leaves your device.</p>
<h2>What it does</h2>
<p>${escape(look.intro)}</p>
<h2>How it works</h2>
<ul>${look.how.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>
<h2>What each control changes</h2>
<dl>${look.controls.map(([name, detail]) => `<dt>${escape(name)}</dt><dd>${escape(detail)}</dd>`).join("")}</dl>
<h2>Good for</h2>
<ul>${look.goodFor.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>
<p class="caveat"><strong>Less suited to:</strong> ${escape(look.notFor)}</p>
<div class="cta">
  <a class="primary" href="${openUrl}">Try ${escape(look.job)} on your image</a>
</div>`;

  return htmlDocument({
    title: `${look.title} | ${SITE.name}`,
    description: look.summary,
    path: `/looks/${look.slug}/`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: look.title,
      description: look.summary,
      url: `${SITE.origin}/looks/${look.slug}/`,
      isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.origin },
      about: { "@type": "Thing", name: look.job },
      publisher: { "@type": "Person", name: "Harshith Vaddiparthy", url: "https://www.harshith.com" },
    },
    body,
  });
};

const hubPage = () => {
  const body = `<nav><a href="/">Grain Studio</a> <span>/</span> <span>Looks</span></nav>
<p class="eyebrow">Looks</p>
<h1>Image texture effects, explained</h1>
<p class="summary">Each look below is a documented effect you can open directly in the editor with its settings already loaded. Everything renders in your browser; no image is ever uploaded.</p>
<ul class="grid">
${LOOKS.map(
  (look) =>
    `<li><a href="/looks/${look.slug}/"><strong>${escape(look.job)}</strong><span>${escape(look.summary)}</span></a></li>`,
).join("\n")}
</ul>
<div class="cta">
  <a class="primary" href="/">Open the editor</a>
</div>
<p class="note">Grain Studio ships ${LOOKS.length} documented looks and 25 effects in total. The rest are in the editor's own catalog.</p>`;

  return htmlDocument({
    title: `Image texture effects, explained | ${SITE.name}`,
    description:
      "Documented browser-based image texture effects: paper, risograph, halftone, cyanotype, pixelate, and ASCII. Open any look in the editor with its settings loaded.",
    path: "/looks/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Image texture effects, explained",
      url: `${SITE.origin}/looks/`,
      isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.origin },
      hasPart: LOOKS.map((look) => ({
        "@type": "TechArticle",
        headline: look.title,
        url: `${SITE.origin}/looks/${look.slug}/`,
      })),
    },
    body,
  });
};

const sitemap = () => {
  const entries = ["/", "/looks/", ...LOOKS.map((look) => `/looks/${look.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((path) => `  <url><loc>${SITE.origin}${path}</loc></url>`).join("\n")}
</urlset>
`;
};

export function looksPages(): Plugin {
  return {
    name: "grain-studio-looks-pages",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "looks/index.html", source: hubPage() });
      for (const look of LOOKS) {
        this.emitFile({ type: "asset", fileName: `looks/${look.slug}/index.html`, source: lookPage(look) });
      }
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemap() });
    },
  };
}
