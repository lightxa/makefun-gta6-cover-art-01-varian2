// Leonida Nights shared state: layouts, colour grades and banner styles.
// Layouts and grades are deliberately different from the Vice Coast variant:
// film-strip, diagonal split, triptych and postcard stack; Midnight Drive,
// Bayside Haze, Sunset Boulevard and Neon Alley.

export const LAYOUTS = [
  { id: "filmstrip", name: "Film Strip", blurb: "Tall hero frame left, three small frames stacked right, sprocket holes down the spine." },
  { id: "diagonal", name: "Diagonal Split", blurb: "Two big diagonal panels sliced across the cover, caption riding the cut." },
  { id: "triptych", name: "Triptych", blurb: "Three tall vertical panels side by side, like a folding poster." },
  { id: "postcard", name: "Postcard Stack", blurb: "One big photo with two smaller postcards tilted on top, taped corners." },
];

export const GRADES = [
  { id: "midnight", name: "Midnight Drive", dark: "#12082e", mid: "#3b1d6e", light: "#8f6bff", accent: "#ff5e8a", sky: ["#0b0620", "#2a135c", "#7a3cff"], swatch: "#7a3cff" },
  { id: "bayside", name: "Bayside Haze", dark: "#062a2a", mid: "#0f5f5c", light: "#7fe0c3", accent: "#ffd166", sky: ["#04201f", "#0d4f4a", "#3fbfa8"], swatch: "#3fbfa8" },
  { id: "boulevard", name: "Sunset Boulevard", dark: "#2b0a1e", mid: "#8a1e4d", light: "#ff9e57", accent: "#ffe066", sky: ["#1c0716", "#7a1746", "#ff7a3d"], swatch: "#ff7a3d" },
  { id: "alley", name: "Neon Alley", dark: "#160a2e", mid: "#5c1160", light: "#2dd4d4", accent: "#ff4fd8", sky: ["#120826", "#4a0f57", "#ff2ea6"], swatch: "#ff2ea6" },
];

export const BANNERS = [
  { id: "outline", name: "Outline letters" },
  { id: "shadow", name: "Hard shadow" },
  { id: "ribbon", name: "Ribbon banner" },
];

export const SIZES = [
  { id: "1080x1080", w: 1080, h: 1080, label: "1080 × 1080" },
  { id: "1080x1350", w: 1080, h: 1350, label: "1080 × 1350" },
  { id: "1920x1080", w: 1920, h: 1080, label: "1920 × 1080" },
];

export function defaultState() {
  return {
    layout: "filmstrip",
    grade: "midnight",
    banner: "outline",
    title: "LEONIDA NIGHTS",
    subtitle: "one night, one story",
    fillMode: "each",
    size: "1080x1080",
    halftone: true,
    grain: true,
    stickers: true,
    vignette: true,
    photos: [], // {img, name}
    crops: {}, // panel index -> {zoom, panX, panY}
    selectedPanel: 0,
  };
}

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

// Panel rectangles for a layout, as fractions of the cover (x, y, w, h).
// Panel count differs per layout: filmstrip 4, diagonal 2, triptych 3, postcard 3.
export function panelRects(layoutId, w, h) {
  if (layoutId === "diagonal") {
    return [
      { x: 0, y: 0, w, h: h * 0.62 },
      { x: 0, y: h * 0.38, w, h: h * 0.62, slant: h * 0.10 },
    ];
  }
  if (layoutId === "triptych") {
    const pw = w / 3;
    return [0, 1, 2].map((i) => ({ x: i * pw, y: 0, w: pw, h }));
  }
  if (layoutId === "postcard") {
    return [
      { x: 0, y: 0, w, h },
      { x: w * 0.08, y: h * 0.55, w: w * 0.42, h: h * 0.34, tilt: -0.06 },
      { x: w * 0.52, y: h * 0.60, w: w * 0.42, h: h * 0.34, tilt: 0.05 },
    ];
  }
  // filmstrip
  return [
    { x: 0, y: 0, w: w * 0.62, h },
    { x: w * 0.66, y: 0, w: w * 0.34, h: h / 3 },
    { x: w * 0.66, y: h / 3, w: w * 0.34, h: h / 3 },
    { x: w * 0.66, y: (2 * h) / 3, w: w * 0.34, h: h / 3 },
  ];
}

export function panelCount(layoutId) {
  return panelRects(layoutId, 100, 100).length;
}

// Which photo index fills a panel, given the fill mode and photo count.
export function photoForPanel(state, panelIndex) {
  const n = state.photos.length;
  if (n === 0) return -1;
  if (state.fillMode === "one") return 0;
  return panelIndex % n;
}
