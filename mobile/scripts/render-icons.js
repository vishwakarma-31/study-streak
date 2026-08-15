// Regenerates every derived Ascend icon asset from the single master SVG
// (mobile/assets/images/source/ascend-mark.svg). Real SVG → PNG rendering via
// @resvg/resvg-js — no hand-exported guesses.
//
// Outputs:
//   logo.png                     1024, paper #F5F4F0 background baked in (app icon / iOS icon)
//   icon.png                     1024, identical surface (Expo default asset name)
//   icon-adaptive-foreground.png 1024, transparent foreground-only (adaptive icon)
//   splash-icon.png              228, transparent, mark fills the canvas (imageWidth:76 → 3x)
//   favicon.png                  48, transparent
//
// Usage: node scripts/render-icons.js
const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

const SOURCE = path.join(__dirname, '..', 'assets', 'images', 'source', 'ascend-mark.svg');
const OUT_DIR = path.join(__dirname, '..', 'assets', 'images');

const PAPER = '#F5F4F0';

function render(svg, { width, height, background, out }) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'original' },
    background,
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(path.join(OUT_DIR, out), png);
  console.log(`wrote ${out} (${width}x${height}${background ? ', ' + background : ''})`);
}

const svg = fs.readFileSync(SOURCE, 'utf8');

function scale(svg, target) {
  return svg.replace(
    /<svg[^>]*>/,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${target}" height="${target}" viewBox="0 0 1024 1024">`
  );
}

// App / iOS icon + Expo default asset name: full-bleed canvas, paper background baked in.
render(scale(svg, 1024), { width: 1024, height: 1024, background: PAPER, out: 'logo.png' });
render(scale(svg, 1024), { width: 1024, height: 1024, background: PAPER, out: 'icon.png' });

// Adaptive foreground: transparent, foreground-only, sized against adaptiveIcon.backgroundColor.
render(scale(svg, 1024), { width: 1024, height: 1024, background: null, out: 'icon-adaptive-foreground.png' });

// Splash: transparent canvas; the mark fills the full width so at imageWidth:76 the
// mark renders exactly 76px wide (canvas is 3x for density).
render(scale(svg, 228), { width: 228, height: 228, background: null, out: 'splash-icon.png' });

// Web favicon.
render(scale(svg, 48), { width: 48, height: 48, background: null, out: 'favicon.png' });

// Legibility verification at the actual render sizes called out in the phase
// (48px and 96px are Android adaptive-icon mip levels). Renders into a temp dir;
// a human checks these visually — small-size legibility can't be proven by code.
const VERIFY_DIR = path.join(require('node:os').tmpdir(), 'opencode', 'ascend-verify');
fs.mkdirSync(VERIFY_DIR, { recursive: true });
for (const size of [48, 76, 96]) {
  const v = scale(svg, size);
  const resvg = new Resvg(v, { fitTo: { mode: 'original' }, background: null });
  fs.writeFileSync(path.join(VERIFY_DIR, `ascend-${size}.png`), resvg.render().asPng());
  console.log(`verify: ${size}px → ${VERIFY_DIR}\\ascend-${size}.png`);
}
