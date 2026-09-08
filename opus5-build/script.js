/* ==========================================================================
   Digilab — a small Digimon-style raising sim.
   No engine, no assets, no build step. Every sprite in here is generated at
   runtime from ellipses and triangles on a 32x32 grid, then auto-outlined and
   auto-shaded, so the whole game is one HTML + one CSS + one JS file.
   ========================================================================== */

'use strict';

/* ---------------------------------------------------------------- utility */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp  = (a, b, t) => a + (b - a) * t;
const rnd   = (a = 1, b = 0) => b + Math.random() * (a - b);
const ri    = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick  = arr => arr[ri(0, arr.length - 1)];

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb string. */
function shade(hex, amt) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  if (amt > 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else         { r *= 1 + amt;         g *= 1 + amt;         b *= 1 + amt; }
  const h = v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

/* ------------------------------------------------------- 5x7 bitmap font
   Uppercase only, on purpose: it is the in-world display face, drawn straight
   onto the canvas so headline type stays crisp at any zoom. */

const GLYPHS = {
  A: '01110,10001,10001,11111,10001,10001,10001',
  B: '11110,10001,10001,11110,10001,10001,11110',
  C: '01110,10001,10000,10000,10000,10001,01110',
  D: '11110,10001,10001,10001,10001,10001,11110',
  E: '11111,10000,10000,11110,10000,10000,11111',
  F: '11111,10000,10000,11110,10000,10000,10000',
  G: '01110,10001,10000,10111,10001,10001,01111',
  H: '10001,10001,10001,11111,10001,10001,10001',
  I: '11111,00100,00100,00100,00100,00100,11111',
  J: '00111,00010,00010,00010,00010,10010,01100',
  K: '10001,10010,10100,11000,10100,10010,10001',
  L: '10000,10000,10000,10000,10000,10000,11111',
  M: '10001,11011,10101,10101,10001,10001,10001',
  N: '10001,11001,10101,10011,10001,10001,10001',
  O: '01110,10001,10001,10001,10001,10001,01110',
  P: '11110,10001,10001,11110,10000,10000,10000',
  Q: '01110,10001,10001,10001,10101,10010,01101',
  R: '11110,10001,10001,11110,10100,10010,10001',
  S: '01111,10000,10000,01110,00001,00001,11110',
  T: '11111,00100,00100,00100,00100,00100,00100',
  U: '10001,10001,10001,10001,10001,10001,01110',
  V: '10001,10001,10001,10001,10001,01010,00100',
  W: '10001,10001,10001,10101,10101,11011,10001',
  X: '10001,10001,01010,00100,01010,10001,10001',
  Y: '10001,10001,01010,00100,00100,00100,00100',
  Z: '11111,00001,00010,00100,01000,10000,11111',
  0: '01110,10001,10011,10101,11001,10001,01110',
  1: '00100,01100,00100,00100,00100,00100,01110',
  2: '01110,10001,00001,00010,00100,01000,11111',
  3: '11111,00010,00100,00010,00001,10001,01110',
  4: '00010,00110,01010,10010,11111,00010,00010',
  5: '11111,10000,11110,00001,00001,10001,01110',
  6: '00110,01000,10000,11110,10001,10001,01110',
  7: '11111,00001,00010,00100,01000,01000,01000',
  8: '01110,10001,10001,01110,10001,10001,01110',
  9: '01110,10001,10001,01111,00001,00010,01100',
  ' ': '00000,00000,00000,00000,00000,00000,00000',
  '.': '00000,00000,00000,00000,00000,01100,01100',
  ',': '00000,00000,00000,00000,01100,01100,01000',
  '!': '00100,00100,00100,00100,00100,00000,00100',
  '?': '01110,10001,00001,00010,00100,00000,00100',
  '-': '00000,00000,00000,11111,00000,00000,00000',
  '+': '00000,00100,00100,11111,00100,00100,00000',
  ':': '00000,01100,01100,00000,01100,01100,00000',
  "'": '00100,00100,00100,00000,00000,00000,00000',
  '/': '00001,00010,00010,00100,01000,01000,10000',
  '%': '11001,11010,00010,00100,01000,01011,10011',
  '*': '00000,10101,01110,11111,01110,10101,00000',
  '>': '10000,01000,00100,00010,00100,01000,10000',
  '<': '00010,00100,01000,10000,01000,00100,00010',
  '(': '00010,00100,01000,01000,01000,00100,00010',
  ')': '01000,00100,00010,00010,00010,00100,01000'
};

const GLYPH_CACHE = {};
function glyph(ch) {
  if (!GLYPH_CACHE[ch]) {
    const src = GLYPHS[ch] || GLYPHS['?'];
    GLYPH_CACHE[ch] = src.split(',');
  }
  return GLYPH_CACHE[ch];
}

const textWidth = (str, s = 1) => str.length ? (str.length * 6 - 1) * s : 0;

/**
 * Draw pixel text. `align` is 'left' | 'center' | 'right'.
 * `shadowColor` paints a 1px offset copy first, which is what keeps white text
 * readable against the bright sky.
 */
function text(ctx, str, x, y, s, color, align = 'left', shadowColor = null) {
  str = String(str).toUpperCase();
  const w = textWidth(str, s);
  if (align === 'center') x -= w / 2;
  else if (align === 'right') x -= w;
  x = Math.round(x); y = Math.round(y);

  if (shadowColor) drawRun(ctx, str, x + s, y + s, s, shadowColor);
  drawRun(ctx, str, x, y, s, color);
}

function drawRun(ctx, str, x, y, s, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < str.length; i++) {
    const rows = glyph(str[i]);
    const gx = x + i * 6 * s;
    for (let r = 0; r < 7; r++) {
      const row = rows[r];
      let run = -1;
      for (let c = 0; c <= 5; c++) {
        const on = c < 5 && row[c] === '1';
        if (on && run < 0) run = c;
        if (!on && run >= 0) {
          ctx.fillRect(gx + run * s, y + r * s, (c - run) * s, s);
          run = -1;
        }
      }
    }
  }
}

/* ------------------------------------------------------ pixel grid + shapes
   Sprites live on a 32x32 grid of colour strings (null = empty). Drawing order
   is back-to-front; later shapes overwrite earlier ones. */

const S = 32;

const mk = () => ({ d: new Array(S * S).fill(null) });

function px(g, x, y, c) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  g.d[y * S + x] = c;
}
function at(g, x, y) {
  if (x < 0 || y < 0 || x >= S || y >= S) return null;
  return g.d[y * S + x];
}
function disc(g, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1.05) px(g, x, y, c);
    }
  }
}
function box(g, x0, y0, w, h, c) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(g, x, y, c);
}
function tri(g, x1, y1, x2, y2, x3, y3, c) {
  const side = (px_, py, ax, ay, bx, by) => (px_ - bx) * (ay - by) - (ax - bx) * (py - by);
  const minx = Math.floor(Math.min(x1, x2, x3)), maxx = Math.ceil(Math.max(x1, x2, x3));
  const miny = Math.floor(Math.min(y1, y2, y3)), maxy = Math.ceil(Math.max(y1, y2, y3));
  for (let y = miny; y <= maxy; y++) {
    for (let x = minx; x <= maxx; x++) {
      const a = side(x, y, x1, y1, x2, y2) < 0;
      const b = side(x, y, x2, y2, x3, y3) < 0;
      const d = side(x, y, x3, y3, x1, y1) < 0;
      if (a === b && b === d) px(g, x, y, c);
    }
  }
}
/** A tapering limb/tail: discs marched along a line. */
function taper(g, x0, y0, x1, y1, r0, r1, c, steps = 14) {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    disc(g, lerp(x0, x1, t), lerp(y0, y1, t), lerp(r0, r1, t), lerp(r0, r1, t), c);
  }
}
/** An eye: white sclera, dark pupil, one highlight pixel. `angry` adds a brow. */
function eye(g, x, y, r, P, angry, shut) {
  if (shut) { box(g, x - r, y, r * 2 + 1, 1, P.line); return; }
  disc(g, x, y, r, r + 0.3, P.sclera);
  disc(g, x + 0.3, y + 0.3, r * 0.62, r * 0.72, P.pupil);
  px(g, x - r * 0.4, y - r * 0.5, P.sclera);
  if (angry) box(g, x - r - 1, y - r - 1, r * 2 + 2, 1, P.line);
}

/**
 * Post-process a finished grid: fake a light source from the upper left, then
 * wrap everything in a 1px outline. This single pass is what makes crude
 * ellipse blobs read as deliberate pixel art.
 */
function finish(g, P) {
  const flat = P.flat || new Set();
  const shaded = new Array(S * S).fill(null);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const c = g.d[y * S + x];
      if (!c) continue;
      if (flat.has(c)) { shaded[y * S + x] = c; continue; }
      const up = at(g, x, y - 1), lf = at(g, x - 1, y);
      const dn = at(g, x, y + 1), rt = at(g, x + 1, y);
      if (!up && !lf)        shaded[y * S + x] = shade(c, 0.30);
      else if (!dn || !rt)   shaded[y * S + x] = shade(c, -0.24);
      else                   shaded[y * S + x] = c;
    }
  }
  g.d = shaded;

  const outlined = g.d.slice();
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (g.d[y * S + x]) continue;
      if (at(g, x - 1, y) || at(g, x + 1, y) || at(g, x, y - 1) || at(g, x, y + 1)) {
        outlined[y * S + x] = P.line;
      }
    }
  }
  g.d = outlined;
  return g;
}

/* ------------------------------------------------------------- the roster
   Ten creatures, each ~15 lines of geometry. Names are invented rather than
   borrowed — this is a Digimon-*style* sim, not the real franchise. */

function pal(o) {
  o.sclera = o.sclera || '#ffffff';
  o.pupil  = o.pupil  || '#221a2e';
  o.flat   = new Set([o.sclera, o.pupil, o.line]);
  return o;
}

const SPECIES = {

  egg: {
    name: 'Digi-Egg', tag: 'Egg',
    P: pal({ body: '#f5eddb', spot: '#3fa9e0', line: '#4a3a5e' }),
    draw(g, P) {
      disc(g, 16, 18, 9.5, 11.5, P.body);
      disc(g, 12, 12, 2.4, 2.2, P.spot);
      disc(g, 21, 15, 2.0, 1.8, P.spot);
      disc(g, 13, 23, 2.6, 2.2, P.spot);
      disc(g, 21, 24, 1.8, 1.6, P.spot);
      disc(g, 17,  9, 1.4, 1.2, P.spot);
    }
  },

  nubbimon: {
    name: 'Nubbimon', tag: 'Baby',
    P: pal({ body: '#ff9ec4', belly: '#ffd9e8', line: '#5a2340',
             pupil: '#2a1b33', mouth: '#c9427a' }),
    draw(g, P, shut) {
      disc(g,  7, 25, 2.4, 2.2, P.body);
      disc(g, 10, 15, 3.2, 3.4, P.body);
      disc(g, 22, 15, 3.2, 3.4, P.body);
      disc(g, 16, 22, 8.2, 7.4, P.body);
      disc(g, 16, 25, 5.0, 3.6, P.belly);
      eye(g, 12.5, 21, 2, P, false, shut);
      eye(g, 19.5, 21, 2, P, false, shut);
      disc(g, 16, 25.5, 1.6, 1.2, P.mouth);
    }
  },

  puffmon: {
    name: 'Puffmon', tag: 'In-training',
    P: pal({ body: '#8fd6ff', belly: '#e6f9ff', line: '#22415e',
             pupil: '#1b2c3d', mouth: '#e0567a' }),
    draw(g, P, shut) {
      taper(g, 12, 16,  5, 3, 3.0, 1.6, P.body);
      taper(g, 20, 16, 27, 3, 3.0, 1.6, P.body);
      disc(g, 11, 28, 3.6, 2.2, P.body);
      disc(g, 21, 28, 3.6, 2.2, P.body);
      disc(g, 16, 21, 9.0, 8.0, P.body);
      disc(g, 16, 24, 5.6, 4.4, P.belly);
      eye(g, 12, 20, 2.3, P, false, shut);
      eye(g, 20, 20, 2.3, P, false, shut);
      disc(g, 16, 25, 2.0, 1.4, P.mouth);
    }
  },

  kobumon: {
    name: 'Kobumon', tag: 'Rookie',
    P: pal({ body: '#ffb03a', belly: '#ffe3b0', line: '#5c2d0d',
             horn: '#f3efe2', pupil: '#2a1a10', mouth: '#8e2f2f' }),
    draw(g, P, shut) {
      taper(g, 3, 25, 12, 22, 1.2, 3.6, P.body);
      box(g, 10, 23, 5, 7, P.body);
      box(g, 17, 23, 5, 7, P.body);
      disc(g, 11, 29, 3.4, 1.8, P.body);
      disc(g, 20, 29, 3.4, 1.8, P.body);
      px(g, 8, 30, P.horn); px(g, 9, 30, P.horn); px(g, 17, 30, P.horn);
      disc(g, 16, 21, 7.0, 6.4, P.body);
      disc(g, 17, 23, 4.6, 4.4, P.belly);
      tri(g, 11, 16, 15, 16, 13, 12, P.horn);
      tri(g, 15, 15, 19, 15, 17, 11, P.horn);
      disc(g, 20, 21, 3.0, 2.6, P.body);
      px(g, 23, 21, P.horn); px(g, 23, 22, P.horn);
      disc(g, 20, 11, 6.6, 5.6, P.body);
      disc(g, 25, 13, 4.2, 3.2, P.body);
      tri(g, 17, 7, 21, 7, 19, 1, P.horn);
      box(g, 22, 15, 7, 1, P.mouth);
      px(g, 27, 14, P.horn);
      eye(g, 21.5, 10, 2, P, false, shut);
    }
  },

  blazorimon: {
    name: 'Blazorimon', tag: 'Champion',
    P: pal({ body: '#e8412f', belly: '#ffd08a', line: '#4d1006',
             horn: '#f6f1e4', pupil: '#2b0d06', mouth: '#7d1414' }),
    draw(g, P, shut) {
      taper(g, 1, 27, 12, 22, 1.2, 4.4, P.body);
      box(g,  9, 22, 6, 8, P.body);
      box(g, 17, 22, 6, 8, P.body);
      disc(g, 11, 29, 4, 2, P.body);
      disc(g, 20, 29, 4, 2, P.body);
      px(g, 7, 30, P.horn); px(g, 8, 30, P.horn);
      px(g, 16, 30, P.horn); px(g, 17, 30, P.horn);
      disc(g, 15, 20, 8.4, 7.4, P.body);
      disc(g, 16, 22, 5.2, 5.0, P.belly);
      tri(g,  7, 15, 11, 15,  9, 10, P.horn);
      tri(g, 11, 13, 15, 13, 13,  8, P.horn);
      disc(g, 20, 20, 3.6, 3.0, P.body);
      px(g, 24, 20, P.horn); px(g, 24, 21, P.horn); px(g, 24, 22, P.horn);
      disc(g, 20, 10, 7.0, 6.0, P.body);
      box(g, 22, 12, 9, 5, P.body);
      disc(g, 26, 12, 4.4, 3.4, P.body);
      tri(g, 26, 10, 31, 9, 27, 5, P.horn);
      box(g, 22, 15, 9, 1, P.mouth);
      px(g, 27, 14, P.horn); px(g, 29, 14, P.horn); px(g, 25, 16, P.horn);
      eye(g, 21, 9, 2, P, true, shut);
    }
  },

  bouldramon: {
    name: 'Bouldramon', tag: 'Champion',
    P: pal({ body: '#8fa06e', shell: '#7a7c86', belly: '#d8d2b8',
             line: '#2b2f22', horn: '#efe6cf', pupil: '#221f14' }),
    draw(g, P, shut) {
      taper(g, 2, 26, 9, 24, 1.2, 3, P.body);
      box(g,  8, 24, 6, 6, P.body);
      box(g, 18, 24, 6, 6, P.body);
      disc(g, 10, 29, 4, 2, P.body);
      disc(g, 21, 29, 4, 2, P.body);
      disc(g, 15, 22, 10.0, 6.4, P.body);
      disc(g, 15, 17, 10.4, 6.2, P.shell);
      disc(g,  9, 17, 2.4, 2.4, shade(P.shell, -0.20));
      disc(g, 15, 15, 2.8, 2.6, shade(P.shell, -0.20));
      disc(g, 21, 17, 2.4, 2.4, shade(P.shell, -0.20));
      tri(g,  7, 13, 11, 13,  9,  8, P.horn);
      tri(g, 13, 11, 17, 11, 15,  6, P.horn);
      tri(g, 19, 13, 23, 13, 21,  8, P.horn);
      disc(g, 25, 21, 5.0, 4.6, P.body);
      tri(g, 27, 22, 31, 20, 29, 25, P.horn);
      eye(g, 26, 19, 1.8, P, true, shut);
    }
  },

  talonmon: {
    name: 'Talonmon', tag: 'Champion',
    P: pal({ body: '#5fc9f5', wing: '#cfeeff', belly: '#f4fbff',
             beak: '#ffc93c', line: '#1b3f5e', pupil: '#12283a' }),
    draw(g, P, shut) {
      tri(g, 4, 3, 16, 17, 3, 20, P.wing);
      tri(g, 1, 28, 12, 22, 8, 30, P.wing);
      box(g, 13, 25, 2, 5, P.beak);
      box(g, 18, 25, 2, 5, P.beak);
      px(g, 12, 30, P.beak); px(g, 15, 30, P.beak);
      px(g, 17, 30, P.beak); px(g, 20, 30, P.beak);
      disc(g, 16, 20, 6.6, 7.0, P.body);
      disc(g, 16, 22, 4.0, 4.6, P.belly);
      tri(g, 10, 12, 23, 21, 9, 26, P.wing);
      disc(g, 20, 11, 5.2, 4.6, P.body);
      tri(g, 17, 7, 21, 7, 19, 2, P.wing);
      tri(g, 23, 10, 31, 12, 23, 15, P.beak);
      eye(g, 21, 10, 1.9, P, true, shut);
    }
  },

  grubmon: {
    name: 'Grubmon', tag: 'Wild',
    P: pal({ body: '#7ec24a', belly: '#d6e88f', line: '#22400f',
             horn: '#3c2a12', sclera: '#fff2b0', pupil: '#8b1414' }),
    draw(g, P, shut) {
      [9, 14, 19].forEach(x => { box(g, x, 24, 1, 5, P.horn); px(g, x - 1, 29, P.horn); });
      taper(g, 4, 21, 10, 20, 3.0, 4.4, P.body);
      disc(g, 16, 20, 5.0, 5.0, P.body);
      disc(g, 22, 19, 4.4, 4.4, P.body);
      disc(g, 13, 23, 3.0, 1.6, P.belly);
      disc(g, 19, 23, 3.0, 1.6, P.belly);
      disc(g, 26, 18, 3.6, 3.4, P.body);
      tri(g, 28, 16, 31, 13, 28, 19, P.horn);
      tri(g, 28, 20, 31, 23, 28, 17, P.horn);
      taper(g, 26, 15, 30, 8, 0.8, 0.6, P.horn, 8);
      eye(g, 27, 17, 1.6, P, true, shut);
    }
  },

  frostmon: {
    name: 'Frostmon', tag: 'Wild',
    P: pal({ body: '#bfe9ff', belly: '#ffffff', shard: '#6fb8e8',
             line: '#1f4a6b', pupil: '#123249' }),
    draw(g, P, shut) {
      disc(g, 11, 28, 3.4, 2.2, P.body);
      disc(g, 21, 28, 3.4, 2.2, P.body);
      disc(g, 16, 21, 8.6, 7.6, P.body);
      disc(g, 16, 24, 5.0, 4.0, P.belly);
      tri(g,  7, 15, 11, 15,  8,  7, P.shard);
      tri(g, 12, 13, 17, 13, 14,  3, P.shard);
      tri(g, 18, 15, 23, 15, 21,  6, P.shard);
      eye(g, 12, 20, 2.2, P, true, shut);
      eye(g, 20, 20, 2.2, P, true, shut);
      box(g, 13, 25, 7, 1, P.line);
      px(g, 14, 26, P.belly); px(g, 18, 26, P.belly);
    }
  },

  skullmon: {
    name: 'Skullmon', tag: 'Wild',
    P: pal({ body: '#4a3560', bone: '#efe9d8', belly: '#6b4d8a',
             line: '#150c22', horn: '#efe9d8', sclera: '#ff7a3d', pupil: '#150c22' }),
    draw(g, P) {
      box(g, 10, 24, 5, 6, P.body);
      box(g, 18, 24, 5, 6, P.body);
      disc(g, 11, 29, 3.6, 2.0, P.body);
      disc(g, 20, 29, 3.6, 2.0, P.body);
      disc(g, 16, 21, 8.0, 6.6, P.body);
      disc(g, 16, 23, 4.6, 3.6, P.belly);
      disc(g,  7, 20, 3.8, 3.4, P.body);
      disc(g, 25, 20, 3.8, 3.4, P.body);
      disc(g, 18, 11, 6.0, 5.4, P.bone);
      tri(g, 12, 8, 16, 8, 11, 1, P.horn);
      tri(g, 20, 8, 24, 8, 25, 1, P.horn);
      disc(g, 16, 11, 2.0, 2.0, P.pupil);
      disc(g, 21, 11, 2.0, 2.0, P.pupil);
      px(g, 16, 11, P.sclera); px(g, 21, 11, P.sclera);
      box(g, 14, 14, 9, 2, P.bone);
      px(g, 16, 15, P.line); px(g, 18, 15, P.line);
      px(g, 20, 15, P.line); px(g, 22, 15, P.line);
    }
  }
};

/* ------------------------------------------------------- sprite rasterizer */

const spriteCache = {};

function sprite(key, blink) {
  const id = key + (blink ? '~b' : '');
  if (spriteCache[id]) return spriteCache[id];

  const sp = SPECIES[key];
  const g = mk();
  sp.draw(g, sp.P, !!blink);
  finish(g, sp.P);

  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const c = cv.getContext('2d');
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const col = g.d[y * S + x];
      if (col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); }
    }
  }
  spriteCache[id] = cv;
  return cv;
}

/** A flat-colour stamp of a sprite — used for the digivolution silhouette. */
function silhouette(key, color) {
  const id = 'sil~' + key + color;
  if (spriteCache[id]) return spriteCache[id];
  const src = sprite(key, false);
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const c = cv.getContext('2d');
  c.drawImage(src, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = color;
  c.fillRect(0, 0, S, S);
  spriteCache[id] = cv;
  return cv;
}

/* ------------------------------------------------------------------ sound
   Tiny square-wave synth. No files, and it stays silent until the first
   click so browsers don't block the audio context. */

const SFX = (() => {
  let ac = null, on = true;

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function blip(freq, dur, type = 'square', vol = 0.06, slide = 0) {
    if (!on) return;
    let a;
    try { a = ctx(); } catch (e) { return; }
    if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + dur);
  }

  const seq = notes => notes.forEach(([f, t, d, ty, v]) =>
    setTimeout(() => blip(f, d || 0.09, ty || 'square', v || 0.06), t));

  return {
    get enabled() { return on; },
    set enabled(v) { on = v; },
    feed:   () => seq([[523, 0], [784, 70]]),
    train:  () => blip(170, 0.14, 'square', 0.07, 260),
    rest:   () => seq([[330, 0, .18], [247, 130, .26]]),
    deny:   () => blip(130, 0.15, 'sawtooth', 0.05),
    tick:   () => blip(1200, 0.03, 'square', 0.025),
    hit:    () => blip(110, 0.16, 'sawtooth', 0.09, -60),
    crit:   () => seq([[880, 0, .06], [1320, 55, .12]]),
    hatch:  () => seq([[400, 0, .07], [400, 110, .07], [660, 240, .3]]),
    evolve: () => seq([[392, 0, .12], [523, 110, .12], [659, 220, .12],
                       [784, 330, .14], [1047, 460, .55]]),
    win:    () => seq([[523, 0, .12], [659, 120, .12], [784, 240, .12], [1047, 380, .45]]),
    lose:   () => seq([[392, 0, .22, 'triangle'], [311, 190, .26, 'triangle'],
                       [233, 400, .55, 'triangle']])
  };
})();

/* ------------------------------------------------------------- game state */

const LINE = ['egg', 'nubbimon', 'puffmon', 'kobumon'];   // stage 4 branches
const XP_TO_GROW = [12, 24, 45, 80, 0];

const G = {
  stage: 0,
  key: 'egg',
  xp: 0,
  pwr: 2, grd: 2, spd: 2,
  hp: 20, maxHp: 20,
  energy: 100,
  full: 3, fullMax: 5,
  wins: 0, losses: 0,
  busy: false
};

const now = () => SPECIES[G.key];
const xpMax = () => XP_TO_GROW[G.stage];
const canEvolve = () => G.stage >= 1 && G.stage < 4 && G.xp >= xpMax();
const canBattle = () => G.stage >= 3;

/* ---------------------------------------------------------------- view fx */

const V = {
  t: 0,
  shake: 0,
  flash: 0,
  flashColor: '#ffffff',
  parts: [],
  pops: [],
  anim: null,     // { kind, t, dur }
  evo: null,      // digivolution sequence
  bubble: null
};

function puff(x, y, n, color, spread = 22) {
  for (let i = 0; i < n; i++) {
    V.parts.push({
      x, y,
      vx: rnd(spread, -spread), vy: rnd(-6, -34),
      life: 0, max: rnd(1.0, 0.45),
      c: color, s: ri(1, 2), g: 42
    });
  }
}
function pop(str, x, y, color, scale = 1) {
  V.pops.push({ str, x, y, c: color, life: 0, max: 0.95, s: scale });
}
/* Photosensitivity: honour the OS setting by dropping camera shake entirely and
   capping full-screen flashes. Gameplay motion itself stays — it is the content. */
const CALM = window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function shake(a) { if (!CALM) V.shake = Math.max(V.shake, a); }
function flash(a, c = '#ffffff') {
  V.flash = Math.max(V.flash, CALM ? Math.min(a, 0.22) : a);
  V.flashColor = c;
}

/* ------------------------------------------------------------------- log */

const logEl = document.getElementById('log');
const logLines = ['A Digi-Egg landed on the plain. Feed it.'];

function say(line) {
  logLines.unshift(line);
  if (logLines.length > 3) logLines.length = 3;
  logEl.innerHTML = logLines
    .map((l, i) => `<p class="${i ? 'log__old' : 'log__now'}">${l}</p>`)
    .join('');
}

/* -------------------------------------------------------------------- UI */

const $ = id => document.getElementById(id);
const els = {
  name: $('c-name'), stage: $('c-stage'), record: $('c-record'),
  pwr: $('s-pwr'), grd: $('s-grd'), spd: $('s-spd'),
  hp: $('m-hp'), hpV: $('v-hp'),
  en: $('m-en'), enV: $('v-en'),
  full: $('m-full'), fullV: $('v-full'),
  xp: $('m-xp'), xpV: $('v-xp'),
  evoRow: document.querySelector('.meter--evo'),
  buttons: Array.from(document.querySelectorAll('.pad [data-act]'))
};

for (let i = 0; i < 5; i++) els.full.appendChild(document.createElement('i'));

const shown = { pwr: 2, grd: 2, spd: 2 };

function syncUI() {
  const sp = now();
  els.name.textContent = sp.name;
  els.stage.textContent = sp.tag;
  els.record.textContent =
    G.wins + (G.wins === 1 ? ' win' : ' wins') +
    (G.losses ? ' · ' + G.losses + (G.losses === 1 ? ' loss' : ' losses') : '');

  ['pwr', 'grd', 'spd'].forEach(k => {
    els[k].textContent = G[k];
    if (shown[k] !== G[k]) {
      shown[k] = G[k];
      const li = els[k].parentElement;
      li.classList.remove('bump');
      void li.offsetWidth;
      li.classList.add('bump');
    }
  });

  els.hp.style.width = (G.hp / G.maxHp * 100) + '%';
  els.hpV.textContent = Math.round(G.hp) + '/' + G.maxHp;
  els.en.style.width = G.energy + '%';
  els.enV.textContent = Math.round(G.energy);

  Array.from(els.full.children).forEach((pip, i) => pip.classList.toggle('on', i < G.full));
  els.fullV.textContent = G.full + '/' + G.fullMax;

  const max = xpMax();
  if (max) {
    els.xp.style.width = clamp(G.xp / max * 100, 0, 100) + '%';
    els.xpV.textContent = Math.min(G.xp, max) + '/' + max;
  } else {
    els.xp.style.width = '100%';
    els.xpV.textContent = 'max';
  }
  els.evoRow.classList.toggle('ready', canEvolve());

  els.buttons.forEach(b => {
    const act = b.dataset.act;
    if (act === 'evolve') { b.hidden = !canEvolve() || G.busy; return; }
    if (act === 'battle') { b.disabled = G.busy || !canBattle(); return; }
    b.disabled = G.busy;
  });
}

/* --------------------------------------------------------------- actions */

const STAT_NAME = { pwr: 'Power', grd: 'Guard', spd: 'Speed' };

function anim(kind, arg) { V.anim = { kind, arg, t: 0, dur: kind === 'rest' ? 1.7 : kind === 'train' ? 1.35 : 1.15 }; }

function checkGrowth() {
  if (canEvolve()) say(now().name + ' is glowing. It can digivolve.');
}

function feed() {
  if (G.busy) return;

  if (G.stage === 0) {
    G.xp += 5;
    SFX.feed(); anim('feed');
    shake(1.5);
    say(pick([
      'The egg wobbles. Something in there is hungry.',
      'A crack runs across the shell.',
      'The egg is warm now. It is nearly time.'
    ]));
    syncUI();
    if (G.xp >= xpMax()) startEvolve('nubbimon', true);
    return;
  }

  if (G.full >= G.fullMax) {
    SFX.deny();
    say(now().name + ' is stuffed and turns away.');
    return;
  }

  G.full++;
  G.energy = clamp(G.energy + 6, 0, 100);
  G.maxHp += 1;
  G.hp = clamp(G.hp + 3, 0, G.maxHp);
  G.xp += 5;
  SFX.feed(); anim('feed');
  say(now().name + ' eats it in one bite. Max health up.');
  syncUI(); checkGrowth();
}

function train(stat) {
  if (G.busy) return;
  if (G.stage === 0) { SFX.deny(); say('There is nothing to train yet. Feed the egg.'); return; }
  if (G.full < 1)    { SFX.deny(); say(now().name + ' is too hungry to train. Feed it first.'); return; }
  if (G.energy < 18) { SFX.deny(); say(now().name + ' is worn out. Let it rest.'); return; }

  G.full--;
  G.energy -= 18;
  const gain = Math.random() < 0.25 ? 2 : 1;
  G[stat] += gain;
  G.maxHp += 2;
  G.hp = clamp(G.hp + 2, 0, G.maxHp);
  G.xp += 12;

  SFX.train(); anim('train', stat);
  say(now().name + ' drills hard. ' + STAT_NAME[stat] + ' +' + gain + '.');
  syncUI(); checkGrowth();
}

function rest() {
  if (G.busy) return;
  G.energy = clamp(G.energy + 42, 0, 100);
  G.hp = clamp(G.hp + Math.ceil(G.maxHp * 0.35), 0, G.maxHp);
  G.xp += 2;
  SFX.rest(); anim('rest');
  say(now().name + ' curls up and naps. Energy back.');
  syncUI(); checkGrowth();
}

/* ---------------------------------------------------------- digivolution */

function nextKey() {
  if (G.stage < 3) return LINE[G.stage + 1];
  const best = Math.max(G.pwr, G.grd, G.spd);
  if (G.pwr === best) return 'blazorimon';
  if (G.grd === best) return 'bouldramon';
  return 'talonmon';
}

function startEvolve(target, isHatch) {
  if (G.busy) return;
  G.busy = true;
  V.anim = null;
  V.evo = { t: 0, dur: isHatch ? 2.6 : 3.6, swapAt: isHatch ? 1.2 : 1.9,
            to: target, from: G.key, isHatch, swapped: false };
  (isHatch ? SFX.hatch : SFX.evolve)();
  syncUI();
}

function applyEvolve(target) {
  const fromName = now().name;
  G.key = target;
  G.stage++;
  G.xp = 0;
  const b = G.stage;
  G.maxHp += 8 * b;
  G.hp = G.maxHp;
  G.pwr += b; G.grd += b; G.spd += b;
  G.energy = 100;
  G.full = clamp(G.full + 1, 0, G.fullMax);

  say(G.stage === 1
    ? 'The egg cracks open. ' + now().name + ' is here.'
    : fromName + ' digivolved to ' + now().name + '.');

  if (G.stage === 3) say(now().name + ' can fight now. Find an opponent.');
  syncUI();
}

/* ------------------------------------------------------------ upkeep tick
   Hunger ticks down on its own so the creature feels alive on camera, but
   gently — nothing here can kill it while you are idle. */

let upkeep = 0;
function tickUpkeep(dt) {
  if (G.busy || G.stage === 0) return;
  upkeep += dt;
  if (upkeep < 15) return;
  upkeep = 0;
  if (G.full > 0) {
    G.full--;
    if (G.full === 0) say(now().name + ' is hungry.');
  } else {
    G.energy = clamp(G.energy - 8, 0, 100);
  }
  syncUI();
}

/* ----------------------------------------------------------------- battle
   Auto-resolving turn order with a windup / strike / recover beat, so the
   player watches the fight instead of clicking through it. */

const ENEMIES = ['grubmon', 'frostmon', 'skullmon'];
const BIAS = { grubmon: [.36, .28, .36], frostmon: [.30, .44, .26], skullmon: [.46, .32, .22] };

const BANNER_AT = 0.55;   // damage number flies, then the banner slams in

const B = {
  on: false, phase: '', t: 0,
  p: null, e: null, order: [], actor: null, struck: false,
  result: null, pShown: 1, eShown: 1
};

function startBattle() {
  if (G.busy || !canBattle()) return;

  const key = pick(ENEMIES);
  const bias = BIAS[key];
  const budget = Math.max(9, Math.round((G.pwr + G.grd + G.spd) * rnd(1.12, 0.76)));
  const e = {
    key, name: SPECIES[key].name,
    pwr: Math.max(1, Math.round(budget * bias[0])),
    grd: Math.max(1, Math.round(budget * bias[1])),
    spd: Math.max(1, Math.round(budget * bias[2]))
  };
  e.maxHp = Math.max(14, Math.round(G.maxHp * rnd(1.05, 0.68)));
  e.hp = e.maxHp;

  B.on = true; B.phase = 'intro'; B.t = 0;
  B.result = null; B.order = []; B.actor = null; B.struck = false;
  B.e = e;
  B.p = {
    isPlayer: true, key: G.key, name: now().name,
    pwr: G.pwr, grd: G.grd, spd: G.spd,
    hp: Math.max(1, Math.round(G.hp)), maxHp: G.maxHp
  };
  B.pShown = B.p.hp / B.p.maxHp;
  B.eShown = 1;

  G.busy = true;
  V.anim = null;
  say(e.name + ' blocks the path.');
  syncUI();
}

function buildOrder() {
  const p = B.p, e = B.e;
  const fast = p.spd >= e.spd ? p : e;
  const slow = fast === p ? e : p;
  B.order = [fast, slow];
  if (fast.spd >= slow.spd * 1.6) B.order.push(fast);   // speed demons get a double
}

function resolveHit(a, d) {
  const care = a.isPlayer
    ? 0.86 + (G.full / G.fullMax) * 0.12 + (G.energy / 100) * 0.12
    : 1;
  let dmg = a.pwr * rnd(1.18, 0.84) * care - d.grd * 0.42;
  const crit = Math.random() < a.spd / (a.spd + 55);
  if (crit) dmg *= 1.75;
  dmg = Math.max(1, Math.round(dmg));
  d.hp = Math.max(0, d.hp - dmg);
  return { dmg, crit };
}

function updateBattle(dt) {
  B.t += dt;
  B.pShown = lerp(B.pShown, B.p.hp / B.p.maxHp, clamp(dt * 8, 0, 1));
  B.eShown = lerp(B.eShown, B.e.hp / B.e.maxHp, clamp(dt * 8, 0, 1));

  if (B.phase === 'intro') {
    if (B.t >= 1.5) { B.phase = 'turn'; B.t = 0; B.actor = null; }
    return;
  }

  if (B.phase === 'turn') {
    if (!B.actor) {
      if (!B.order.length) buildOrder();
      B.actor = B.order.shift();
      B.struck = false;
      B.t = 0;
      return;
    }
    if (!B.struck && B.t >= 0.34) {
      B.struck = true;
      const a = B.actor;
      const d = a === B.p ? B.e : B.p;
      const r = resolveHit(a, d);
      const tx = d === B.p ? 74 : 182;
      pop('-' + r.dmg, tx, 74, r.crit ? '#ffd23f' : '#ffffff', r.crit ? 2 : 1);
      if (r.crit) pop('critical', tx, 60, '#ffd23f', 1);
      puff(tx, 98, r.crit ? 16 : 9, r.crit ? '#ffd23f' : '#fff3d0', 32);
      shake(r.crit ? 5 : 3);
      flash(r.crit ? 0.45 : 0.18, '#ffffff');
      (r.crit ? SFX.crit : SFX.hit)();
      if (d.hp <= 0) { endBattle(d !== B.p); return; }
    }
    if (B.t >= 0.98) B.actor = null;
    return;
  }

  if (B.phase === 'result') {
    if (!B.cleared && B.t >= BANNER_AT) { V.pops.length = 0; B.cleared = true; }
    if (B.t >= 3.3) closeBattle();
  }
}

function endBattle(won) {
  B.phase = 'result'; B.t = 0; B.result = won ? 'win' : 'lose';
  B.actor = null;
  B.cleared = false;

  if (won) {
    G.wins++;
    G.xp += 35;
    G.maxHp += 5;
    const s = pick(['pwr', 'grd', 'spd']);
    G[s] += 2;
    G.hp = Math.max(1, B.p.hp);
    G.energy = clamp(G.energy - 15, 0, 100);
    G.full = clamp(G.full - 1, 0, G.fullMax);
    say(now().name + ' beat ' + B.e.name + '. ' + STAT_NAME[s] + ' +2.');
    SFX.win();
    flash(0.65, '#fff6cf');
    puff(128, 96, 40, '#ffd23f', 60);
  } else {
    G.losses++;
    G.xp += 10;
    G.hp = Math.max(1, Math.round(G.maxHp * 0.15));
    G.energy = clamp(G.energy - 25, 0, 100);
    say(B.e.name + ' won. ' + now().name + ' limps home. Rest, then train.');
    SFX.lose();
    flash(0.45, '#ff4f3b');
  }
  shake(7);
  syncUI();
}

function closeBattle() {
  B.on = false;
  G.busy = false;
  V.anim = null;
  syncUI();
  checkGrowth();
}

/* --------------------------------------------------------------- renderer */

const cv = document.getElementById('stage');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

const W = 256, H = 160, GROUND = 128;

/** Ellipses drawn scanline-by-scanline so they stay hard-edged like the sprites. */
function pixDisc(c, cx, cy, rx, ry) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const t = (y - cy) / ry;
    if (t * t > 1) continue;
    const w = Math.round(rx * Math.sqrt(1 - t * t));
    c.fillRect(Math.round(cx - w), y, w * 2, 1);
  }
}

const bgCache = {};
function bgLayer(mode) {
  if (bgCache[mode]) return bgCache[mode];
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  const sky = x.createLinearGradient(0, 0, 0, GROUND);
  if (mode === 'battle') {
    sky.addColorStop(0, '#1e0d32'); sky.addColorStop(.45, '#5d1f45');
    sky.addColorStop(.8, '#c1483a'); sky.addColorStop(1, '#f0894a');
  } else {
    sky.addColorStop(0, '#16256b'); sky.addColorStop(.38, '#6157c6');
    sky.addColorStop(.72, '#e58fae'); sky.addColorStop(1, '#ffcf9a');
  }
  x.fillStyle = sky;
  x.fillRect(0, 0, W, GROUND);

  // Banding the sky into steps sells the low-colour LCD look.
  x.globalAlpha = 0.07;
  x.fillStyle = '#000';
  for (let y = 0; y < GROUND; y += 6) x.fillRect(0, y, W, 3);
  x.globalAlpha = 1;

  x.fillStyle = mode === 'battle' ? 'rgba(255,140,90,.5)' : 'rgba(255,240,190,.72)';
  pixDisc(x, mode === 'battle' ? 202 : 54, 52, 20, 20);

  const ridge = (color, base, amp, step) => {
    let h = base;
    x.fillStyle = color;
    for (let i = 0; i < W; i += step) {
      h += rnd(amp, -amp);
      h = clamp(h, base - 15, base + 9);
      const top = Math.round(h);
      x.fillRect(i, top, step, GROUND - top);
    }
  };
  ridge(mode === 'battle' ? '#3d1c40' : '#3f3a86', GROUND - 44, 7, 8);
  ridge(mode === 'battle' ? '#2a1230' : '#2b2660', GROUND - 24, 5, 6);

  bgCache[mode] = c;
  return c;
}

function drawGround(mode) {
  ctx.fillStyle = mode === 'battle' ? '#231328' : '#2a2050';
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = mode === 'battle' ? '#5c2c3a' : '#6b53a0';
  ctx.fillRect(0, GROUND, W, 2);

  ctx.fillStyle = mode === 'battle' ? '#3a2038' : '#3d3070';
  for (let i = 1; i <= 7; i++) {
    const t = i / 7;
    ctx.fillRect(0, GROUND + Math.round((H - GROUND) * t * t), W, 1);
  }
  const off = (V.t * 13) % 30;
  for (let i = -6; i <= 6; i++) {
    const xB = 128 + i * 30 + off;
    for (let y = GROUND + 1; y < H; y++) {
      const t = (y - GROUND) / (H - GROUND);
      ctx.fillRect(Math.round(lerp(128, xB, t)), y, 1, 1);
    }
  }
}

const motes = Array.from({ length: 22 }, () => ({
  x: rnd(W), y: rnd(GROUND), v: rnd(11, 3), p: rnd(6.28)
}));
function drawMotes(dt) {
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  for (const m of motes) {
    m.y -= m.v * dt;
    if (m.y < 0) { m.y = GROUND; m.x = rnd(W); }
    ctx.fillRect(Math.round(m.x + Math.sin(V.t + m.p) * 3), Math.round(m.y), 1, 1);
  }
}

/** Draw a creature so grid row 31 lands on `footY` and column 16 on `cx`. */
function drawCreature(key, cx, footY, scale, o) {
  o = o || {};
  const img = o.sil ? silhouette(key, o.sil) : sprite(key, o.blink);
  ctx.save();
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  ctx.translate(Math.round(cx), Math.round(footY));
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1);
  ctx.drawImage(img, -16 * scale, -32 * scale, S * scale, S * scale);
  ctx.restore();
}

function drawShadow(cx, footY, w) {
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  pixDisc(ctx, cx, footY - 1, w, Math.max(2, w * 0.26));
}

/* ------------------------------------------------------------- care scene */

const TRAIN_HITS = [0.18, 0.51, 0.84];

function updateAnim(dt) {
  const a = V.anim;
  if (!a) return;
  a.t += dt;
  const p = a.t / a.dur;

  if (a.kind === 'train') {
    a.h = a.h || 0;
    while (a.h < 3 && p >= TRAIN_HITS[a.h]) {
      a.h++;
      puff(176, GROUND - 26, 7, '#ffe0a0', 20);
      shake(2.6);
      SFX.tick();
    }
  } else if (a.kind === 'feed' && !a.ate && p >= 0.42) {
    a.ate = true;
    puff(128, GROUND - 58, 8, '#ffd98a', 18);
    pop('+', 128, GROUND - 78, '#c2dd68', 1);
  } else if (a.kind === 'rest') {
    a.z = a.z || 0;
    if (a.t > a.z * 0.42) {
      a.z++;
      pop('z', 150, GROUND - 66, 'rgba(255,255,255,.85)', 1);
    }
  }

  if (a.t >= a.dur) {
    if (a.kind === 'train') pop(STAT_NAME[a.arg] + ' up', 128, 52, '#ffd23f', 1);
    V.anim = null;
  }
}

function drawCare() {
  const a = V.anim;
  const key = G.key;
  const scale = 3;
  let cx = 128, dy = 0, sx = 1, sy = 1, rot = 0;
  let blink = (V.t % 3.6) < 0.13;

  if (G.stage === 0) {
    rot = Math.sin(V.t * 2.2) * 0.07;
    if (a) rot = Math.sin(a.t * 34) * 0.16 * (1 - a.t / a.dur);
  } else {
    dy = -Math.abs(Math.sin(V.t * 2.6)) * 2.2;
    sy = 1 + Math.sin(V.t * 2.6) * 0.02;
  }

  if (a) {
    const p = a.t / a.dur;
    if (a.kind === 'feed' && p >= 0.42) {
      const h = Math.abs(Math.sin((p - 0.42) / 0.58 * Math.PI * 2));
      dy = -h * 9; sy = 1 + h * 0.05;
    } else if (a.kind === 'train') {
      // Three lunges at the practice post.
      const rep = (p * 3) % 1;
      const push = Math.sin(clamp(rep, 0, 1) * Math.PI);
      cx = 128 + push * 22;
      dy = -push * 5;
      sx = 1 + push * 0.05;
    } else if (a.kind === 'rest') {
      blink = true;
      sy = 0.9 + Math.sin(V.t * 2) * 0.02;
      sx = 1.07;
      dy = 0;
    }
  }

  if (a && a.kind === 'train') drawPost(176, GROUND, a);
  drawShadow(cx, GROUND, 18 + dy * 0.2);
  drawCreature(key, cx, GROUND + dy, scale, { blink, sx, sy, rot });

  if (a && a.kind === 'feed' && a.t / a.dur < 0.42) {
    const p = (a.t / a.dur) / 0.42;
    drawFood(128, lerp(14, GROUND - 58, p * p));
  }
}

function drawPost(x, footY, a) {
  const wob = a.h ? Math.sin(a.t * 40) * 3 * Math.max(0, 1 - (a.t - TRAIN_HITS[a.h - 1] * a.dur) * 4) : 0;
  ctx.fillStyle = '#5a4020';
  ctx.fillRect(x - 2, footY - 22, 4, 22);
  ctx.fillStyle = '#c8a05a';
  ctx.fillRect(x - 7 + wob, footY - 44, 14, 22);
  ctx.fillStyle = '#8a6a34';
  ctx.fillRect(x - 7 + wob, footY - 34, 14, 3);
  ctx.fillRect(x - 7 + wob, footY - 26, 14, 3);
}

function drawFood(x, y) {
  ctx.fillStyle = '#f2e2c0';
  ctx.fillRect(x - 5, y - 4, 10, 8);
  ctx.fillStyle = '#d94f3d';
  ctx.fillRect(x - 3, y - 2, 6, 4);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 4, y - 3, 2, 2);
}

/* ----------------------------------------------------------- battle scene */

function lunge(who) {
  if (B.phase !== 'turn' || B.actor !== who) return { dx: 0, dy: 0 };
  const dir = who === B.p ? 1 : -1, t = B.t;
  if (t < 0.30) return { dx: -dir * 5 * (t / 0.30), dy: 0 };
  if (t < 0.42) { const k = (t - 0.30) / 0.12; return { dx: dir * lerp(-5, 32, k), dy: -k * 6 }; }
  const k = clamp((t - 0.42) / 0.5, 0, 1);
  return { dx: dir * 32 * (1 - k), dy: -(1 - k) * 6 };
}

function flinch(who) {
  if (B.phase !== 'turn' || !B.struck || B.actor === who) return { dx: 0, hide: false };
  const k = clamp((B.t - 0.34) / 0.3, 0, 1);
  if (k >= 1) return { dx: 0, hide: false };
  const dir = who === B.p ? -1 : 1;
  return { dx: dir * 7 * (1 - k), hide: Math.floor(B.t * 44) % 2 === 0 };
}

function hpBar(x, y, w, ratio, label, right) {
  text(ctx, label, right ? x + w : x, y - 10, 1, '#ffffff', right ? 'right' : 'left', 'rgba(0,0,0,.7)');
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(x - 1, y - 1, w + 2, 8);
  ctx.fillStyle = '#1d1226';
  ctx.fillRect(x, y, w, 6);
  const c = ratio > 0.5 ? '#7ad46a' : ratio > 0.22 ? '#ffd23f' : '#ff4f3b';
  const fw = Math.max(0, Math.round(w * clamp(ratio, 0, 1)));
  ctx.fillStyle = c;
  ctx.fillRect(x, y, fw, 6);
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.fillRect(x, y, fw, 1);
}

function drawBattle() {
  const foot = 132, sc = 2;
  let px_ = 74, ex = 182;

  if (B.phase === 'intro') {
    const k = 1 - Math.pow(1 - clamp(B.t / 0.75, 0, 1), 3);
    px_ = lerp(-40, 74, k);
    ex = lerp(300, 182, k);
  }

  const pl = lunge(B.p), pf = flinch(B.p);
  const el = lunge(B.e), ef = flinch(B.e);
  const bob = Math.abs(Math.sin(V.t * 3)) * 1.6;

  drawShadow(px_ + pl.dx + pf.dx, foot, 15);
  drawShadow(ex + el.dx + ef.dx, foot, 15);

  if (!pf.hide) {
    drawCreature(B.p.key, px_ + pl.dx + pf.dx, foot + pl.dy - bob, sc,
      { blink: (V.t % 3.6) < 0.13 });
  }
  if (!ef.hide) {
    drawCreature(B.e.key, ex + el.dx + ef.dx, foot + el.dy - bob, sc,
      { flip: true, blink: (V.t % 4.1) < 0.13 });
  }

  hpBar(8, 22, 96, B.pShown, B.p.name, false);
  hpBar(W - 104, 22, 96, B.eShown, B.e.name, true);

  if (B.phase === 'intro' && B.t > 0.55) {
    const s = Math.max(3, Math.round(lerp(6, 4, clamp((B.t - 0.55) / 0.25, 0, 1))));
    text(ctx, 'vs', 128, 58, s, '#ffd23f', 'center', '#57121f');
  }

  if (B.phase === 'result' && B.t >= BANNER_AT) {
    const bt = B.t - BANNER_AT;
    const s = Math.max(3, Math.round(lerp(7, 4, clamp(bt / 0.2, 0, 1))));
    ctx.fillStyle = 'rgba(10,4,16,.72)';
    ctx.fillRect(0, 50, W, 56);
    ctx.fillStyle = B.result === 'win' ? 'rgba(255,210,63,.55)' : 'rgba(255,79,59,.55)';
    ctx.fillRect(0, 50, W, 1);
    ctx.fillRect(0, 105, W, 1);
    text(ctx, B.result === 'win' ? 'victory' : 'defeat', 128, 58, s,
      B.result === 'win' ? '#ffd23f' : '#ff6a55', 'center', '#170812');
    if (bt > 0.3) {
      text(ctx, B.result === 'win' ? 'growth +35' : 'rest, then train again', 128, 92, 1,
        '#ffffff', 'center', 'rgba(0,0,0,.8)');
    }
  }
}

/* ------------------------------------------------------ digivolution scene */

function ring(cx, cy, r, alpha, color) {
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.fillStyle = color;
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.6), 2, 2);
  }
  ctx.globalAlpha = 1;
}

function rays(cx, cy, k, t) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 1.5);
  ctx.globalAlpha = 0.34 * k;
  ctx.fillStyle = '#fff6c8';
  for (let i = 0; i < 10; i++) {
    ctx.rotate(Math.PI * 2 / 10);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(230, -12);
    ctx.lineTo(230, 12);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function updateEvo(dt) {
  const E = V.evo;
  E.t += dt;

  if (E.t < E.swapAt && Math.random() < dt * 30) {
    const a = rnd(6.28), r = rnd(90, 55);
    V.parts.push({
      x: 128 + Math.cos(a) * r, y: GROUND - 48 + Math.sin(a) * r * 0.7,
      vx: -Math.cos(a) * r * 1.5, vy: -Math.sin(a) * r * 1.1,
      life: 0, max: 0.72, c: '#fff6c8', s: 2, g: 0
    });
  }

  if (!E.swapped && E.t >= E.swapAt) {
    E.swapped = true;
    applyEvolve(E.to);
    flash(1, '#ffffff');
    puff(128, GROUND - 48, 46, '#ffffff', 74);
    shake(6);
  }

  if (E.t >= E.dur) {
    V.evo = null;
    G.busy = false;
    syncUI();
    checkGrowth();
  }
}

function drawEvolve() {
  const E = V.evo;
  const p = E.t, cx = 128, sc = 3;
  const k = p < E.swapAt
    ? clamp(p / E.swapAt, 0, 1)
    : clamp(1 - (p - E.swapAt) / 0.9, 0, 1);

  if (k > 0.02) rays(cx, GROUND - 48, k, p);
  drawShadow(cx, GROUND, 18);

  if (!E.swapped) {
    const jitter = Math.sin(p * 62) * k * 3;
    const white = p > E.swapAt - 0.7;
    drawCreature(E.from, cx + jitter, GROUND, sc, {
      sil: white ? '#ffffff' : null,
      sx: 1 + k * 0.12, sy: 1 + k * 0.12
    });
  } else {
    const g = clamp((p - E.swapAt) / 0.7, 0, 1);
    drawCreature(G.key, cx, GROUND, sc, {
      sil: g < 1 ? '#ffffff' : null,
      sx: lerp(1.35, 1, g), sy: lerp(1.35, 1, g)
    });
    if (g < 1) ring(cx, GROUND - 48, 20 + g * 92, 1 - g, '#ffffff');

    const nt = p - (E.swapAt + 0.7);
    if (nt > 0) {
      const s = Math.max(2, Math.round(lerp(7, 3, clamp(nt / 0.16, 0, 1))));
      text(ctx, now().name, cx, 26, s, '#ffd23f', 'center', '#3a1c00');
      if (nt > 0.28) {
        text(ctx, now().tag, cx, 26 + s * 7 + 7, 1, '#ffffff', 'center', 'rgba(0,0,0,.7)');
      }
    }
  }
}

/* -------------------------------------------------------- particles + loop */

function updateFx(dt) {
  for (let i = V.parts.length - 1; i >= 0; i--) {
    const q = V.parts[i];
    q.life += dt;
    if (q.life >= q.max) { V.parts.splice(i, 1); continue; }
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vy += (q.g || 0) * dt;
  }
  for (let i = V.pops.length - 1; i >= 0; i--) {
    const q = V.pops[i];
    q.life += dt;
    if (q.life >= q.max) V.pops.splice(i, 1);
  }
}

function drawFx() {
  for (const q of V.parts) {
    ctx.globalAlpha = clamp(1 - q.life / q.max, 0, 1);
    ctx.fillStyle = q.c;
    ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s);
  }
  ctx.globalAlpha = 1;
  for (const q of V.pops) {
    const k = q.life / q.max;
    ctx.globalAlpha = clamp(1 - k * k, 0, 1);
    text(ctx, q.str, q.x, q.y - k * 18, q.s, q.c, 'center', 'rgba(0,0,0,.7)');
  }
  ctx.globalAlpha = 1;
}

function draw(dt) {
  ctx.fillStyle = '#100a1c';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (V.shake > 0.1) {
    ctx.translate(Math.round(rnd(V.shake, -V.shake)), Math.round(rnd(V.shake, -V.shake)));
  }

  const mode = B.on ? 'battle' : 'care';
  ctx.drawImage(bgLayer(mode), 0, 0);
  drawGround(mode);
  drawMotes(dt);

  if (V.evo) drawEvolve();
  else if (B.on) drawBattle();
  else drawCare();

  drawFx();
  ctx.restore();

  if (V.flash > 0.004) {
    ctx.globalAlpha = clamp(V.flash, 0, 1);
    ctx.fillStyle = V.flashColor;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#000';
  for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
  ctx.globalAlpha = 1;
}

let last = 0;
function frame(t) {
  if (!last) last = t;
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;

  V.t += dt;
  V.shake = Math.max(0, V.shake - dt * 22);
  V.flash = Math.max(0, V.flash - dt * 2.6);

  updateFx(dt);
  if (V.evo) updateEvo(dt);
  else if (B.on) updateBattle(dt);
  else { updateAnim(dt); tickUpkeep(dt); }

  draw(dt);
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ input */

function doAct(act) {
  if (G.busy) return;
  if (act === 'feed') feed();
  else if (act === 'rest') rest();
  else if (act === 'battle') startBattle();
  else if (act === 'evolve') { if (canEvolve()) startEvolve(nextKey(), false); }
  else if (act.indexOf('train:') === 0) train(act.slice(6));
}

els.buttons.forEach(b => b.addEventListener('click', () => doAct(b.dataset.act)));

const KEYS = {
  '1': 'feed', '2': 'rest', '3': 'train:pwr', '4': 'train:grd', '5': 'train:spd',
  b: 'battle', e: 'evolve'
};
document.addEventListener('keydown', ev => {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
  const act = KEYS[ev.key.toLowerCase()];
  if (!act) return;
  ev.preventDefault();
  doAct(act);
});

const muteBtn = $('mute');
muteBtn.addEventListener('click', () => {
  SFX.enabled = !SFX.enabled;
  muteBtn.setAttribute('aria-pressed', String(!SFX.enabled));
  muteBtn.textContent = SFX.enabled ? 'Sound on' : 'Sound off';
});

syncUI();
requestAnimationFrame(frame);
