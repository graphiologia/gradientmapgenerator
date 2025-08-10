\
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Copy, Sparkles, Wand2, Stars } from "lucide-react";

// ---------------------------------------------
// Flavor Gradient Generator — Web App Version
// - Linear & Smear gradients
// - Fractal overlay pattern (fbm-like)
// - Flavor prompts → colors (known map + hashed fallback)
// - Copy CSS + Download PNG
// ---------------------------------------------

// Known flavor → color map (extend as you like)
const FLAVOR_MAP = {
  strawberry: "#ff4f79",
  raspberry: "#d72657",
  cherry: "#d81b60",
  watermelon: "#ff6b81",
  apple: "#5ec16e",
  lime: "#7bd389",
  mint: "#27c3a8",
  matcha: "#7bb661",
  avocado: "#66a564",
  banana: "#ffe066",
  mango: "#ffb703",
  peach: "#ff9e7d",
  orange: "#ff7a00",
  carrot: "#ff8c42",
  lemon: "#ffd166",
  pineapple: "#ffe66d",
  blueberry: "#4f7cff",
  grape: "#7b5cff",
  ube: "#6d4aff",
  taro: "#a08bff",
  lavender: "#b497ff",
  vanilla: "#f4e1c1",
  caramel: "#c68642",
  butterscotch: "#e0a55f",
  chocolate: "#5c3a21",
  mocha: "#7a5230",
  coffee: "#5a3c2e",
  espresso: "#3b2a23",
  milk: "#fff7f0",
  coconut: "#fef9ef",
  bubblegum: "#ff84d8",
  cottoncandy: "#ffa6ff",
  cookiesandcream: "#e8e8ea",
  peppermint: "#82f3d3",
  wintermint: "#9ef7e8",
  milktea: "#c7a17a",
  calamansi: "#c1ff72",
  bukopandan: "#9be077",
  lychee: "#ffd4da",
  dragonfruit: "#ff2d95",
  passionfruit: "#ffb000",
  kiwi: "#89d42d",
};

function normKey(s) { return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim(); }
function hashHue(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h % 360; }
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
function flavorToColor(name) {
  const key = normKey(name);
  if (FLAVOR_MAP[key]) return FLAVOR_MAP[key];
  const hue = hashHue(key || "flavor");
  return hslToHex(hue, 68, 68); // pastel-ish fallback
}

// ---------- Simple value noise + fbm for fractal overlay ----------
function makeNoise(seed) {
  const r = n => { const x = Math.sin(n * 127.1 + seed * 13.7) * 43758.5453; return x - Math.floor(x); };
  const SIZE = 256;
  const grid = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) grid[y * SIZE + x] = r(x * 12.9898 + y * 78.233);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  return (x, y) => {
    x = (x % SIZE + SIZE) % SIZE; y = (y % SIZE + SIZE) % SIZE;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = (x0 + 1) % SIZE, y1 = (y0 + 1) % SIZE;
    const fx = smooth(x - x0), fy = smooth(y - y0);
    const v00 = grid[y0 * SIZE + x0], v10 = grid[y0 * SIZE + x1];
    const v01 = grid[y1 * SIZE + x0], v11 = grid[y1 * SIZE + x1];
    return lerp(lerp(v00, v10, fx), lerp(v01, v11, fx), fy); // 0..1
  };
}
function fbm(noise, x, y, octaves, lacunarity, gain) {
  let sum = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) { sum += amp * noise(x * freq, y * freq); freq *= lacunarity; amp *= gain; }
  return sum; // ≈0..1
}

export default function App() {
  // --- Controls ---
  const [flavorsInput, setFlavorsInput] = useState("ube, mango, coconut");
  const [type, setType] = useState("smear"); // linear | smear
  const [angle, setAngle] = useState(30);
  const [smearStrength, setSmearStrength] = useState(0.45); // 0..1
  const [pattern, setPattern] = useState("fractal"); // none | fractal
  const [fractalIntensity, setFractalIntensity] = useState(0.25); // 0..1
  const [fractalScale, setFractalScale] = useState(140); // px
  const [fractalOctaves, setFractalOctaves] = useState(4); // 2..7
  const [seed, setSeed] = useState(7);
  const [exportSize, setExportSize] = useState(1536); // px

  const canvasRef = useRef(null);

  // Parse flavors → colors
  const flavors = useMemo(() => (
    flavorsInput
      .split(/,|\\r?\\n/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 8)
  ), [flavorsInput]);

  const colors = useMemo(() => {
    const arr = flavors.map(flavorToColor);
    if (arr.length === 1) {
      const h = hashHue(flavors[0]);
      arr.push(hslToHex((h + 200) % 360, 68, 68));
    }
    return arr.length ? arr : ["#ff7a00", "#ffe066"]; // default
  }, [flavors]);

  // Build a CSS gradient string for quick copying
  const cssGradient = useMemo(() => {
    const stops = colors.map((c, i) => `${c} ${(i / Math.max(colors.length - 1, 1)) * 100}%`).join(", ");
    return `linear-gradient(${angle}deg, ${stops})`;
  }, [colors, angle]);

  // Draw to canvas
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) return;

    // Set crisp high-DPI backing store tied to container size
    const parent = canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : { width: 800, height: 480 };
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(512, Math.floor(rect.width * dpr));
    const h = Math.max(512, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }

    // 1) Base linear gradient paint (into canvas)
    const rad = (angle * Math.PI) / 180;
    const x1 = w / 2 - Math.cos(rad) * w;
    const y1 = h / 2 - Math.sin(rad) * h;
    const x2 = w / 2 + Math.cos(rad) * w;
    const y2 = h / 2 + Math.sin(rad) * h;
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // 2) Smear (motion-blur-like dragging along angle)
    if (type === "smear") {
      const passes = Math.max(4, Math.round(24 * smearStrength));
      const shift = Math.max(1, Math.round((w + h) * 0.0015 * smearStrength));
      ctx.globalAlpha = 0.06;
      for (let i = 0; i < passes; i++) {
        const dx = Math.cos(rad) * shift * (i + 1);
        const dy = Math.sin(rad) * shift * (i + 1);
        ctx.drawImage(canvas, dx, dy);
      }
      ctx.globalAlpha = 1;
    }

    // 3) Fractal overlay (fbm) for marbled texture
    if (pattern === "fractal" && fractalIntensity > 0) {
      const noise = makeNoise(seed);
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data; // RGBA
      const scale = Math.max(40, fractalScale);
      const oct = Math.max(2, Math.min(7, fractalOctaves));
      const gamma = 1.2;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let n = fbm(noise, x / scale, y / scale, oct, 2.0, 0.5); // ~0..1
          n = Math.max(0, Math.min(1, Math.pow(n, gamma)));
          const i = (y * w + x) * 4;
          const v = Math.floor(255 * n * fractalIntensity);
          d[i] = Math.min(255, d[i] + v);
          d[i + 1] = Math.min(255, d[i + 1] + v);
          d[i + 2] = Math.min(255, d[i + 2] + v);
        }
      }
      ctx.putImageData(img, 0, 0);
    }
  }, [colors, type, angle, smearStrength, pattern, fractalIntensity, fractalScale, fractalOctaves, seed]);

  // --- Actions ---
  function copyCss() { navigator.clipboard.writeText(cssGradient); }
  function downloadPng() {
    const canvas = canvasRef.current; if (!canvas) return;
    // create export canvas at requested size for clean output
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const out = document.createElement("canvas");
    out.width = Math.floor(exportSize * dpr); out.height = Math.floor(exportSize * dpr);
    const ctx = out.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // repaint using same pipeline at export resolution
    const w = out.width, h = out.height;
    const rad = (angle * Math.PI) / 180;
    const x1 = w / 2 - Math.cos(rad) * w, y1 = h / 2 - Math.sin(rad) * h;
    const x2 = w / 2 + Math.cos(rad) * w, y2 = h / 2 + Math.sin(rad) * h;
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    if (type === "smear") {
      const passes = Math.max(4, Math.round(24 * smearStrength));
      const shift = Math.max(1, Math.round((w + h) * 0.0015 * smearStrength));
      ctx.globalAlpha = 0.06;
      for (let i = 0; i < passes; i++) {
        const dx = Math.cos(rad) * shift * (i + 1);
        const dy = Math.sin(rad) * shift * (i + 1);
        ctx.drawImage(out, dx, dy);
      }
      ctx.globalAlpha = 1;
    }

    if (pattern === "fractal" && fractalIntensity > 0) {
      const noise = makeNoise(seed);
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const scale = Math.max(40, fractalScale);
      const oct = Math.max(2, Math.min(7, fractalOctaves));
      const gamma = 1.2;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let n = fbm(noise, x / scale, y / scale, oct, 2.0, 0.5);
          n = Math.max(0, Math.min(1, Math.pow(n, gamma)));
          const i = (y * w + x) * 4;
          const v = Math.floor(255 * n * fractalIntensity);
          d[i] = Math.min(255, d[i] + v);
          d[i + 1] = Math.min(255, d[i + 1] + v);
          d[i + 2] = Math.min(255, d[i + 2] + v);
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    const a = document.createElement("a");
    a.download = `flavor-gradient-${Date.now()}.png`;
    a.href = out.toDataURL("image/png");
    a.click();
  }

  // --- UI ---
  const previewStyle = { backgroundImage: cssGradient, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <section className="lg:col-span-1 space-y-4">
          <header className="flex items-center gap-2">
            <Wand2 className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Flavor Gradient Generator</h1>
          </header>

          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 space-y-4 shadow-xl">
            <label className="text-sm text-neutral-300">Flavor prompts (comma or new line)</label>
            <textarea
              className="w-full rounded-xl bg-neutral-800/70 border border-neutral-700 p-3 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[76px]"
              value={flavorsInput}
              onChange={e => setFlavorsInput(e.target.value)}
              placeholder="e.g., ube, mango, coconut"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400">Type</label>
                <select className="w-full bg-neutral-800/70 border border-neutral-700 rounded-xl p-2" value={type} onChange={e => setType(e.target.value)}>
                  <option value="linear">Linear</option>
                  <option value="smear">Smear</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400">Angle: {angle}°</label>
                <input type="range" min={0} max={360} value={angle} onChange={e => setAngle(parseInt(e.target.value))} className="w-full" />
              </div>
            </div>

            {type === "smear" && (
              <div>
                <label className="text-xs text-neutral-400">Smear strength: {Math.round(smearStrength * 100)}%</label>
                <input type="range" min={0} max={100} value={Math.round(smearStrength * 100)} onChange={e => setSmearStrength(parseInt(e.target.value) / 100)} className="w-full" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400">Pattern</label>
                <select className="w-full bg-neutral-800/70 border border-neutral-700 rounded-xl p-2" value={pattern} onChange={e => setPattern(e.target.value)}>
                  <option value="none">None</option>
                  <option value="fractal">Fractal</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400">Fractal intensity: {Math.round(fractalIntensity * 100)}%</label>
                <input type="range" min={0} max={100} value={Math.round(fractalIntensity * 100)} onChange={e => setFractalIntensity(parseInt(e.target.value) / 100)} className="w-full" />
              </div>
            </div>

            {pattern === "fractal" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400">Fractal scale: {fractalScale}px</label>
                  <input type="range" min={60} max={400} value={fractalScale} onChange={e => setFractalScale(parseInt(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400">Octaves: {fractalOctaves}</label>
                  <input type="range" min={2} max={7} value={fractalOctaves} onChange={e => setFractalOctaves(parseInt(e.target.value))} className="w-full" />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-neutral-400">Export size (px)</label>
              <input type="number" min={512} max={4096} step={128} value={exportSize} onChange={e => setExportSize(Math.max(512, Math.min(4096, parseInt(e.target.value) || 1536)))} className="w-full bg-neutral-800/70 border border-neutral-700 rounded-xl p-2" />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={copyCss} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-amber-400"><Copy className="w-4 h-4"/> Copy CSS</button>
              <button onClick={downloadPng} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500 text-neutral-900 font-semibold hover:bg-amber-400"><Download className="w-4 h-4"/> Download PNG</button>
              <button onClick={() => setSeed(s => s + 1)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-fuchsia-400"><Sparkles className="w-4 h-4"/> New seed</button>
            </div>

            <p className="text-xs text-neutral-400 pt-2">Tip: Try prompts like “mango, coconut, banana” or “coffee, caramel, vanilla”. Unknown flavors map to a pastel automatically.</p>
          </div>
        </section>

        {/* Preview */}
        <section className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl overflow-hidden">
            <div className="p-3 text-sm text-neutral-300 flex items-center gap-2 bg-neutral-900/60 border border-neutral-800 rounded-t-2xl"><Stars className="w-4 h-4"/> Baked canvas (what exports)</div>
            <div className="h-72 md:h-96 bg-neutral-900 border border-neutral-800 rounded-b-2xl flex items-center justify-center">
              <canvas ref={canvasRef} className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 overflow-hidden">
            <div className="p-3 text-sm text-neutral-300 bg-neutral-900/60 border-b border-neutral-800">CSS preview</div>
            <div className="h-24" style={previewStyle} />
            <div className="p-3 text-[11px] text-neutral-400">CSS preview shows the base linear gradient. The canvas (above) shows smear + fractal effects baked into the image export.</div>
          </div>
        </section>
      </div>
    </div>
  );
}
