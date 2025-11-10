---
title: Building the Water Shader
date: 2025-11-10
canvases:
  - id: waterp1
    label: Water Shader Study (Step 1 - Dual Normal Maps)
    entry: post-canvases/waterp1.js
  - id: waterp2
    label: Water Shader Study (Step 2 - Lighting)
    entry: post-canvases/waterp2.js
---

The water on the homepage looks complex but it is really quite a simple effect.
It essentially consists of scrolling two normal maps at differing rates to create
the appearance of a rippling surface, and then layering a few different lighting
effects (blinn-phong, fresnel and skybox reflections). To make it, I found
someone on a forum who gave step-by-step instructions on how to make good looking
water and I just implemented steps off that list, starting with the most basic,
until I had something that looked good. I also found an article that gave a
really good overview of various techniques involved in simulating and rendering
water, check it out here: https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models
A lot of what this article covers is considerably more advanced than anything I'm
doing in my shader. Even the simulated ripples that appear when you mouse over
the water are just a simple velocity based simulation that is being factored into
the normal computations. If you look closely, you will see that the surface of
the mesh does not actually deform at all from the ripples; it is simply the
lighting that changes. I have added some slight sine-based undulations in the
vertex shader to make the surface look a bit more alive, but aside from that the
effect is entirely the result of lighting tricks.

Here you can see the effect of just scrolling the two normal maps with some simple
diffuse lighting:

{{canvas:waterp1}}

You can see the result is something that sort of looks like water, but it's a bit
off. Water is quite reflective and this material has no reflections at all. So we'll add some Fresnel lighting (Fresnel reflections? Fresnel effect? I'm not sure of the precise terminology for this effect. It's the reason the edges of a soap bubble look solid while the middle is transparent.) as well as some Blinn-Phong specularity. The effect on the homepage also includes skybox reflections but I have left those out here for simplicity's sake.

{{canvas:waterp2}}

You'll have to play around a bit with the location of the light source (which is passed as a uniform) to get things looking just right, and as you can see having transparent water on a black background tends to look a bit strange. I think the skybox relfections also really help sell it. But that's pretty much all there is to it.
