// Chaos Meme Factory — Meme Reactor Core: draggable captions, stickers, presets, chaos seed, live mutation

// Elements
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');

const btnChaos = document.getElementById('btn-chaos');
const btnDownload = document.getElementById('btn-download');
const btnReset = document.getElementById('btn-reset');
const btnReactor = document.getElementById('btn-reactor');
const btnGacha = document.getElementById('btn-gacha');

const presetSelect = document.getElementById('preset');
const chaosSeedInput = document.getElementById('chaos-seed');
const chaosLockInput = document.getElementById('chaos-lock');
const mutateToggle = document.getElementById('mutate-toggle');
const mutateIntervalInput = document.getElementById('mutate-interval');
const reactorLog = document.getElementById('reactor-log');

const textTopInput = document.getElementById('text-top');
const textBottomInput = document.getElementById('text-bottom');
const fontSizeInput = document.getElementById('font-size');
const outlineInput = document.getElementById('outline');
const fillColorInput = document.getElementById('fill-color');
const strokeColorInput = document.getElementById('stroke-color');
const allCapsInput = document.getElementById('all-caps');
const glitchFontsInput = document.getElementById('glitch-fonts');

const fxHue = document.getElementById('fx-hue');
const fxNoise = document.getElementById('fx-noise');
const fxPixel = document.getElementById('fx-pixel');
const fxPost = document.getElementById('fx-post');
const fxSwirl = document.getElementById('fx-swirl');
const fxKaleido = document.getElementById('fx-kaleido');
const fxGlitch = document.getElementById('fx-glitch');
const fxDither = document.getElementById('fx-dither');

const addSticker1 = document.getElementById('add-sticker-1');
const addSticker2 = document.getElementById('add-sticker-2');
const addSticker3 = document.getElementById('add-sticker-3');
const stickerScale = document.getElementById('sticker-scale');
const stickerRot = document.getElementById('sticker-rot');
const stickerRemove = document.getElementById('sticker-remove');

const MAX_DIM = 1200; // cap input image to keep effects snappy

// State
const state = {
  src: null,            // source image canvas
  work: null,           // working canvas
  w: 0, h: 0,           // dimensions

  // captions
  top: '',
  bottom: '',
  fontSize: 64,
  outline: 6,
  fillColor: '#ffffff',
  strokeColor: '#000000',
  allCaps: true,
  topPos: null,
  bottomPos: null,

  // effects
  hue: 0,
  noise: 0,          // 0..100
  pixel: 0,          // block size (0 off)
  posterize: 0,      // levels (0 off)
  swirl: 0,          // 0..100
  kaleido: 0,        // segments (0 off)
  glitch: 0,         // 0..100
  dither: false,

  // chaos
  chaosSeed: 0,
  chaosLock: false,

  // stickers
  stickers: [], // {img, x, y, scale, rot, w, h}
  selectedSticker: -1,
};

// Utils
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let seededRand = null;
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rand(a, b) {
  const r = state.chaosLock && seededRand ? seededRand() : Math.random();
  return a + r * (b - a);
}

// Create canvas helper
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// RGB <-> HSL for hue shifting
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Effects (same as before)
function applyHueShift(img, deg) {
  if (!deg) return img;
  const w = img.width, h = img.height;
  const out = makeCanvas(w, h);
  const octx = out.getContext('2d', { willReadFrequently: true });
  octx.drawImage(img, 0, 0);
  const id = octx.getImageData(0, 0, w, h);
  const d = id.data;
  const shift = ((deg % 360) + 360) % 360 / 360;
  for (let i = 0; i < d.length; i += 4) {
    const [h_, s, l] = rgbToHsl(d[i], d[i+1], d[i+2]);
    const [r, g, b] = hslToRgb((h_ + shift) % 1, s, l);
    d[i] = r; d[i+1] = g; d[i+2] = b;
  }
  octx.putImageData(id, 0, 0);
  return out;
}

function applyPosterize(img, levels) {
  if (!levels || levels < 2) return img;
  const w = img.width, h = img.height;
  const out = makeCanvas(w, h);
  const octx = out.getContext('2d', { willReadFrequently: true });
  octx.drawImage(img, 0, 0);
  const id = octx.getImageData(0, 0, w, h);
  const d = id.data;
  const step = 255 / (levels - 1);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / step) * step;
    d[i+1] = Math.round(d[i+1] / step) * step;
    d[i+2] = Math.round(d[i+2] / step) * step;
  }
  octx.putImageData(id, 0, 0);
  return out;
}

function applyNoise(img, amount) {
  if (!amount) return img;
  const w = img.width, h = img.height;
  const out = makeCanvas(w, h);
  const octx = out.getContext('2d', { willReadFrequently: true });
  octx.drawImage(img, 0, 0);
  const id = octx.getImageData(0, 0, w, h);
  const d = id.data;
  const amp = amount;
  for (let i = 0; i < d.length; i += 4) {
    d[i]   = clamp(d[i]   + (Math.random() * 2 - 1) * amp, 0, 255);
    d[i+1] = clamp(d[i+1] + (Math.random() * 2 - 1) * amp, 0, 255);
    d[i+2] = clamp(d[i+2] + (Math.random() * 2 - 1) * amp, 0, 255);
  }
  octx.putImageData(id, 0, 0);
  return out;
}

function applyPixelate(img, block) {
  block = Math.floor(block);
  if (!block || block < 2) return img;
  const w = img.width, h = img.height;
  const out = makeCanvas(w, h);
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;

  const smallW = Math.max(1, Math.floor(w / block));
  const smallH = Math.max(1, Math.floor(h / block));

  // Draw to a tiny canvas then back up, no smoothing
  const tiny = makeCanvas(smallW, smallH);
  const tctx = tiny.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(img, 0, 0, smallW, smallH);

  octx.drawImage(tiny, 0, 0, smallW, smallH, 0, 0, w, h);
  return out;
}

function applyGlitch(img, intensity) {
  if (!intensity) return img;
  const w = img.width, h = img.height;
  const out = makeCanvas(w, h);
  const octx = out.getContext('2d');
  octx.drawImage(img, 0, 0);

  const stripes = Math.floor(intensity / 8) + 3; // more stripes as intensity increases
  for (let i = 0; i < stripes; i++) {
    const y = Math.floor(rand(0, h));
    const sliceH = Math.floor(rand(4, Math.min(40, h / 6)));
    const dx = Math.floor(rand(-30, 30) * (intensity / 100));
    const sx = 0, sw = w;
    octx.drawImage(out, sx, y, sw, sliceH, dx, y, sw, sliceH);

    if (Math.random() < 0.18) {
      const id = octx.getImageData(0, y, w, sliceH);
      const d = id.data;
      const shift = (Math.random() < 0.5 ? -1 : 1) * Math.floor(rand(1, 3));
      for (let p = 0; p < d.length - 4; p += 4) {
        const q = p + shift * 4;
        if (q >= 0 && q < d.length) d[p] = d[q];
      }
      octx.putImageData(id, 0, y);
    }
  }
  return out;
}

function applySwirl(img, amount) {
  if (!amount) return img;
  const w = img.width, h = img.height;
  const out = makeCanvas(w, h);
  const octx = out.getContext('2d', { willReadFrequently: true });

  const srcCtx = img.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, w, h);
  const src = srcData.data;

  const dstData = octx.createImageData(w, h);
  const dst = dstData.data;

  const cx = w / 2, cy = h / 2;
  const maxR = Math.sqrt(cx*cx + cy*cy);
  const k = (amount / 100) * 2.0; // swirl strength

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      const r = Math.sqrt(dx*dx + dy*dy);
      const t = Math.atan2(dy, dx);
      const t2 = t + k * (1 - r / maxR);
      const sx = Math.round(cx + Math.cos(t2) * r);
      const sy = Math.round(cy + Math.sin(t2) * r);

      let sr = 0, sg = 0, sb = 0, sa = 255;
      if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
        const si = (sy * w + sx) * 4;
        sr = src[si]; sg = src[si+1]; sb = src[si+2]; sa = src[si+3];
      }
      const di = (y * w + x) * 4;
      dst[di] = sr; dst[di+1] = sg; dst[di+2] = sb; dst[di+3] = sa;
    }
  }

  octx.putImageData(dstData, 0, 0);
  return out;
}

function applyKaleidoscope(img, segs) {
  segs = Math.floor(segs);
  if (!segs || segs < 2) return img;
  const w = img.width, h = img.height;
  const out = makeCanvas(w, h);
  const octx = out.getContext('2d', { willReadFrequently: true });

  const srcCtx = img.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, w, h);
  const src = srcData.data;

  const dstData = octx.createImageData(w, h);
  const dst = dstData.data;

  const cx = w / 2, cy = h / 2;
  const wedge = (Math.PI * 2) / segs;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      const r = Math.sqrt(dx*dx + dy*dy);
      let t = Math.atan2(dy, dx);
      t = ((t % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
      const m = t % wedge;
      const reflected = m > wedge / 2 ? wedge - m : m;
      const t2 = reflected;

      const sx = Math.round(cx + Math.cos(t2) * r);
      const sy = Math.round(cy + Math.sin(t2) * r);

      let sr = 0, sg = 0, sb = 0, sa = 255;
      if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
        const si = (sy * w + sx) * 4;
        sr = src[si]; sg = src[si+1]; sb = src[si+2]; sa = src[si+3];
      }
      const di = (y * w + x) * 4;
      dst[di] = sr; dst[di+1] = sg; dst[di+2] = sb; dst[di+3] = sa;
    }
  }

  octx.putImageData(dstData, 0, 0);
  return out;
}

function applyDither(img) {
  if (!state.dither) return img;
  const w = img.width, h = img.height;
  const out = makeCanvas(w, h);
  const octx = out.getContext('2d', { willReadFrequently: true });
  octx.drawImage(img, 0, 0);
  const id = octx.getImageData(0, 0, w, h);
  const d = id.data;

  const bayer = [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5]
  ];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const threshold = bayer[y & 3][x & 3] / 16;
      const l = (0.2126 * d[i] + 0.7152 * d[i+1] + 0.0722 * d[i+2]) / 255;
      const v = l + threshold - 0.5 > 0 ? 255 : 0;
      d[i] = v; d[i+1] = v; d[i+2] = v;
    }
  }
  octx.putImageData(id, 0, 0);
  return out;
}

// Stickers
const STICKER_URLS = {
  fire: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f525.svg',
  tears: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f62d.svg',
  boom: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/svg/1f4a5.svg',
};
function loadSticker(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
async function addSticker(url) {
  try {
    const img = await loadSticker(url);
    const w = img.width || 64, h = img.height || 64;
    const sticker = {
      img, w, h,
      x: canvas.width / 2,
      y: canvas.height / 2,
      scale: Math.min(canvas.width, canvas.height) / 4,
      rot: 0,
    };
    state.stickers.push(sticker);
    state.selectedSticker = state.stickers.length - 1;
    stickerScale.value = 100;
    stickerRot.value = 0;
    runPipeline();
  } catch (e) {
    console.warn('Failed to load sticker', e);
  }
}

// Pipeline
function runPipeline() {
  if (!state.src) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const base = state.src;

  let cur = base;
  cur = applyHueShift(cur, state.hue);
  cur = applyPosterize(cur, state.posterize);
  cur = applyNoise(cur, state.noise);
  cur = applyPixelate(cur, state.pixel);
  cur = applyGlitch(cur, state.glitch);
  cur = applySwirl(cur, state.swirl);
  cur = applyKaleidoscope(cur, state.kaleido);
  cur = applyDither(cur);

  state.work = cur;

  // Draw to main canvas
  canvas.width = cur.width;
  canvas.height = cur.height;
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(cur, 0, 0);

  // Stickers
  drawStickers();

  // Captions
  drawCaptions();
}

function measureTextBlock(text, size) {
  const family = 'Anton, Impact, "Arial Black", sans-serif';
  ctx.font = `${size}px ${family}`;
  const lines = (text || '').split('\n');
  let maxW = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(state.allCaps ? line.toUpperCase() : line);
    maxW = Math.max(maxW, metrics.width);
  }
  const lineHeight = size * 1.15;
  return { width: maxW, height: lines.length * lineHeight, lineHeight, lines };
}

function drawTextAt(text, x, y, size) {
  if (!text) return;
  const family = 'Anton, Impact, "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `${size}px ${family}`;
  ctx.lineJoin = 'round';

  const textToDraw = state.allCaps ? text.toUpperCase() : text;

  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.lineWidth = state.outline;
  ctx.strokeStyle = state.strokeColor;
  ctx.fillStyle = state.fillColor;

  const lines = textToDraw.split('\n');
  const lineHeight = size * 1.15;
  for (let i = 0; i < lines.length; i++) {
    const yy = y + i * lineHeight;
    ctx.strokeText(lines[i], x, yy);
    ctx.fillText(lines[i], x, yy);
  }

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function drawCaptions() {
  const w = canvas.width, h = canvas.height;
  const margin = Math.max(10, Math.round(h * 0.02));
  const size = state.fontSize;

  // init default positions
  if (!state.topPos) state.topPos = { x: w / 2, y: margin };
  const bottomBlock = measureTextBlock(state.bottom, size);
  if (!state.bottomPos) state.bottomPos = { x: w / 2, y: h - bottomBlock.height - margin };

  drawTextAt(state.top, state.topPos.x, state.topPos.y, size);
  drawTextAt(state.bottom, state.bottomPos.x, state.bottomPos.y, size);
}

// Stickers draw
function drawStickers() {
  for (const s of state.stickers) {
    if (!s.img) continue;
    const baseW = s.w;
    const baseH = s.h;
    const scale = s.scale / Math.max(baseW, baseH);
    const drawW = baseW * scale;
    const drawH = baseH * scale;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate((s.rot * Math.PI) / 180);
    ctx.drawImage(s.img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}

// Hit testing
function pointInSticker(s, x, y) {
  const baseW = s.w;
  const baseH = s.h;
  const scale = s.scale / Math.max(baseW, baseH);
  const drawW = baseW * scale;
  const drawH = baseH * scale;

  // inverse transform
  const dx = x - s.x;
  const dy = y - s.y;
  const r = (-s.rot * Math.PI) / 180;
  const ix = dx * Math.cos(r) - dy * Math.sin(r);
  const iy = dx * Math.sin(r) + dy * Math.cos(r);

  return ix >= -drawW/2 && ix <= drawW/2 && iy >= -drawH/2 && iy <= drawH/2;
}

function pointInTextBlockAt(text, size, x, y, bx, by) {
  const block = measureTextBlock(text, size);
  const left = bx - block.width / 2;
  const right = bx + block.width / 2;
  const top = by;
  const bottom = by + block.height;
  return x >= left && x <= right && y >= top && y <= bottom;
}

// Mouse interactions
let dragMode = null; // 'top' | 'bottom' | 'sticker'
let dragIndex = -1;
let dragDX = 0, dragDY = 0;

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  // Check stickers from topmost
  for (let i = state.stickers.length - 1; i >= 0; i--) {
    const s = state.stickers[i];
    if (pointInSticker(s, x, y)) {
      state.selectedSticker = i;
      dragMode = 'sticker';
      dragIndex = i;
      dragDX = x - s.x; dragDY = y - s.y;
      runPipeline();
      return;
    }
  }

  // Check bottom caption first (often nearer)
  if (pointInTextBlockAt(state.bottom, state.fontSize, x, y, state.bottomPos.x, state.bottomPos.y)) {
    dragMode = 'bottom';
    dragDX = x - state.bottomPos.x; dragDY = y - state.bottomPos.y;
    return;
  }

  if (pointInTextBlockAt(state.top, state.fontSize, x, y, state.topPos.x, state.topPos.y)) {
    dragMode = 'top';
    dragDX = x - state.topPos.x; dragDY = y - state.topPos.y;
    return;
  }

  // Deselect sticker if clicked elsewhere
  state.selectedSticker = -1;
  runPipeline();
});

canvas.addEventListener('mousemove', (e) => {
  if (!dragMode) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (dragMode === 'sticker' && dragIndex >= 0) {
    const s = state.stickers[dragIndex];
    s.x = x - dragDX;
    s.y = y - dragDY;
    runPipeline();
    return;
  }

  if (dragMode === 'bottom') {
    state.bottomPos.x = x - dragDX;
    state.bottomPos.y = y - dragDY;
    runPipeline();
    return;
  }
  if (dragMode === 'top') {
    state.topPos.x = x - dragDX;
    state.topPos.y = y - dragDY;
    runPipeline();
    return;
  }
});

window.addEventListener('mouseup', () => {
  dragMode = null;
  dragIndex = -1;
});

// Bind controls
function bindRange(input, key) {
  input.addEventListener('input', () => {
    let v = Number(input.value);
    state[key] = v;
    runPipeline();
  });
}
function bindCheckbox(input, key) {
  input.addEventListener('change', () => {
    state[key] = input.checked;
    runPipeline();
  });
}
function bindText(input, key) {
  input.addEventListener('input', () => {
    state[key] = input.value;
    runPipeline();
  });
}
function bindColor(input, key) {
  input.addEventListener('input', () => {
    state[key] = input.value;
    runPipeline();
  });
}

bindText(textTopInput, 'top');
bindText(textBottomInput, 'bottom');
bindRange(fontSizeInput, 'fontSize');
bindRange(outlineInput, 'outline');
bindColor(fillColorInput, 'fillColor');
bindColor(strokeColorInput, 'strokeColor');
bindCheckbox(allCapsInput, 'allCaps');

bindRange(fxHue, 'hue');
bindRange(fxNoise, 'noise');
bindRange(fxPixel, 'pixel');
bindRange(fxPost, 'posterize');
bindRange(fxSwirl, 'swirl');
bindRange(fxKaleido, 'kaleido');
bindRange(fxGlitch, 'glitch');
bindCheckbox(fxDither, 'dither');

// Chaos presets
const PRESETS = {
  vaporwave: () => {
    state.hue = 300;
    state.posterize = 6;
    state.pixel = 0;
    state.glitch = 60;
    state.swirl = 20;
    state.kaleido = 0;
    state.noise = 10;
    state.dither = false;
  },
  noir: () => {
    state.hue = 0;
    state.posterize = 0;
    state.pixel = 0;
    state.glitch = 0;
    state.swirl = 0;
    state.kaleido = 0;
    state.noise = 0;
    state.dither = true;
  },
  pop: () => {
    state.hue = 40;
    state.posterize = 5;
    state.pixel = 0;
    state.glitch = 10;
    state.swirl = 0;
    state.kaleido = 0;
    state.noise = 5;
    state.dither = false;
  },
  pixel: () => {
    state.hue = 180;
    state.posterize = 4;
    state.pixel = 14;
    state.glitch = 25;
    state.swirl = 0;
    state.kaleido = 0;
    state.noise = 8;
    state.dither = false;
  }
};
presetSelect.addEventListener('change', () => {
  const v = presetSelect.value;
  if (PRESETS[v]) {
    PRESETS[v]();
    fxHue.value = state.hue;
    fxNoise.value = state.noise;
    fxPixel.value = state.pixel;
    fxPost.value = state.posterize;
    fxSwirl.value = state.swirl;
    fxKaleido.value = state.kaleido;
    fxGlitch.value = state.glitch;
    fxDither.checked = state.dither;
    runPipeline();
  }
});

// Chaos button — randomize with optional seed lock
btnChaos.addEventListener('click', () => {
  if (chaosLockInput.checked) {
    const seed = Number(chaosSeedInput.value) || Math.floor(Math.random() * 1e6);
    state.chaosSeed = seed;
    seededRand = mulberry32(seed);
  } else {
    seededRand = null;
  }

  state.hue = Math.floor(rand(0, 360));
  state.noise = Math.floor(rand(0, 80));
  state.pixel = (state.chaosLock ? rand(0, 1) : Math.random()) < 0.6 ? Math.floor(rand(3, 18)) : 0;
  state.posterize = (state.chaosLock ? rand(0, 1) : Math.random()) < 0.7 ? Math.floor(rand(3, 9)) : 0;
  state.swirl = (state.chaosLock ? rand(0, 1) : Math.random()) < 0.5 ? Math.floor(rand(10, 70)) : 0;
  state.kaleido = (state.chaosLock ? rand(0, 1) : Math.random()) < 0.45 ? Math.floor(rand(4, 12)) : 0;
  state.glitch = Math.floor(rand(0, 90));
  state.dither = (state.chaosLock ? rand(0, 1) : Math.random()) < 0.25;

  state.fontSize = Math.floor(rand(42, 110));
  state.outline = Math.floor(rand(2, 12));

  fxHue.value = state.hue;
  fxNoise.value = state.noise;
  fxPixel.value = state.pixel;
  fxPost.value = state.posterize;
  fxSwirl.value = state.swirl;
  fxKaleido.value = state.kaleido;
  fxGlitch.value = state.glitch;
  fxDither.checked = state.dither;

  fontSizeInput.value = state.fontSize;
  outlineInput.value = state.outline;

  runPipeline();
});

// Chaos lock toggle
chaosLockInput.addEventListener('change', () => {
  state.chaosLock = chaosLockInput.checked;
});

// Reset
btnReset.addEventListener('click', () => {
  state.top = '';
  state.bottom = '';
  state.fontSize = 64;
  state.outline = 6;
  state.fillColor = '#ffffff';
  state.strokeColor = '#000000';
  state.allCaps = true;
  state.topPos = null;
  state.bottomPos = null;

  state.hue = 0;
  state.noise = 0;
  state.pixel = 0;
  state.posterize = 0;
  state.swirl = 0;
  state.kaleido = 0;
  state.glitch = 0;
  state.dither = false;

  state.stickers = [];
  state.selectedSticker = -1;

  textTopInput.value = '';
  textBottomInput.value = '';
  fontSizeInput.value = 64;
  outlineInput.value = 6;
  fillColorInput.value = '#ffffff';
  strokeColorInput.value = '#000000';
  allCapsInput.checked = true;

  fxHue.value = 0; fxNoise.value = 0; fxPixel.value = 0; fxPost.value = 0;
  fxSwirl.value = 0; fxKaleido.value = 0; fxGlitch.value = 0; fxDither.checked = false;

  runPipeline();
});

// Download
btnDownload.addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'chaos-meme.png';
  a.click();
});

// Stickers UI
addSticker1.addEventListener('click', () => addSticker(STICKER_URLS.fire));
addSticker2.addEventListener('click', () => addSticker(STICKER_URLS.tears));
addSticker3.addEventListener('click', () => addSticker(STICKER_URLS.boom));

stickerScale.addEventListener('input', () => {
  if (state.selectedSticker >= 0) {
    const s = state.stickers[state.selectedSticker];
    // scale represented as percentage of base size
    s.scale = (Number(stickerScale.value) / 100) * Math.min(canvas.width, canvas.height) / 2;
    runPipeline();
  }
});
stickerRot.addEventListener('input', () => {
  if (state.selectedSticker >= 0) {
    const s = state.stickers[state.selectedSticker];
    s.rot = Number(stickerRot.value);
    runPipeline();
  }
});
stickerRemove.addEventListener('click', () => {
  if (state.selectedSticker >= 0) {
    state.stickers.splice(state.selectedSticker, 1);
    state.selectedSticker = -1;
    runPipeline();
  }
});

// Image loading
function setImage(img) {
  const ratio = img.width / img.height;
  let w = img.width, h = img.height;
  if (Math.max(w, h) > MAX_DIM) {
    if (w > h) {
      w = MAX_DIM;
      h = Math.round(w / ratio);
    } else {
      h = MAX_DIM;
      w = Math.round(h * ratio);
    }
  }

  const src = makeCanvas(w, h);
  const sctx = src.getContext('2d');
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(img, 0, 0, w, h);

  state.src = src;
  state.w = w;
  state.h = h;
  state.topPos = { x: w / 2, y: Math.max(10, Math.round(h * 0.02)) };
  const bottomBlock = measureTextBlock(state.bottom, state.fontSize);
  state.bottomPos = { x: w / 2, y: h - bottomBlock.height - Math.max(10, Math.round(h * 0.02)) };

  runPipeline();
}

async function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Drag & drop
function handleFiles(files) {
  if (!files || !files[0]) return;
  const file = files[0];
  if (!file.type.startsWith('image/')) return;
  readFile(file).then(setImage);
}

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.style.borderColor = 'rgba(255,255,255,0.35)';
});
dropzone.addEventListener('dragleave', () => {
  dropzone.style.borderColor = 'rgba(255,255,255,0.18)';
});
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  handleFiles(e.dataTransfer.files);
  dropzone.style.borderColor = 'rgba(255,255,255,0.18)';
});
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') fileInput.click();
});
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

// Paste support
window.addEventListener('paste', (e) => {
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (const it of items) {
    if (it.type && it.type.startsWith('image/')) {
      const file = it.getAsFile();
      if (file) handleFiles([file]);
      break;
    }
  }
});

// Initial canvas
(function init() {
  canvas.width = 800;
  canvas.height = 600;
  ctx.fillStyle = '#0e141c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#b6c1d1';
  ctx.font = '16px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Drop an image here or click "Image" ➜ upload. Then add captions, stickers and press Chaos.', canvas.width/2, canvas.height/2 - 8);
})();