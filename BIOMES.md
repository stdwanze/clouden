# Biome System Design

## Overview

Four tile types exist, forming a strict 1D transition chain:

```
Desert → Light Grass → Dark Grass → Snow
  0           1             2          3
```

No adjacency between non-neighbors (no desert next to snow, no desert next to dark grass). This keeps the world readable and avoids jarring visual jumps.

---

## Biome Assignment per Chunk

Each chunk gets a **biome index** (0–3) at world-generation time. The simplest approach that avoids ad-hoc jumps is a **1D gradient with noise**:

### Approach: Distance-from-spawn gradient + seeded noise

The player spawns at tile (10,10) — chunk (0,0), the **top-left corner** of the world. The world is 10×10 chunks. Distance should therefore be measured from chunk (0,0), not from the center.

1. At world-generation time, pick a **random spawn biome** `S` (0–2; capped at 2 so there is always at least one step of progression left):
   ```
   S = floor(rng() * 3)   // 0, 1, or 2
   ```
2. Compute a normalised distance from spawn:
   ```
   dist = sqrt(chunkX² + chunkY²)
   MAX_DIST = sqrt(10² + 10²) ≈ 14.1
   base = dist / MAX_DIST            // 0.0 at spawn → 1.0 at far corner
   ```
3. Shift the gradient so it starts at `S` and reaches 3 (snow) at the far corner:
   ```
   shifted = S/3 + base * (1 - S/3)  // maps [0..1] → [S/3..1]
   ```
4. Add a small seeded noise offset per chunk (hash of chunk coords, scaled ±0.10) to break up the diagonal.
5. Quantize `shifted + noise` to biome index:
   ```
   0.00–0.25 → Desert
   0.25–0.50 → Light Grass
   0.50–0.75 → Dark Grass
   0.75–1.00 → Snow
   ```
6. After quantizing, **clamp each chunk to ±1 of any neighbor** already assigned (scan in raster order). This enforces the transition rule.

This gives a world that always progresses toward snow at the far corner but starts at a random biome — every run feels different at spawn while the chain rule is never violated.

### Alternative: Voronoi regions (more varied, more complex)
Place 8–12 biome seeds at random world positions, each assigned a biome index. Every chunk takes the biome of its nearest seed. After assignment, walk all chunk pairs and if two neighbors differ by more than 1 step, bump the smaller one up by 1. Repeat until stable. This gives irregular biome shapes but enforces the chain. Slightly more code (~50 extra lines), worth it if variety matters more.

**Recommendation:** Start with the gradient approach — ~25 lines of code, random spawn biome each run, always progresses toward snow. Switch to Voronoi if the world feels monotonous.

---

## Enforcing the Transition Rule

Store biome indices in a 2D array indexed by chunk coordinates at generation time:

```js
CM.BiomeMap = function(chunksWide, chunksHigh, seed) { ... }
// returns biomeAt(cx, cy) → 0..3
```

After initial assignment, run a single pass:
```
for each chunk (in reading order, top-left to bottom-right):
    for each already-assigned neighbor (top, left):
        if |myBiome - neighborBiome| > 1:
            myBiome = neighborBiome + sign(myBiome - neighborBiome)
```

One pass is sufficient for the gradient approach. Voronoi may need 2–3 passes.

---

## Mountains

### Visual

`img/tile_mountain32.png` — dark warm-grey stone with diagonal crack highlights. Looks distinct from all four biome tiles.

### Shape

Each mountain is a **ridge**: a line of 10–20 tiles long, 1–4 tiles wide, oriented in one of four directions: horizontal, vertical, diagonal ↘, diagonal ↗.

Width is perpendicular to the ridge axis. So a ridge of length 15 and width 3 occupies a 3×15 (or diagonal equivalent) block of tiles.

### Generation — `CM.MountainMap`

A new function generates N ridges at world-build time and exposes a tile-level lookup:

```
CM.MountainMap = function(totalTilesWide, totalTilesHigh) {
    // scatter ~(chunksWide * chunksHigh / 8) ridges (≈12 for a 10×10 world)
    // for each ridge:
    //   pick random start tile (avoid spawn area, first 10×10 tiles)
    //   pick direction: 0=H, 1=V, 2=diag↘, 3=diag↗
    //   pick length: 10–20 tiles
    //   pick width: 1–4 tiles
    //   for each step along the axis, mark width tiles perpendicular as mountain
    // returns isMountain(tx, ty) → bool
}
```

For diagonal ridges, step `(dx, dy)` along the axis (e.g. `(1,1)` for ↘) and offset `(-dy, dx)` for the perpendicular width.

Store the result in a flat `Uint8Array` of size `totalTiles` — fast bitset lookup, ~90 KB for a 300×300 world.

### Integration with TILECREATOR

In `CM.TILECREATOR`, after looking up `info`, check the mountain map first:

```js
if (CM.mountainMap.isMountain(i + worldx, k + worldy)) {
    c = 'tile_mountain';
    info.isMountain = true;   // dedicated flag — see below
    info.isLand = false;      // makes it impassable via checkMovement
} else if (!info.isLand) {
    c = 'tile_water';
} else {
    c = biomeNames[biomeIndex];
}
```

### Why a dedicated `isMountain` flag — not just `isLand = false`

`_getBridgeWaterTile()` (app.js) scans forward looking for `!tile.isLand()` tiles to place a bridge on. If a mountain tile only has `isLand = false`, the bridge builder would treat it like water and happily place a bridge over it.

The fix: add `isMountain` to `TileInfo` and guard it in `_getBridgeWaterTile`:

```js
// in _getBridgeWaterTile — skip mountains entirely, treat as solid wall
if (tile.isMountain) break;   // can't bridge over or through a mountain
```

`TileInfo` needs one extra boolean field. `checkMovement` already blocks non-land tiles, so no change needed there — mountains are impassable and un-bridgeable.

### Density per Biome

Mountains can appear in any biome. Optionally, bias placement toward higher biome indices (more mountains in dark-grass/snow areas) by filtering start positions:

```js
var ridgeBiome = CM.biomeMap.biomeAt(Math.floor(startTileX / 30), Math.floor(startTileY / 30));
if (rng() > 0.3 + ridgeBiome * 0.2) skip;   // more likely in colder biomes
```

---

## Tile Image Selection in TILECREATOR

`CM.TILECREATOR` (algos.js line 196) currently hardcodes `"tile_land_desert"`. Change this to:

```js
var biomeNames = ['tile_land_desert', 'tile_land_gras', 'tile_land_gras_dark', 'tile_land_snow'];
var biomeIndex  = CM.biomeMap.biomeAt(Math.floor(worldx / 30), Math.floor(worldy / 30));
// mountains override biome (checked first — see Mountains section above)
c = !info.isLand ? 'tile_water' : biomeNames[biomeIndex];
```

`worldx / 30` converts the tile-level world offset to a chunk index (chunks are 30 tiles wide).

The `imagerepo` already loads all four tile images — no further changes needed there.

---

## Chunk-Border Blending

Hard borders between biomes at chunk edges are acceptable for v1 — the existing water-border sprite system shows this is already the visual language of the game.

If soft transitions are desired later, a simple trick: for tiles within 2 tiles of a chunk edge, check the neighboring chunk's biome and randomly sample between the two tile images using the existing decal/overlay system. This is optional and can be deferred.

---

## Floating Islands

Islands currently receive their tile image at construction time in app.js. With the biome map in place, pick the island tile based on the biome of the chunk the island's center sits in:

```js
var islandChunkX = Math.floor(pos.x / (30 * 32));
var islandChunkY = Math.floor(pos.y / (30 * 32));
var islandBiome  = CM.biomeMap.biomeAt(islandChunkX, islandChunkY);
var islandTile   = ['tile_land_desert', 'tile_land_gras', 'tile_land_gras_dark', 'tile_land_snow'][islandBiome];
this.world.addObject(new CM.FloatingIsland(pos, null, this.imagerepo.getImage(islandTile)));
```

Island cliff colors (brown in the current code) could also be tinted per biome (e.g. grey-blue for snow biome) but this is cosmetic.

---

## Summary of Changes Required

| File | Change |
|---|---|
| `src/algos.js` | Add `CM.BiomeMap`, `CM.MountainMap`; update `CM.TILECREATOR`; add `isMountain` to `TileInfo` |
| `src/globals.js` | Store the generated `CM.biomeMap` instance |
| `src/app.js` | Generate biome map once during init; pass biome tile to `FloatingIsland` constructor; guard `_getBridgeWaterTile` against `isMountain` tiles |
| `src/imagerepo.js` | Already done — all four tiles registered |

Total estimated new code: ~60–80 lines.
