import sharp from "sharp";
import { COLORS, type ColorId } from "@/lib/taxonomy";

const PALETTE = COLORS.map((c) => ({ id: c.id, lab: toLab(hexToRgb(c.hex)) }));

/**
 * Detect the main colours of a cutout (PNG with alpha). Only opaque pixels
 * count, so the removed background doesn't skew the result. Returns palette
 * ids covering at least `minShare` of the garment, biggest first (max 3).
 */
export async function detectColors(cutout: Buffer, minShare = 0.15): Promise<ColorId[]> {
  const { data, info } = await sharp(cutout)
    .resize(96, 96, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const counts = new Map<ColorId, number>();
  let total = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 200) continue;
    const lab = toLab([data[i], data[i + 1], data[i + 2]]);
    let best = PALETTE[0];
    let bestD = Infinity;
    for (const p of PALETTE) {
      const d = (lab[0] - p.lab[0]) ** 2 + (lab[1] - p.lab[1]) ** 2 + (lab[2] - p.lab[2]) ** 2;
      if (d < bestD) [best, bestD] = [p, d];
    }
    counts.set(best.id, (counts.get(best.id) ?? 0) + 1);
    total++;
  }
  if (!total) return [];
  return [...counts.entries()]
    .filter(([, n]) => n / total >= minShare)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// sRGB -> CIE Lab (D65), so "nearest colour" matches what people perceive.
function toLab([r, g, b]: [number, number, number] | number[]): [number, number, number] {
  const lin = (c: number) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
