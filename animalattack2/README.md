# Animal Attack

Open **index.html** in a modern browser. No build, installation, or local server is required. An internet connection is needed to load the sole external dependency, Three.js **0.186.0**, from jsDelivr. All models, pixel art, textures, and sounds are generated inside the HTML file.

Choose a front nest to send its color-matched animals to the picnic. Squads with unused bites wait in one of five spots and resume when their color is exposed. Clear every layer to win. There is no timer, advertising, purchase, or required booster.

## Controls

- Tap or click a front nest; keyboard **1–5** selects its column.
- **U**: undo the entire last round. **R**: retry. **F**: toggle 2× speed.
- **Hint** highlights a solver-confirmed safe choice. **Extra spot** adds a sixth spot for the current level. Both are free.
- The map shows unlocked picnics and earned stars. Settings switch English/German, sound, music, and haptics.
- Add `?level=19` to open a particular level, or `?debug` for FPS, draw calls, pixel ratio, and visible animal count. Combine them as `?level=19&debug`.

## Complete milestone files

Each file runs independently; no asset or source file is shared at runtime.

1. [M1](milestones/M1.html): playable pure round simulation, capsule-style animals, three levels.
2. [M2](milestones/M2.html): articulated ants, tripod gait, antennae, mandibles, eating, and crumbs.
3. [M3](milestones/M3.html): 24 original layered levels, deterministic queue generation, DFS solver, safe hints.
4. [M4](milestones/M4.html): audio, music, haptics, stars, coins, saves, settings, and English/German.
5. [M5](milestones/M5.html): ladybug adjacent two-block bites, larger/slow beetle squads, and grasshopper bites one layer below the surface. This is also the final `index.html`.

The stage flag selects milestone behavior; each snapshot deliberately retains the complete implementation in one module for inspection.

## Implementation

Eight original 16×16 food pictures produce 24 levels in four tiers. Beginner levels use two or three colors; later levels introduce depth and new animals. Expert levels have a deliberately constrained opening: exactly one of the five front columns leads to a win without a booster. Every generated layout is verified before it becomes playable.

The round engine operates on serializable plain state. It clones its input, emits deterministic events, and resolves waiting squads to a fixed point. Undo stores complete round snapshots. A capped, memoized DFS uses the same engine; a search-cap result is reported as inconclusive, never as proof that a level is impossible.

Rendering is separate: instanced rounded blocks, batched articulated hero rigs, instanced distant swarm parts, pooled crumb particles, canvas textures, blob shadows, and a perspective camera. Visual time and particle physics use a fixed 60 Hz update with interpolated rendering. Quality reduces after sustained slow frames; pixel ratio is capped at 2. Hidden tabs pause updates and audio. Reduced-motion mode shortens round presentation and suppresses spatial effects.

Saves use localStorage with an in-memory fallback. Stars and coins are awarded only at level completion. State and level snapshots are available through `window.AnimalAttack` for reproducible debugging.

## Verification

Run `node tests/verify.cjs` with Node.js; no npm packages are required. This executes the simulation extracted from the delivered HTML, checks all 48 ant-only/extra-animal level variants, replays their solutions without boosters, proves the expert openings, and tests immutability, resumption, loss, extra slots, ladybug clustering, and grasshopper access. Results are written to `verification.json`.

Browser checks cover direct `file://` opening, 320–768 px widths, touch target sizes, input locking, hint, exact undo, extra-slot undo, language switching, a complete keyboard playthrough, coin awards, and map unlocking. Performance on a physical mid-range phone has **not** been measured; 60 fps is a target rather than a hardware guarantee.
