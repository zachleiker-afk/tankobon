/**
 * Generate app icon and splash screen PNG files for Tankobon.
 *
 * Uses pngjs to create simple branded icons:
 *   - icon.png            (1024x1024) - purple bg with white "T"
 *   - adaptive-icon.png   (1024x1024) - same, used as adaptive foreground
 *   - splash-icon.png     (200x200)   - smaller version for splash screen
 *
 * Run:  node scripts/generate-icons.js
 */

const { PNG } = require("pngjs");
const fs = require("fs");
const path = require("path");

// Brand colours
const BG = { r: 108, g: 92, b: 231 }; // #6C5CE7  purple
const FG = { r: 255, g: 255, b: 255 }; // white

/**
 * Draw a filled circle of colour `c` centred at (cx, cy) with radius r
 * into the pixel buffer of `png`.
 */
function fillCircle(png, cx, cy, r, c) {
  const r2 = r * r;
  for (let y = Math.max(0, cy - r); y <= Math.min(png.height - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(png.width - 1, cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        const idx = (png.width * y + x) << 2;
        png.data[idx] = c.r;
        png.data[idx + 1] = c.g;
        png.data[idx + 2] = c.b;
        png.data[idx + 3] = 255;
      }
    }
  }
}

/**
 * Draw a filled rectangle.
 */
function fillRect(png, x0, y0, w, h, c) {
  for (let y = y0; y < y0 + h && y < png.height; y++) {
    for (let x = x0; x < x0 + w && x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = c.r;
      png.data[idx + 1] = c.g;
      png.data[idx + 2] = c.b;
      png.data[idx + 3] = 255;
    }
  }
}

/**
 * Draw a rounded rectangle (filled).
 */
function fillRoundedRect(png, x0, y0, w, h, radius, c) {
  // Fill centre
  fillRect(png, x0 + radius, y0, w - 2 * radius, h, c);
  fillRect(png, x0, y0 + radius, w, h - 2 * radius, c);
  // Four corner circles
  fillCircle(png, x0 + radius, y0 + radius, radius, c);
  fillCircle(png, x0 + w - radius - 1, y0 + radius, radius, c);
  fillCircle(png, x0 + radius, y0 + h - radius - 1, radius, c);
  fillCircle(png, x0 + w - radius - 1, y0 + h - radius - 1, radius, c);
}

/**
 * Draw a "T" letter centred on the image.
 * The T is drawn as two rectangles: horizontal bar + vertical stem.
 */
function drawT(png, size) {
  const s = size; // image dimension

  // Letter proportions relative to image size
  const letterH = Math.round(s * 0.45);     // total height of T
  const barW = Math.round(s * 0.42);         // width of horizontal bar
  const barH = Math.round(s * 0.09);         // height of horizontal bar
  const stemW = Math.round(s * 0.11);        // width of vertical stem
  const stemH = letterH - barH;              // height of vertical stem
  const barRadius = Math.round(barH * 0.35); // rounded corners
  const stemRadius = Math.round(stemW * 0.3);

  // Centre the whole letter
  const cx = Math.round(s / 2);
  const topY = Math.round((s - letterH) / 2);

  // Horizontal bar
  const barX = cx - Math.round(barW / 2);
  fillRoundedRect(png, barX, topY, barW, barH, barRadius, FG);

  // Vertical stem
  const stemX = cx - Math.round(stemW / 2);
  const stemY = topY + barH;
  fillRoundedRect(png, stemX, stemY, stemW, stemH, stemRadius, FG);
}

/**
 * Create a PNG image with purple background and white T.
 */
function createIcon(size) {
  const png = new PNG({ width: size, height: size });

  // Fill background with brand purple
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = BG.r;
      png.data[idx + 1] = BG.g;
      png.data[idx + 2] = BG.b;
      png.data[idx + 3] = 255;
    }
  }

  // Draw the T
  drawT(png, size);

  return PNG.sync.write(png);
}

/**
 * Create the adaptive icon foreground (transparent background, white T).
 * Android adaptive icons have an inherent 18% padding, so the "safe zone"
 * is 66% of the 1024 canvas. We draw the T within that safe zone.
 */
function createAdaptiveIcon(size) {
  const png = new PNG({ width: size, height: size });

  // Fill with brand purple (this will be the foreground layer;
  // the background colour is set in app.json)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = BG.r;
      png.data[idx + 1] = BG.g;
      png.data[idx + 2] = BG.b;
      png.data[idx + 3] = 255;
    }
  }

  drawT(png, size);
  return PNG.sync.write(png);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const assetsDir = path.join(__dirname, "..", "assets");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const targets = [
  { name: "icon.png", size: 1024, gen: createIcon },
  { name: "adaptive-icon.png", size: 1024, gen: createAdaptiveIcon },
  { name: "splash-icon.png", size: 200, gen: createIcon },
  { name: "favicon.png", size: 48, gen: createIcon },
];

for (const t of targets) {
  const buf = t.gen(t.size);
  const dest = path.join(assetsDir, t.name);
  fs.writeFileSync(dest, buf);
  console.log(`Created ${t.name} (${t.size}x${t.size}) -> ${dest}`);
}

console.log("\nDone! Icon assets generated.");
