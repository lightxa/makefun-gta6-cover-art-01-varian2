// Deterministic screenshot scenes for Leonida Nights (?shot=cover,
// ?shot=editor, ?shot=portrait, ?shot=cover2). Loaded only when the page
// URL carries ?shot=..., by main.js. Every scene uses the app's own sample
// photos (made for make.fun with an image model, free to use) and the
// app's own renderer, so each screenshot is a real render of this app.

import { defaultState } from "./state.js";
import { renderCover } from "./cover.js";

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("sample failed: " + path));
    img.src = path;
  });
}

async function sampleState(overrides) {
  const state = defaultState();
  Object.assign(state, overrides);
  const img = await loadImage("samples/boulevard.jpg");
  state.photos = [{ img, name: "Boulevard" }];
  return state;
}

function showCoverCanvas(canvas) {
  document.body.innerHTML = "";
  document.body.style.margin = "0";
  document.body.style.background = "#0c0912";
  canvas.style.display = "block";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.objectFit = "contain";
  document.body.appendChild(canvas);
  document.title = "Leonida Nights cover";
}

export async function runShot(api) {
  const params = new URLSearchParams(location.search);
  const shot = params.get("shot") || "editor";
  await document.fonts.ready;
  if (shot === "cover") {
    const state = await sampleState({ layout: "filmstrip", grade: "midnight", banner: "outline", title: "LEONIDA NIGHTS", subtitle: "one night, one story" });
    showCoverCanvas(renderCover(state, 1920, 1080));
  } else if (shot === "portrait") {
    const state = await sampleState({ layout: "triptych", grade: "bayside", banner: "shadow", title: "BAYSIDE DAZE", subtitle: "salt air, neon lights" });
    showCoverCanvas(renderCover(state, 1080, 1350));
  } else if (shot === "cover2") {
    const state = await sampleState({ layout: "diagonal", grade: "boulevard", banner: "ribbon", title: "SUNSET BOULEVARD", subtitle: "drive until the sky burns" });
    showCoverCanvas(renderCover(state, 1920, 1080));
  } else {
    // editor: the real editor, with a photo loaded and a panel selected.
    const img = await loadImage("samples/boulevard.jpg");
    api.state.photos = [{ img, name: "Boulevard" }];
    api.state.layout = "diagonal";
    api.state.grade = "boulevard";
    api.state.banner = "ribbon";
    api.state.title = "SUNSET BOULEVARD";
    api.state.subtitle = "drive until the sky burns";
    api.state.selectedPanel = 0;
    api.refreshChoices();
    api.renderSlots();
    api.redraw();
    document.getElementById("bannerSelect").value = "ribbon";
    document.getElementById("titleInput").value = "SUNSET BOULEVARD";
    document.getElementById("subtitleInput").value = "drive until the sky burns";
    document.getElementById("status").textContent = "Sample photo loaded — pick a layout and export.";
  }
  document.body.dataset.shotReady = "true";
}
