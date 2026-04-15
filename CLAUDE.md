# CLAUDE.md

Guidance for Claude Code working in this repo.

## Project Overview

Clouden: browser-based 2D cloud-themed game, vanilla JS, no build system/package manager. Runs via `index.htm`.

**Live deployment**: http://stdwanze.de/clouden/index.htm

## Running the Game

Serve root over HTTP (`file://` blocks canvas ops). Any static server works:

```bash
python3 -m http.server 8080
# Then open http://localhost:8080/index.htm
```

No build steps, no tests, no linting.

## Git Policy

Never commit unless all tests green.

## Architecture

### Script Loading Order

`index.htm` loads scripts synchronously in dependency order — order matters:

```
globals.js → imagerepo.js → simulations.js → objects.js → osd.js
→ player.js → enemy.js → algos.js → world.js → app.js
→ renderer.js → onscreendoc.js → utils.js
```

All code under `CM` global namespace (defined in `globals.js`).

### Core Systems

**Game loop** (`app.js` — `CloudEngine`): Orchestrates all. Each frame: reads input → updates player/entities → runs AI → sorts by z-depth → renders. Entry: `ImageRepo.load() → World creation → engine.init() → engine.run()`.

**World** (`world.js` — `World`, `Chunk`, `TileSprite`): Chunk-based terrain (10×10 chunks, 30×30 tiles at 32px). Renders 9 chunks around player. Chunks lazy-loaded, scenes cached.

**Entity hierarchy** (`objects.js`):
```
CloudObject (position, size, z-depth)
└── MoveableObject (movement, ID)
    ├── Sprite (animation)
    │   ├── Collectable (coins, health, ammo, fuel)
    │   └── VehicleSprite
    │       ├── Blimp (player-mountable)
    │       └── Dragon (enemy AI)
    └── CloudPlayer
```

**Player** (`player.js`): Arrow keys move, A/S change z-depth, B mount/dismount, C fire. Tile-collision-aware.

**Renderer** (`renderer.js`): Wraps Canvas 2D. Viewport camera follows player. Zoom scales with z-depth. All world→screen transforms here.

**Input** (`utils.js` — `InputHandler`): Observer pattern. Tracks held keys, notifies listeners.

**Assets** (`imagerepo.js` — `ImageRepo`): Loads ~20 images from `img/`. Promise-based with timeout. Registered by semantic name (e.g. `"player"`, `"blimp"`).

**Scoring** (`simulations.js`): `Score` base class with min/max/step. Subclasses: `Health` (0–10), `Ammo` (0–10), `Fuel`, `Coins` (0–200). `Hitable` tracks red-flash hit state.

**Enemy AI** (`enemy.js` — `Dragon`): Pursues player within 150px, fires every 120 frames, 20 HP.

**Procedural gen** (`algos.js`, `simulations.js`): `CloudSource` places collectibles + cloud sprites with configurable density. Factories (`FireBallCreator`, `TILECREATOR`, `CLOUDGEN`) use callback injection.

### Key Design Patterns

- **Namespace**: All under `CM.*`
- **Factories with callbacks**: Creation fns accept callbacks for tile access, removal, firing — avoids tight coupling
- **Z-depth sorting**: All renderables sorted before each draw pass
- **Chunk-based spatial lookup**: World lookups via chunk coords, not flat arrays
