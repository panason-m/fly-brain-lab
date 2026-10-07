# Fly Brain Lab

A presentation and a playground about the complete male fruit fly connectome
(Google Research × HHMI Janelia, Sept 2026).

| Section | What it is |
|---|---|
| **Overview** | Project landing page |
| **Talk** | 35-slide deck: the map, open-source fly brains, demos, fly vs. AI (arrow keys / click / swipe) |
| **Live arena** | The full 165,122-neuron male fly (Lulzx/fly-brain, MIT) in a MuJoCo body, bundled in `arena/` |
| **Arcade** | Four experiments where a small spiking fly circuit learns live: Fly Runner (Chrome Dino-style), Parallel Parking, Doner Kebab, Rhythm Slicer (Beat Saber-style) |
| **Cases** | The internet's fly-brain demos with links |
| **Engine** | How the LIF engine and learning rules work |

## Run it

```
python serve.py
```

This opens http://localhost:8000 (the app). Everything works, including the **Live arena**,
which needs the server because it shares one connectome between worker threads
(cross-origin isolation; `serve.py` adds the COOP/COEP headers for `/arena/`).
Use desktop Chrome, Edge or Firefox.

Without the server you can still open `dist/index.html` directly: the talk, arcade, cases
and engine all work; only the live arena needs `serve.py`.

## Project layout

```
src/
  core.js     LIF engine + the four tasks (pure logic, no DOM; runs in Node too)
  app.js      UI: routing, live brain views, learning curves, 2D fallback scenes
  fly3d.js    3D fruit fly (flybody meshes + skeleton, FlySuite walking gait) for three.js
  scene3d.js  The four 3D arcade scenes (desert run, street parallel parking, kebab shop, neon track)
  assets/     three.js r128 + GLTFLoader (MIT), fly3d.json + fly_mesh.json (flybody, Apache-2.0),
              doner_model.json + knife_model.json (Sketchfab, CC BY 4.0; built from the .glb files here)
  shell.html  App shell: top bar, Overview / Arcade / Cases / Engine views
  deck.html   The slide deck (merged into the Talk view at build time)
arena/        Built copy of Lulzx/fly-brain (MIT): arena, connectome viewer, data (~100 MB)
serve.py      Local server: python serve.py
build.py      python build.py  ->  dist/index.html, dist/core.js, dist/app.js
tools/
  pack_models.py     python tools/pack_models.py  (re-pack the Sketchfab .glb models)
tests/
  learning.test.js   node tests/learning.test.js  (checks every circuit learns)
```

## 3D graphics

The arcade renders the anatomically detailed flybody fly (Vaxenburg et al. 2024, Apache-2.0,
via Lulzx/fly-brain) with three.js. Legs follow the FlySuite real-fly walking gait; front legs
are posed to jump, brake, hold the knife or the sabers. If WebGL is unavailable the arcade falls
back to the 2D drawings. 3D needs the files to be served over http (use `python serve.py`).

## Doner kebab models (CC BY 4.0)

- Doner machine: "#SketchfabWeeklyChallenge Food Döner Kebap" by Bob (MeBob),
  https://sketchfab.com/3d-models/sketchfabweeklychallenge-food-doner-kebap-cb7d6cae048c4ba4b3d6bae84ab0f723
- Knife: "Electric Doner Kebab Knife" by Dzclaboratory,
  https://sketchfab.com/3d-models/electric-doner-kebab-knife-f63da6c4922148eeb81dedc81addf141

Source files: the two .glb downloads in `src/assets/` (doner: Sketchfab 1k version, 3.1 MB).
Re-pack them with `python tools/pack_models.py`, then `python build.py`.

Changes: textures re-encoded as 1024/512 px JPEG (3.1 MB -> 0.53 MB), files packed as
base64 JSON so they can be hosted anywhere, and the meat is recoloured live in a shader:
24 strips around the spit blend from raw (pink, glossy) to cooked (golden, matte) following the
game's cooking state; a freshly cut strip turns pink and sits slightly inward. The meat triangles
were picked from the texture atlas and are listed in `doner_model.json` (`meatTris`).

## The model, honestly

- Neurons are leaky integrate-and-fire, stepped every 1 ms; sensory neurons fire Poisson spikes.
- Each game uses a **miniature hand-wired circuit (13–40 neurons)** named after real fly cell types
  (LC10a, AOTU, DNs, Kenyon cells, MBONs). It is **not** the 166,000-neuron connectome.
- Wiring is fixed; only one layer of synapses learns:
  - Fly Runner / Parking: crash-gated credit assignment (too late → strengthen, too early → weaken)
  - Doner Kebab: dopamine-gated plasticity at Kenyon cell → MBON synapses
  - Rhythm Slicer: misses strengthen the right saber, wrong swings weaken the one that moved

## Roadmap

1. Replace hand-wired circuits with real MaleCNS v1.0 subsets from neuPrint.
2. Add shuffled-wiring controls to test whether real wiring matters.
3. Run the full brain in a Web Worker (WebAssembly).
4. Export learning curves for the paper.

## References

- Google Research blog: https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/
- eonsystemspbc/fly-brain: https://github.com/eonsystemspbc/fly-brain
- Lulzx/fly-brain: https://github.com/Lulzx/fly-brain (bundled in arena/, commit in arena/VERSION.txt)
- shovon/malecns-v1-dinosaur-game: https://github.com/shovon/malecns-v1-dinosaur-game
- Shiu et al., Nature 2024 · FlyWire, Nature 2024 · Lappalainen et al., Nature 2024
