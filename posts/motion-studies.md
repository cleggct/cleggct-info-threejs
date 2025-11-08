---
title: Motion Studies with Three.js
date: 2025-11-08
canvases:
  - id: ripple-grid
    label: Ripple Grid Heightfield
    entry: post-canvases/ripple-grid.js
  - id: orbital-particles
    label: Orbital Particle Cloud
    entry: post-canvases/orbital-particles.js
---

The blog needed a place to mix notes with live simulations, so I built a small
system to embed canvases inside a post. Each section
below drops in a data-driven `<figure>` and lets a dedicated script boot a
Three.js scene.

{{canvas:ripple-grid}}

The ripple field uses a dense plane geometry and lifts the vertices every frame
with a trio of sine waves. In my next post I'll explain how I made the water demo on my homepage.

## Orbital Particles

{{canvas:orbital-particles}}

Bundled canvases behave like any other asset, so you can stack as many of them
as you like in a single article. The orbital system is just a buffer of points
marching around a nucleus with a little motion in the camera to keep things
alive.
