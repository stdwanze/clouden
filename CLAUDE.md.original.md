# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clouden is a browser-based 2D cloud-themed game written in vanilla JavaScript with no build system or package manager. It runs directly in the browser via `index.htm`.

**Live deployment**: http://stdwanze.de/clouden/index.htm

## Running the Game

Serve the project root over HTTP (browsers block `file://` canvas operations). Any static file server works:

```bash
python3 -m http.server 8080
# Then open http://localhost:8080/index.htm
```

There are no build steps, no tests, and no linting configured.

## Git Policy

Never commit or check in code unless all tests are green.

## Architecture

### Script Loading Order

`index.htm` loads scripts synchronously in dependency order — this order matters:

```
globals.js → imagerepo.js → simulations.js → objects.js → osd.js
→ player.js → enemy.js → algos.js → world.js → app.js
→ renderer.js → onscreendoc.js → utils.js
```

All code lives under the `CM` global namespace (defined in `globals.js`).

### Core Systems

**Game loop** (`app.js` — `CloudEngine`): Orchestrates everything. On each frame: reads input → updates player/entities → runs AI → sorts by z-depth → renders. Entry: `ImageRepo.load() → World creation → engine.init() → engine.run()`.

**World** (`world.js` — `World`, `Chunk`, `TileSprite`): Chunk-based terrain (10×10 chunks, each 30×30 tiles at 32px). Only the 9 chunks surrounding the player are rendered. Chunks are lazy-loaded and their rendered scenes are cached.

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

**Player** (`player.js`): Arrow keys move, A/S change z-depth (ascend/descend), B mounts/dismounts vehicles, C fires. Movement is tile-collision-aware.

**Renderer** (`renderer.js`): Wraps Canvas 2D context. Maintains a viewport camera that follows the player. Zoom scales with player z-depth. All world→screen coordinate transforms go through here.

**Input** (`utils.js` — `InputHandler`): Observer pattern. Tracks currently-held keys and notifies registered listeners.

**Assets** (`imagerepo.js` — `ImageRepo`): Loads ~20 images from `img/`. Promise-based with timeout. Images registered by semantic name (e.g. `"player"`, `"blimp"`).

**Scoring** (`simulations.js`): `Score` base class with min/max/step. Subclasses: `Health` (0–10), `Ammo` (0–10), `Fuel`, `Coins` (0–200). `Hitable` tracks red-flash hit state.

**Enemy AI** (`enemy.js` — `Dragon`): Pursues player within 150px, fires every 120 frames, 20 HP.

**Procedural generation** (`algos.js`, `simulations.js`): `CloudSource` places collectibles and cloud sprites with configurable density. Factories (`FireBallCreator`, `TILECREATOR`, `CLOUDGEN`) use callback injection for creation.

### Key Design Patterns

- **Namespace**: Everything under `CM.*`
- **Factories with callbacks**: Creation functions accept callbacks for tile access, removal, and firing to avoid tight coupling
- **Z-depth sorting**: All renderable objects sorted before each draw pass
- **Chunk-based spatial lookup**: World lookups go through chunk coordinates, not flat arrays
