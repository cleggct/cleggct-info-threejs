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

## Post-Embedded Canvases

- Add your interactive modules under `post-canvases/` (or point to any JS file in the repo).
- In a post’s front matter, declare a `canvases` array with an `id`, optional `label`, and the `entry` file to bundle:

  ```yaml
  ---
  title: Motion Studies
  canvases:
    - id: ripple-grid
      label: Ripple Grid Heightfield
      entry: post-canvases/ripple-grid.js
  ---
  ```

- Drop `{{canvas:ripple-grid}}` (matching the `id`) anywhere in the Markdown. The generator outputs a `<figure>` with a `<canvas>` placeholder.
- Export a default function from the entry module. It receives `{ mount, canvas }`, where `mount` is the `<figure>` and `canvas` is the DOM node to pass into Three.js.

Each canvas is bundled to `/posts/<slug>/<id>.js` and automatically injected into the page with a `<script type="module">` tag.

## Credit for the Skybox Textures

I got the images from opengameart.org, credit goes to
Jockum Skoglund aka hipshot
hipshot@zfight.com
www.zfight.com
