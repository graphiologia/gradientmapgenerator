# Flavor Gradient Generator (Web)

A shareable web app that turns flavor prompts into smeared/fractal gradients. Built with **Vite + React + Tailwind**.

## Run locally
```bash
npm i
npm run dev
```
Open the shown URL (usually http://localhost:5173).

## Build for the web
```bash
npm run build
npm run preview  # optional local preview
```

The static site lives in `dist/`.

## Deploy options
### Netlify (drag-and-drop)
1. `npm run build`
2. Drag the `dist/` folder into https://app.netlify.com/drop

### Vercel
- Import the repo → Framework: Vite → Build: `npm run build` → Output dir: `dist`

### GitHub Pages
Set a base path in `vite.config.js` (e.g. `base: '/flavor-gradient/'`) if deploying under a subpath. Then build and publish `dist/` using any GH Pages action or manual upload.

---

## Notes
- The PNG exporter repaints at the requested size for crisp output.
- If you need a true installable app, add `vite-plugin-pwa` and a manifest.
