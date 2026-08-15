const fs = require('node:fs');
const { Resvg } = require('@resvg/resvg-js');
const svg = fs.readFileSync('assets/images/source/ascend-mark.svg', 'utf8');

function scale(s, t) {
  return s.replace(
    /<svg[^>]*>/,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 1024 1024">`
  );
}

for (const size of [48, 76, 96]) {
  const r = new Resvg(scale(svg, size), { fitTo: { mode: 'original' }, background: null });
  const { width, height, pixels } = r.render();
  const idx = (x, y) => (y * width + x) * 4 + 3;
  const solidAt = (x, y) => pixels[idx(Math.round(x * width), Math.round(y * height))] > 100;

  let minX = width, maxX = -1, minY = height, maxY = -1;
  const bands = new Array(10).fill(0);
  let inkCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[idx(x, y)] > 100) {
        inkCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        bands[Math.floor((y / height) * 10)]++;
      }
    }
  }
  const bandPct = bands.map((c) => Math.round((c / (width * (height / 10))) * 100));

  let counterSolid = false;
  for (let y = 0.35; y <= 0.50 && !counterSolid; y += 0.01) counterSolid = solidAt(0.5, y);
  let belowSolid = false;
  for (let y = 0.62; y <= 0.78 && !belowSolid; y += 0.01) belowSolid = solidAt(0.5, y);

  // Gradient sanity: apex should be light (#F4FBFC), feet dark (#8E8E93).
  const color = (x, y) => {
    const i = (Math.round(y * height) * width + Math.round(x * width)) * 4;
    return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
  };
  const barC = color(0.5, 0.56);       // crossbar interior (guaranteed opaque)
  const footC = color(0.30, 0.79);     // left foot interior
  const barOpaque = barC[3] > 200;
  const apexLight = barC[0] > 200 && barC[1] > 200 && barC[2] > 200;
  const footDark = footC[0] < 200 && footC[2] < 200;

  console.log(
    `${size}px ink=${inkCount}px`,
    JSON.stringify({
      inkBBox: {
        x: [minX / width, maxX / width],
        y: [minY / height, maxY / height],
      },
      bandCoveragePct: bandPct,
      counterHoleEmpty: !counterSolid,
      belowBarHoleEmpty: !belowSolid,
      gradient: { barOpaque, apexLight, footDark, bar: barC, foot: footC },
    })
  );
}
