# cleggct-info

Minimal static site for water-sim experiments and runnable demos.

## Requirements

- Node.js 18+ (developed on 24.6.0)

## Scripts

```bash
npm install
npm run dev   # build, serve http://localhost:8080, rebuild on changes
npm run build # generate static output in dist/
```

## Content Structure

- `demos/*.js` – React components rendered full-screen. Drop in new files and rebuild.
- `posts/*.md` – Markdown with front matter (`title`, optional `date`). Each becomes `/posts/<slug>/`.
- `site/assets` – Static CSS/JS, including the water background shader.
- `textures/`, `banner.png` – Copied verbatim into `dist/`.

Running either script rebuilds everything and produces `dist/` with `/index.html`, `/demos/<slug>/`, and `/posts/<slug>/`.
