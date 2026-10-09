// Generates simple synthetic clothing photos (garment on a textured background)
// for the end-to-end test, so the repo doesn't need to ship real photos.
import sharp from "sharp";
import path from "node:path";

const out = path.dirname(new URL(import.meta.url).pathname) + "/fixtures";
const shapes = {
  shirt: { color: "#2a4d8f", bg: ["#d8cfc4", "#a99c8c"], d: "M200 120 L260 100 Q300 140 340 100 L400 120 L480 200 L430 250 L400 220 L400 500 L200 500 L200 220 L170 250 L120 200 Z" },
  jeans: { color: "#1c1c1c", bg: ["#e9e4dc", "#c9c0b4"], d: "M210 90 L390 90 L410 520 L320 520 L300 220 L280 520 L190 520 Z" },
  skirt: { color: "#c0312b", bg: ["#dfe7ea", "#b4c2c8"], d: "M230 150 L370 150 L460 470 L140 470 Z" },
};
for (const [name, s] of Object.entries(shapes)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s.bg[0]}"/><stop offset="1" stop-color="${s.bg[1]}"/></linearGradient>
    <filter id="n"><feTurbulence baseFrequency="0.9" numOctaves="2"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.08"/></feComponentTransfer></filter></defs>
    <rect width="600" height="600" fill="url(#g)"/><rect width="600" height="600" filter="url(#n)"/>
    <path d="${s.d}" fill="${s.color}"/></svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(`${out}/${name}.jpg`);
}
console.log("fixtures written to", out);
