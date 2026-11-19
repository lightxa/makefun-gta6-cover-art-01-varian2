// Leonida Nights editor wiring: photo slots, panel picking and cropping,
// caption/layout/grade controls, live preview and PNG export.

import { LAYOUTS, GRADES, BANNERS, SIZES, defaultState, panelRects, panelCount, gradeById } from "./state.js";
import { renderCover } from "./cover.js";

const state = defaultState();
const $ = (id) => document.getElementById(id);
const preview = $("preview");
const pctx = preview.getContext("2d");

function currentSize() {
  return SIZES.find((s) => s.id === state.size) || SIZES[0];
}

export function redraw() {
  const size = currentSize();
  preview.width = size.w;
  preview.height = size.h;
  const cover = renderCover(state, size.w, size.h);
  pctx.clearRect(0, 0, size.w, size.h);
  pctx.drawImage(cover, 0, 0);
  // Highlight the selected panel on the preview.
  const rects = panelRects(state.layout, size.w, size.h);
  const r = rects[state.selectedPanel];
  if (r && state.photos.length > 0) {
    pctx.save();
    pctx.strokeStyle = "#ffc44d";
    pctx.lineWidth = Math.max(4, size.w * 0.006);
    pctx.setLineDash([18, 12]);
    pctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
    pctx.restore();
  }
  const crop = state.crops[state.selectedPanel] || { zoom: 1, panX: 0, panY: 0 };
  $("zoomSlider").value = crop.zoom;
  $("panXSlider").value = crop.panX;
  $("panYSlider").value = crop.panY;
  $("selectedPanelLabel").textContent =
    state.photos.length === 0 ? "none yet" : `panel ${state.selectedPanel + 1} of ${panelCount(state.layout)}`;
}

function setStatus(text) {
  $("status").textContent = text;
}

function renderSlots() {
  const box = $("photoSlots");
  box.innerHTML = "";
  state.photos.forEach((photo, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot" + (i === 0 && state.fillMode === "one" ? " active" : "");
    btn.title = photo.name;
    const img = document.createElement("img");
    img.src = photo.img.src;
    img.alt = photo.name;
    btn.appendChild(img);
    const x = document.createElement("span");
    x.className = "remove";
    x.textContent = "×";
    x.addEventListener("click", (e) => {
      e.stopPropagation();
      state.photos.splice(i, 1);
      renderSlots();
      redraw();
    });
    btn.appendChild(x);
    btn.addEventListener("click", () => {
      state.fillMode = "one";
      $("fillMode").value = "one";
      renderSlots();
      redraw();
    });
    box.appendChild(btn);
  });
  for (let i = state.photos.length; i < 3; i++) {
    const empty = document.createElement("div");
    empty.className = "slot";
    empty.textContent = "+";
    empty.style.display = "grid";
    empty.style.placeItems = "center";
    empty.style.color = "#b8b0a6";
    empty.style.fontSize = "28px";
    box.appendChild(empty);
  }
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, name: file.name });
    img.onerror = () => reject(new Error("Could not read " + file.name));
    img.src = url;
  });
}

async function loadSample(path, name) {
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error("Sample failed to load"));
    img.src = path;
  });
  state.photos = [{ img, name }];
  renderSlots();
  redraw();
  setStatus("Sample photo loaded — pick a layout and export.");
}

function buildChoices(row, items, current, onPick, swatchKey) {
  row.innerHTML = "";
  items.forEach((item) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "choice" + (item.id === current ? " active" : "");
    if (swatchKey) {
      const s = document.createElement("span");
      s.className = "swatch";
      s.style.background = item[swatchKey];
      b.appendChild(s);
    }
    b.appendChild(document.createTextNode(item.name));
    b.addEventListener("click", () => {
      onPick(item.id);
      buildChoices(row, items, item.id, onPick, swatchKey);
      redraw();
    });
    row.appendChild(b);
  });
}

function refreshChoices() {
  buildChoices($("layoutRow"), LAYOUTS, state.layout, (id) => { state.layout = id; state.selectedPanel = 0; });
  buildChoices($("gradeRow"), GRADES, state.grade, (id) => { state.grade = id; }, "swatch");
}

function exportPng(size) {
  const cover = renderCover(state, size.w, size.h);
  const a = document.createElement("a");
  a.download = `leonida-nights-${size.id}.png`;
  a.href = cover.toDataURL("image/png");
  a.click();
  setStatus(`Exported ${size.label} PNG — check your downloads.`);
}

function surprise() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layout = pick(LAYOUTS).id;
  state.grade = pick(GRADES).id;
  state.banner = pick(BANNERS).id;
  refreshChoices();
  $("bannerSelect").value = state.banner;
  redraw();
  setStatus("Surprise! A fresh layout, grade and banner — export it if you like it.");
}

function init() {
  refreshChoices();
  document.querySelectorAll(".size-btn").forEach((b) => {
    b.addEventListener("click", () => {
      state.size = b.dataset.size;
      document.querySelectorAll(".size-btn").forEach((x) => x.classList.toggle("active", x === b));
      redraw();
    });
  });
  $("photoInput").addEventListener("change", async (e) => {
    const files = [...e.target.files].slice(0, 3 - state.photos.length);
    for (const file of files) {
      try {
        state.photos.push(await loadImageFile(file));
      } catch (err) {
        setStatus(err.message);
      }
    }
    renderSlots();
    redraw();
    if (state.photos.length > 0) setStatus(`${state.photos.length} photo(s) loaded — click a panel to crop it.`);
  });
  $("sample1Btn").addEventListener("click", () => loadSample("samples/boulevard.jpg", "Boulevard"));
  $("sample2Btn").addEventListener("click", () => loadSample("samples/pier.jpg", "Pier"));
  $("fillMode").addEventListener("change", (e) => { state.fillMode = e.target.value; renderSlots(); redraw(); });
  $("titleInput").addEventListener("input", (e) => { state.title = e.target.value; redraw(); });
  $("subtitleInput").addEventListener("input", (e) => { state.subtitle = e.target.value; redraw(); });
  $("bannerSelect").addEventListener("change", (e) => { state.banner = e.target.value; redraw(); });
  $("halftoneToggle").addEventListener("change", (e) => { state.halftone = e.target.checked; redraw(); });
  $("grainToggle").addEventListener("change", (e) => { state.grain = e.target.checked; redraw(); });
  $("stickerToggle").addEventListener("change", (e) => { state.stickers = e.target.checked; redraw(); });
  $("vignetteToggle").addEventListener("change", (e) => { state.vignette = e.target.checked; redraw(); });
  const cropChanged = () => {
    const crop = state.crops[state.selectedPanel] || { zoom: 1, panX: 0, panY: 0 };
    crop.zoom = parseFloat($("zoomSlider").value);
    crop.panX = parseFloat($("panXSlider").value);
    crop.panY = parseFloat($("panYSlider").value);
    state.crops[state.selectedPanel] = crop;
    redraw();
  };
  $("zoomSlider").addEventListener("input", cropChanged);
  $("panXSlider").addEventListener("input", cropChanged);
  $("panYSlider").addEventListener("input", cropChanged);
  preview.addEventListener("click", (e) => {
    const rect = preview.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * preview.width;
    const y = (e.clientY - rect.top) / rect.height * preview.height;
    const rects = panelRects(state.layout, preview.width, preview.height);
    const idx = rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    if (idx >= 0) { state.selectedPanel = idx; redraw(); }
  });
  let dragging = false, lastX = 0, lastY = 0;
  preview.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; preview.setPointerCapture(e.pointerId); });
  preview.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const rect = preview.getBoundingClientRect();
    const crop = state.crops[state.selectedPanel] || { zoom: 1, panX: 0, panY: 0 };
    crop.panX += (e.clientX - lastX) / rect.width;
    crop.panY += (e.clientY - lastY) / rect.height;
    crop.panX = Math.max(-0.5, Math.min(0.5, crop.panX));
    crop.panY = Math.max(-0.5, Math.min(0.5, crop.panY));
    state.crops[state.selectedPanel] = crop;
    lastX = e.clientX; lastY = e.clientY;
    redraw();
  });
  preview.addEventListener("pointerup", () => { dragging = false; });
  preview.addEventListener("wheel", (e) => {
    e.preventDefault();
    const crop = state.crops[state.selectedPanel] || { zoom: 1, panX: 0, panY: 0 };
    crop.zoom = Math.max(1, Math.min(3, crop.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    state.crops[state.selectedPanel] = crop;
    redraw();
  }, { passive: false });
  $("exportBtn").addEventListener("click", () => exportPng(currentSize()));
  $("exportAllBtn").addEventListener("click", () => {
    SIZES.forEach((s, i) => setTimeout(() => exportPng(s), i * 350));
  });
  $("surpriseBtn").addEventListener("click", surprise);
  renderSlots();
  redraw();
  // Screenshot scenes (?shot=cover / editor / portrait / cover2) run after
  // the editor is up, through the app's own state and renderer.
  window.__leonida = { state, redraw, renderSlots, refreshChoices };
  if (new URLSearchParams(location.search).has("shot")) {
    import("./shots.js").then((m) => m.runShot(window.__leonida)).catch((e) => setStatus("Shot failed: " + e.message));
  }
}

init();
