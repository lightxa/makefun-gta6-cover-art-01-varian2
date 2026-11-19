// Leonida Nights cover renderer: draws the poster on a 2D canvas.
// Duotone photo treatment, halftone dots, print grain, vignette, sun and
// palm silhouettes drawn in code, and Archivo Black / Caveat lettering.
// No game logos, artwork or fonts anywhere in the output.

import { gradeById, panelRects, photoForPanel } from "./state.js";

// Deterministic pseudo-random from an integer seed (no Math.random in output).
export function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Map a pixel's brightness onto the grade's dark -> mid -> light ramp.
export function duotonePixel(r, g, b, grade) {
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const dark = hexRgb(grade.dark), mid = hexRgb(grade.mid), light = hexRgb(grade.light);
  const c = lum < 0.5 ? mix(dark, mid, lum * 2) : mix(mid, light, (lum - 0.5) * 2);
  return c;
}

// Draw one photo into a panel rect with crop (zoom/pan), duotone grade and
// a halftone dot overlay in the shadows.
export function drawPhotoPanel(ctx, img, rect, crop, grade, halftone, w, h) {
  ctx.save();
  ctx.beginPath();
  if (rect.slant) {
    // Diagonal cut: the top edge slopes from lower-left to top-right.
    ctx.moveTo(rect.x, rect.y + rect.slant);
    ctx.lineTo(rect.x + rect.w, rect.y);
    ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
    ctx.lineTo(rect.x, rect.y + rect.h);
    ctx.closePath();
  } else if (rect.tilt) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate(rect.tilt);
    ctx.rect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  } else {
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.clip();
  const ox = rect.tilt ? -rect.w / 2 : rect.x;
  const oy = rect.tilt ? -rect.h / 2 : rect.y;
  if (img) {
    const zoom = crop.zoom || 1;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
    const dw = iw * scale, dh = ih * scale;
    const dx = ox + (rect.w - dw) / 2 + (crop.panX || 0) * rect.w;
    const dy = oy + (rect.h - dh) / 2 + (crop.panY || 0) * rect.h;
    ctx.drawImage(img, dx, dy, dw, dh);
    // Duotone: read the panel back, remap, write back. Only for unrotated
    // panels, where the panel's canvas coordinates are the clip's own;
    // tilted panels get a translucent grade tint instead.
    if (!rect.tilt) {
      try {
        const data = ctx.getImageData(ox, oy, Math.ceil(rect.w), Math.ceil(rect.h));
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          const c = duotonePixel(px[i], px[i + 1], px[i + 2], grade);
          px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
        }
        ctx.putImageData(data, ox, oy);
      } catch (e) { /* tainted canvas: leave the photo ungraded */ }
    } else {
      ctx.fillStyle = grade.mid;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(ox, oy, rect.w, rect.h);
      ctx.globalAlpha = 1;
    }
  } else {
    // Empty panel: painted sky gradient with a drawn sun and palm silhouettes.
    const g = ctx.createLinearGradient(ox, oy, ox, oy + rect.h);
    grade.sky.forEach((c, i) => g.addColorStop(i / (grade.sky.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(ox, oy, rect.w, rect.h);
    drawSun(ctx, ox + rect.w * 0.5, oy + rect.h * 0.42, Math.min(rect.w, rect.h) * 0.22, grade.accent, grade.dark);
    drawPalm(ctx, ox + rect.w * 0.12, oy + rect.h, Math.min(rect.w, rect.h) * 0.34, grade.dark);
    drawPalm(ctx, ox + rect.w * 0.9, oy + rect.h, Math.min(rect.w, rect.h) * 0.28, grade.dark);
  }
  if (halftone) drawHalftone(ctx, ox, oy, rect.w, rect.h, grade.dark);
  ctx.restore();
  // White keyline around every panel, comic-print style; a slanted panel
  // gets its diagonal edge stroked instead of a rectangle.
  ctx.save();
  ctx.strokeStyle = "#f4efe6";
  ctx.lineWidth = Math.max(3, w * 0.004);
  if (rect.slant) {
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y + rect.slant);
    ctx.lineTo(rect.x + rect.w, rect.y);
    ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
    ctx.lineTo(rect.x, rect.y + rect.h);
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.strokeRect(rect.x + ctx.lineWidth / 2, rect.y + ctx.lineWidth / 2, rect.w - ctx.lineWidth, rect.h - ctx.lineWidth);
  }
  ctx.restore();
}

export function drawSun(ctx, cx, cy, r, color, dark) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // Slats cut across the lower half, like a setting sun print. They are
  // painted in the grade's dark colour, never erased, so the sky stays.
  ctx.fillStyle = dark || "#14101c";
  for (let i = 1; i <= 3; i++) {
    const y = cy + (r * i) / 4;
    ctx.fillRect(cx - r, y, r * 2, r * 0.09);
  }
  ctx.restore();
}

export function drawPalm(ctx, x, baseY, size, color) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(3, size * 0.05);
  ctx.beginPath(); ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + size * 0.12, baseY - size * 0.6, x + size * 0.05, baseY - size);
  ctx.stroke();
  const topX = x + size * 0.05, topY = baseY - size;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * (0.15 + i * 0.14);
    const ex = topX + Math.cos(a) * size * 0.55;
    const ey = topY + Math.sin(a) * size * 0.32 + size * 0.12;
    ctx.beginPath(); ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + (ex - topX) * 0.5, topY - size * 0.18, ex, ey);
    ctx.lineWidth = Math.max(2, size * 0.035); ctx.stroke();
  }
  ctx.restore();
}

export function drawHalftone(ctx, x, y, w, h, color) {
  const step = Math.max(9, w * 0.014);
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.16;
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      const r = step * 0.16 * (0.6 + 0.4 * Math.sin((xx + yy) * 0.05));
      ctx.beginPath(); ctx.arc(xx, yy, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

export function drawGrain(ctx, w, h, seed) {
  const rand = seededRand(seed);
  ctx.save();
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < w * h / 900; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(rand() * w, rand() * h, 1.6, 1.6);
  }
  ctx.restore();
}

export function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawStarburst(ctx, cx, cy, r, color, label) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.78;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#14101c";
  ctx.font = `bold ${Math.round(r * 0.34)}px "Archivo Black", sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy - r * 0.12);
  ctx.font = `${Math.round(r * 0.24)}px Caveat, cursive`;
  ctx.fillText("est. 2026", cx, cy + r * 0.28);
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startPx, family, weight) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 12 && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

export function drawTitle(ctx, state, grade, w, h) {
  const title = (state.title || "LEONIDA").toUpperCase();
  const sub = state.subtitle || "";
  const bandH = h * 0.20;
  const bandY = h - bandH;
  ctx.save();
  if (state.banner === "ribbon") {
    ctx.fillStyle = grade.accent;
    ctx.beginPath();
    ctx.moveTo(0, bandY + bandH * 0.12); ctx.lineTo(w, bandY);
    ctx.lineTo(w, bandY + bandH * 0.88); ctx.lineTo(0, bandY + bandH);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#14101c";
  }
  const maxW = w * 0.92;
  const px = fitFont(ctx, title, maxW, Math.round(w * 0.078), '"Archivo Black", sans-serif', "");
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const cx = w / 2, cy = bandY + bandH * 0.36;
  if (state.banner === "outline") {
    ctx.lineWidth = Math.max(2, px * 0.09);
    ctx.strokeStyle = grade.accent;
    ctx.strokeText(title, cx, cy);
    ctx.fillStyle = "#f4efe6";
    ctx.fillText(title, cx, cy);
  } else if (state.banner === "shadow") {
    ctx.fillStyle = grade.accent;
    ctx.fillText(title, cx + px * 0.06, cy + px * 0.07);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title, cx, cy);
  } else {
    ctx.fillText(title, cx, cy);
  }
  if (sub) {
    const spx = fitFont(ctx, sub, maxW, Math.round(w * 0.032), "Caveat, cursive", "bold");
    ctx.fillStyle = state.banner === "ribbon" ? "#14101c" : grade.light;
    ctx.fillText(sub, cx, bandY + bandH * 0.80);
  }
  ctx.restore();
}

// Full cover render. Returns the canvas. Deterministic for a given state.
export function renderCover(state, w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  const grade = gradeById(state.grade);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  rects.forEach((rect, i) => {
    const photoIndex = photoForPanel(state, i);
    const img = photoIndex >= 0 ? state.photos[photoIndex].img : null;
    const crop = state.crops[i] || { zoom: 1, panX: 0, panY: 0 };
    drawPhotoPanel(ctx, img, rect, crop, grade, state.halftone, w, h);
  });
  // Film-strip sprocket holes down the spine.
  if (state.layout === "filmstrip") {
    ctx.save();
    ctx.fillStyle = "#f4efe6";
    const sx = w * 0.62, sw = w * 0.04;
    for (let y = h * 0.03; y < h * 0.97; y += h * 0.055) {
      ctx.fillRect(sx + sw * 0.2, y, sw * 0.6, h * 0.028);
    }
    ctx.restore();
  }
  if (state.stickers) {
    drawStarburst(ctx, w * 0.86, h * 0.16, Math.min(w, h) * 0.085, grade.accent, "LEONIDA");
    drawPalm(ctx, w * 0.03, h * 0.86, Math.min(w, h) * 0.16, grade.dark);
  }
  drawTitle(ctx, state, grade, w, h);
  if (state.grain) drawGrain(ctx, w, h, 20261119);
  if (state.vignette) drawVignette(ctx, w, h);
  return canvas;
}
