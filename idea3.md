# Idee 3: Höhlen / Untergrund-Ebene — Umsetzungsplan

## Design-Entscheidungen (bestätigt)

| Thema | Entscheidung |
|---|---|
| CaveLevel | Neue z-Ebene `CM.CaveLevel = 3.5` im bestehenden z-System |
| Höhlen-Eingang | Neues `isCaveEntrance`-Flag auf `TileInfo` |
| CaveCrab | Höhlen-exklusiv · schneller/aggressiver · blind ohne Fackel |
| Ressourcen | Kristalle (neu) · Himmelskarte (Collectible) · Seltene Truhe |

---

## Architektur-Überblick

```
Z-System (aufsteigend = näher):
  CM.Max        = 1.0   (Himmel oben)
  CM.SkyLevel   = 1.75
  CM.FloatLevel = 1.85  (Floating Islands)
  CM.GroundLevel= 2.5   (Erdoberfläche)
  CM.CaveLevel  = 3.5   ← NEU (Untergrund, Zoom = 3.5x)

Welten:
  engine.world      → Oberfläche (Surface World, bestehend)
  engine.caveWorld  → Untergrund (Cave World, neue Instanz) ← NEU
  → Gleiche x/y-Koordinaten, verschiedene Tile-Layer
  → Render-Loop wählt anhand player.z welche Welt gerendert wird
```

---

## Phase 1: Globals & Konstanten

**Datei:** `globals.js`

```js
CM.CaveLevel = 3.5;
```

`torchActive` und `torchTimer` existieren bereits in `app.js` (CloudEngine-Konstruktor). Diese werden für die Höhlendunkelheit wiederverwendet — **kein weiterer Global-State nötig**.

---

## Phase 2: CaveWorld (zweite World-Instanz)

### 2a. Cave-Tile-Generator — `algos.js`

Neue Funktion `CM.CAVE_TILECREATOR(imagerepo, widthInTiles)`:

- Generiert ein Höhlen-Layout (enger, labyrinthartiger als Oberfläche)
- **Walkable Floor** = `tile_cave_floor` (neues Asset), `tileInfo.isLand = true`
- **Cave Wall** = `tile_cave_rock` (neues Asset), `tileInfo.isLand = false`
- **Cave Exit** = `tileInfo.isCaveExit = true` — wird gesetzt an genau den x/y-Positionen, die auf der Oberfläche ein `isCaveEntrance`-Tile haben
- Generation: `CM.BuildWorld()` wiederverwendbar mit höherem `landMassAmount = 4` (mehr offene Fläche) — Wände sind dort, wo `isLand = false`

```js
CM.CAVE_TILECREATOR = function(imagerepo, widthInTiles, entrancePositions) {
    // entrancePositions: Array von {tileX, tileY} — Oberflächeneingänge
    var array = CM.BuildWorld(widthInTiles); // wiederverwendet bestehende Funktion
    array = CM.AnnotateWorld(array, widthInTiles, '#333');

    return function(i, k, location, tileSize, worldx, worldy) {
        var info = array[(worldy + k) * widthInTiles + (i + worldx)];
        var tileX = worldx + i;
        var tileY = worldy + k;

        // Spawn-Bereich immer walkable
        if (worldx === 0 && worldy === 0 && i < 2 && k < 2) info.isLand = true;

        // Exit-Tiles dort setzen, wo Oberflächeneingänge liegen
        info.isCaveExit = entrancePositions.some(function(ep) {
            return ep.tileX === tileX && ep.tileY === tileY;
        });
        if (info.isCaveExit) info.isLand = true; // Exit immer betretbar

        var imgKey = info.isLand ? 'tile_cave_floor' : 'tile_cave_rock';
        var image = imagerepo.getImage(imgKey);
        var ts = new CM.TileSprite(
            new CM.Point(location.x + i * tileSize, location.y + k * tileSize),
            tileSize, image, info
        );

        if (info.isCaveExit) ts.addOverlay(imagerepo.getImage('tile_cave_exit'));

        return ts;
    };
};
```

### 2b. Erzeugung in `app.js`

Nach `world`-Erstellung (nach `CM.TILECREATOR`-Aufruf):

```js
// Sammle alle CaveEntrance-Tile-Positionen aus der Oberfläche
var entrancePositions = [];
engine.world.applyForTile(function(tile) {
    if (tile.info.isCaveEntrance) {
        var tileX = Math.round(tile.location.x / 32);
        var tileY = Math.round(tile.location.y / 32);
        entrancePositions.push({ tileX: tileX, tileY: tileY });
    }
});

engine.caveWorld = new CM.World(
    WORLD_SIZE_X, WORLD_SIZE_Y,
    CM.CAVE_TILECREATOR(imagerepo, TOTAL_TILES_WIDE, entrancePositions)
);
```

### 2c. Render-Umschaltung in `app.js` (tickndraw)

Ersetze:
```js
this.world.getScene(this.player.position).forEach(element => {
    this.renderer.draw(element);
});
```

Durch:
```js
var activeWorld = this.player.z >= CM.CaveLevel ? this.caveWorld : this.world;
activeWorld.getScene(this.player.position).forEach(element => {
    this.renderer.draw(element);
});
```

Hintergrund-Rendering: In der Höhle kein Wasser-Hintergrund, sondern dunkler Felshintergrund:
```js
if (this.player.z >= CM.CaveLevel) {
    this.renderer.drawRectangleStatic(0, 0, sw, sh, '#1a1210'); // dunkle Erde
} else {
    this.renderer.drawWaterBackground(this.imagerepo.getImage('tile_water'));
}
```

---

## Phase 3: Höhlen-Eingang (Tile-Flag)

### 3a. TileInfo erweitern — `world.js`

`CM.TileInfo`-Konstruktor bekommt zwei neue optionale Felder:

```js
// In TileInfo constructor — nach bestehenden Feldern:
this.isCaveEntrance = false; // Oberfläche → Höhle
this.isCaveExit     = false; // Höhle → Oberfläche (wird vom CAVE_TILECREATOR gesetzt)
```

### 3b. Eingänge in Oberflächen-TILECREATOR generieren — `algos.js`

In `CM.TILECREATOR`, nach der Mountain-Logik:

```js
// Cave Entrance: ~1 pro 2000 Landtiles, mindestens 30 Tiles vom Spawn entfernt
var distFromSpawn = Math.sqrt(tileX * tileX + tileY * tileY);
if (info.isLand && !isMountain && distFromSpawn > 30 && CM.rng() < 0.0005) {
    info.isCaveEntrance = true;
}
```

In `TileSprite.draw()` — optionales Overlay für Eingang:
```js
// Am Ende von draw(), nach bestehenden overlays:
if (this.info.isCaveEntrance) {
    renderer.drawTile(entranceOverlayImage, this.location.x, this.location.y, this.size, this.size);
}
```

Damit `TileSprite` das Bild kennt, wird es beim Erstellen übergeben und als Property gespeichert (oder alternativ über `addOverlay(imagerepo.getImage('tile_cave_entrance'))` direkt im TILECREATOR gesetzt — bevorzugte Lösung, da kein Umbau von `TileSprite.draw` nötig).

### 3c. Übergangslogik — `app.js`

Im Tick-Loop, nach `tryCollect()`:

```js
this.checkCaveTransition();
```

Neue Methode in `CloudEngine`:

```js
checkCaveTransition() {
    if (this.player.isMounted()) return; // kein Höhleneintritt im Blimp
    if (this.caveTransitionFrames > 0) { this.caveTransitionFrames--; return; } // Cooldown

    var tile = this.world.getChunk(this.player.position)
        ?.getTile(this.player.position);

    // Oberfläche → Höhle
    if (tile && tile.info.isCaveEntrance && this.player.z >= CM.GroundLevel - 0.1) {
        this.player.z = CM.CaveLevel;
        this.caveTransitionFrames = 60; // 1s Cooldown gegen sofortigen Rückweg
        this.notify('Du betrittst eine Höhle...', 90);
        return;
    }

    // Höhle → Oberfläche (CaveWorld Exit-Tile prüfen)
    if (this.player.z >= CM.CaveLevel) {
        var caveTile = this.caveWorld.getChunk(this.player.position)
            ?.getTile(this.player.position);
        if (caveTile && caveTile.info.isCaveExit) {
            this.player.z = CM.GroundLevel;
            this.caveTransitionFrames = 60;
            this.notify('Du verlässt die Höhle.', 90);
        }
    }
}
```

`caveTransitionFrames = 0` im CloudEngine-Konstruktor initialisieren.

### 3d. Player.checkMovement erweitern — `player.js`

Die Methode prüft aktuell `onGround` und `onIsland`. Auf CaveLevel soll die Bewegung über `caveWorld`-Tile-Kollision laufen. Dazu bekommt `CloudPlayer` eine neue Setter-Methode:

```js
setCaveTileInfoRetriever(retriever) {
    this.caveTileInfoRetriever = retriever;
}
```

In `checkMovement()`, neuer Block vor dem return:

```js
var onCave = this.z >= CM.CaveLevel;
if (onCave) {
    var caveTile = this.caveTileInfoRetriever && this.caveTileInfoRetriever(newPos);
    return !!(caveTile && caveTile.isLand());
}
```

In `app.js` nach Welt-Erstellung:
```js
player.setCaveTileInfoRetriever(CM.TILEACCESS(engine.caveWorld));
```

---

## Phase 4: Dunkelheits-Effekt

### 4a. Neue Renderer-Methode — `renderer.js`

```js
drawCaveDarkness(playerScreenX, playerScreenY, torchActive) {
    var ctx = this.ctxt;
    var w = this.canvas.width;
    var h = this.canvas.height;
    var innerR = torchActive ? 150 : 80;
    var outerR = torchActive ? 260 : 130;

    var grad = ctx.createRadialGradient(
        playerScreenX, playerScreenY, innerR,
        playerScreenX, playerScreenY, outerR
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.96)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
}
```

### 4b. Aufruf in `app.js` (tickndraw) — nach Object-Rendering, vor OSD

```js
if (this.player.z >= CM.CaveLevel) {
    // Spieler-Bildschirmposition berechnen
    var _cx = this.renderer.getScreenWidth() / 2;
    var _cy = this.renderer.getScreenHeight() / 2;
    this.renderer.drawCaveDarkness(_cx, _cy, this.torchActive);
}
```

Der Spieler ist immer in der Bildschirmmitte (Kamera folgt Spieler) → `screenWidth/2, screenHeight/2` ist korrekt.

### 4c. Vorhandenes Torch-System nutzen

`torchActive` / `torchTimer` existieren bereits in `app.js`. Die Fackel wird über das Crafting/Inventory-System aktiviert. Kein Änderungsbedarf am bestehenden Fackel-Code.

---

## Phase 5: CaveCrab-Enemy

### 5a. Neue Klasse — `enemy.js`

```js
CM.CaveCrab = class CaveCrab extends CM.GroundEnemy {
    constructor(location, image) {
        super(location, image);
        this.speed = 1.4;           // schneller als GroundEnemy (0.8)
        this.damageCooldown = 0;
        this.DAMAGE_COOLDOWN_RESET = 40; // aggressiver (GroundEnemy: 60)
        this.z = CM.CaveLevel;
        this.isCaveCrab = true;
    }

    // Blind ohne Fackel: Aggro-Radius von 200 → 50
    getAggroRadius(torchActive) {
        return torchActive ? 200 : 50;
    }

    tick(player, playerMoving, torchActive) {
        if (player == null) return;
        // Nur aktiv wenn Spieler in Höhle
        if (player.z < CM.CaveLevel) return;

        this.playerDist = CM.distance(this.position, player.position);
        this.idleSoundId = CM.Sound.updateSpatialLoop('crab_idle', this.idleSoundId, this.playerDist, 200, 2);

        var aggroR = this.getAggroRadius(torchActive);
        if (this.playerDist < aggroR) {
            var movement = CM.getVector(this.position, player.position, 1);
            var dx = movement.x * this.speed;
            var dy = movement.y * this.speed;

            var moved = false;
            if (this.canMoveTo(dx, dy))     { this.move(dx, dy); moved = true; }
            else if (this.canMoveTo(dx, 0)) { this.move(dx, 0);  moved = true; }
            else if (this.canMoveTo(0, dy)) { this.move(0,  dy); moved = true; }
            this.toggleAnimation(moved);

            if (this.playerDist < 15 && this.damageCooldown === 0) {
                player.hit(1);
                CM.Sound.playAt('crab_attack', this.playerDist, 150);
                this.damageCooldown = this.DAMAGE_COOLDOWN_RESET;
            }
        } else {
            this.toggleAnimation(false);
        }

        if (this.damageCooldown > 0) this.damageCooldown--;
    }
}
```

### 5b. Tile-Retriever für CaveCrab setzen — `algos.js` / `app.js`

CaveCrab braucht `CM.TILEACCESS(caveWorld)` statt `CM.TILEACCESS(world)`:

```js
// In der Cave-Enemy-Spawn-Funktion:
crab.setTileInfoRetriever(CM.TILEACCESS(engine.caveWorld));
```

### 5c. Tick-Aufruf mit `torchActive` — `app.js`

In `tickndraw`, beim Element-Tick-Loop:

```js
this.world.getObjects().forEach(element => {
    if (element.isCaveCrab) {
        element.tick(this.player, playerMoving, this.torchActive);
    } else {
        element.tick(this.player, playerMoving);
    }
});
```

### 5d. Spawn-System für Höhle — `algos.js`

Neue Funktion `CM.ADDENEMYMAKER_CAVE(caveWorld, imagerepo)`:

- Analogie zu `CM.ADDENEMYMAKER`, spawnt pro Chunk 2–3 CaveCrabs
- Wird beim `chunksCachedCallback` der `caveWorld` aufgerufen (wie die Oberfläche)
- Spawn nur auf walkbaren Höhlentiles (`tile.isLand()`)

```js
CM.ADDENEMYMAKER_CAVE = function(caveWorld, imagerepo) {
    function makeCaveCrab(x1, y1, i) {
        var c = caveWorld.getChunkByIndeces(x1, y1);
        if (!c) return;
        var landTiles = c.getTiles().filter(function(t) { return t.isLand() && !t.info.isCaveExit; });
        if (landTiles.length === 0) return;
        var tile = landTiles[Math.floor(CM.rng() * landTiles.length)];

        var key = 'cavecrab' + x1 + '_' + y1 + '_' + i;
        if (caveWorld.getHitablesByKey(key)) return;

        var crab = new CM.CaveCrab(tile.location.clone(), imagerepo.getImage('crab'));
        crab.setTileInfoRetriever(CM.TILEACCESS(caveWorld));
        crab.setRemover(caveWorld.removeObject.bind(caveWorld));
        caveWorld.addObject(crab);
        caveWorld.addHitable(key, crab);
    }

    return function(x, y) {
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                var cx = x + dx, cy = y + dy;
                if (cx < 0 || cy < 0) continue;
                for (var i = 0; i < 3; i++) makeCaveCrab(cx, cy, i);
            }
        }
    };
};
```

---

## Phase 6: Cave-Ressourcen

### 6a. Kristall-Collectable — `objects.js` / `algos.js`

Kein neuer Class-Code nötig — Kristall ist eine standard `CM.Collectable` mit `typeName = "CRYSTAL"`:

```js
new CM.Collectable(pos, imagerepo.getImage('crystal'), 'CRYSTAL', 1, 0.4)
```

Spawn im Cave: neue Funktion `CM.CAVE_COLLECTABLEMAKER(caveWorld, imagerepo)` — analog zu `CM.COLLECTABLEMAKER`, aber:
- Kristalle: `~8% Chance` auf walkbaren Tiles (häufiger als Oberfläche)
- Himmelskarte: einmalig pro Welt (via `CM.skyMapSpawned`-Flag), spawnt nur in einem zufälligen Chunk tief in der Höhle

```js
CM.CAVE_COLLECTABLEMAKER = function(caveWorld, imagerepo) {
    return function(tile) {
        if (!tile.isLand() || tile.info.isCaveExit) return;
        var rand = CM.rng();

        if (rand < 0.08) {
            caveWorld.addObject(
                new CM.Collectable(tile.location.clone().move(10, 10),
                    imagerepo.getImage('crystal'), 'CRYSTAL', 1, 0.4)
            );
        } else if (rand < 0.082 && !CM.skyMapSpawned) {
            CM.skyMapSpawned = true;
            caveWorld.addObject(
                new CM.Collectable(tile.location.clone().move(10, 10),
                    imagerepo.getImage('skymap'), 'SKYMAP', 1, 0.6)
            );
        }
    };
};
```

`CM.skyMapSpawned = false` in `globals.js` hinzufügen.

### 6b. Seltene Truhe — `objects.js`

```js
CM.Chest = class Chest extends CM.Sprite {
    constructor(location, image) {
        super(image, location, CM.CaveLevel, false, 0.5);
        this.interactable = true;
        this.isChest = true;
        this.opened = false;
    }

    open(world, imagerepo) {
        if (this.opened) return null;
        this.opened = true;
        // Zufälliger Loot-Pool
        var loot = [
            { img: 'ammo_10',  type: 'AMMO',   val: 10 },
            { img: 'health_10',type: 'HEALTH',  val: 10 },
            { img: 'coin_10',  type: 'COINS',   val: 20 },
            { img: 'crystal',  type: 'CRYSTAL', val: 3  },
        ];
        var item = loot[Math.floor(CM.rng() * loot.length)];
        return new CM.Collectable(
            this.position.clone().move(5, 5),
            imagerepo.getImage(item.img), item.type, item.val, 0.4
        );
    }
}
```

Spawn: ~1 Truhe pro 5 Chunks tief in der Höhle, nur auf walkbaren Tiles.

Interaktion in `app.js` — im Interact-Key-Handler (E-Taste / F-Taste):

```js
// Prüfe nahe Truhen im caveWorld
if (this.player.z >= CM.CaveLevel) {
    this.caveWorld.getObjects().forEach(function(obj) {
        if (obj.isChest && CM.distance(player.position, obj.position) < 30) {
            var drop = obj.open(self.caveWorld, self.imagerepo);
            if (drop) {
                self.caveWorld.addObject(drop);
                self.notify('Truhe geöffnet!', 90);
            }
        }
    });
}
```

### 6c. Himmelskarte aktiviert Floating Islands

Im `tryCollect()`-Handler in `app.js` — nach bestehender Collection-Logik:

```js
if (collected.getTypeName() === 'SKYMAP') {
    CM.skyMapFound = true;
    this.notify('Himmelskarte gefunden! Floating Islands erscheinen...', 180);
    // Floating Islands werden sichtbar (Idee 1 — alpha oder spawn)
}
```

`CM.skyMapFound = false` in `globals.js`.

### 6d. Inventory / Score für Kristalle — `simulations.js`

```js
CM.Crystals = class Crystals extends CM.Score {
    constructor() { super('CRYSTAL', 0, 0, 99, 1); }
}
```

In `player.js`, `CloudPlayer`-Konstruktor:
```js
this.scores.add(new CM.Crystals());
```

---

## Phase 7: Save/Load

**Datei:** `saveload.js`

### 7a. Save-Version auf v3 bumpen

```js
var STORAGE_KEY = 'clouden_save_v3';
```

### 7b. Cave-State speichern

Im `save()`-Objekt neue Felder ergänzen:

```js
var state = {
    v: 3,
    // ... bestehende Felder ...
    cave: {
        skyMapFound: !!CM.skyMapFound,
        skyMapSpawned: !!CM.skyMapSpawned,
        // Kristalle stecken schon in player.scores → automatisch mitgespeichert
    }
};
```

### 7c. Cave-State laden

Im `load()`:

```js
if (state.cave) {
    CM.skyMapFound   = !!state.cave.skyMapFound;
    CM.skyMapSpawned = !!state.cave.skyMapSpawned;
}
```

### 7d. COLLECTABLE_IMAGE erweitern

```js
var COLLECTABLE_IMAGE = {
    COINS:   'coin_10',
    AMMO:    'ammo_10',
    HEALTH:  'health_10',
    FUEL:    'fuel_10',
    CRYSTAL: 'crystal',   // NEU
    SKYMAP:  'skymap',    // NEU
};
```

---

## Phase 8: Benötigte Assets

| Schlüssel | Datei | Beschreibung |
|---|---|---|
| `tile_cave_floor` | `img/tile_cave_floor.png` | Dunkler Steinfußboden (32×32) |
| `tile_cave_rock` | `img/tile_cave_rock.png` | Undurchdringlicher Felstile (32×32) |
| `tile_cave_entrance` | `img/tile_cave_entrance.png` | Overlay für Oberflächen-Eingang (32×32, transparent) |
| `tile_cave_exit` | `img/tile_cave_exit.png` | Overlay für Höhlen-Ausgang (32×32) |
| `crystal` | `img/crystal.png` | Kristall-Collectible (klein, ~12×16) |
| `skymap` | `img/skymap.png` | Himmelskarte (klein, ~16×20) |
| `chest` | `img/chest.png` | Truhe (32×32, geöffnet/geschlossen als Animationsframes) |

Alle Assets in `imagerepo.js` registrieren:
```js
// In ImageRepo.load() — bestehende Liste erweitern:
{ key: 'tile_cave_floor',    src: 'img/tile_cave_floor.png' },
{ key: 'tile_cave_rock',     src: 'img/tile_cave_rock.png' },
{ key: 'tile_cave_entrance', src: 'img/tile_cave_entrance.png' },
{ key: 'tile_cave_exit',     src: 'img/tile_cave_exit.png' },
{ key: 'crystal',            src: 'img/crystal.png' },
{ key: 'skymap',             src: 'img/skymap.png' },
{ key: 'chest',              src: 'img/chest.png' },
```

---

## Phase 9: Script-Ladereihenfolge (`index.htm`)

Keine neuen Dateien — alle Änderungen in bestehenden Dateien. Ladereihenfolge bleibt:

```
globals.js → imagerepo.js → simulations.js → objects.js → osd.js
→ player.js → enemy.js → algos.js → world.js → app.js
→ renderer.js → onscreendoc.js → utils.js
```

Einzige Abhängigkeit: `CM.CaveLevel` (globals.js) muss vor `enemy.js` und `objects.js` geladen sein — bereits durch bestehende Reihenfolge garantiert.

---

## Umsetzungsreihenfolge (empfohlen)

```
Phase 1  globals.js         CM.CaveLevel, CM.skyMapFound, CM.skyMapSpawned
    ↓
Phase 3a world.js           TileInfo: isCaveEntrance, isCaveExit
    ↓
Phase 3b algos.js           TILECREATOR: Eingänge generieren + Overlay
    ↓
Phase 8  imagerepo.js       Asset-Schlüssel registrieren (Platzhalter-PNGs)
    ↓
Phase 2  algos.js + app.js  CAVE_TILECREATOR + caveWorld-Instanz + Render-Umschaltung
    ↓
Phase 3c/d app.js + player.js  Übergangslogik + Cave-Bewegungskollision
    ↓
Phase 4  renderer.js + app.js  drawCaveDarkness
    ↓
Phase 5  enemy.js + algos.js  CaveCrab + Spawn-System
    ↓
Phase 6  objects.js + algos.js  Kristall, SkyMap, Chest + Spawn
    ↓
Phase 7  saveload.js           Cave-State save/load (v3 bump)
```

---

## Bekannte Risiken & Hinweise

| Risiko | Maßnahme |
|---|---|
| `caveWorld.getScene()` benötigt eigenen `cachedHolder` — sollte funktionieren, da `CM.World` keinen Singleton-State hat | Testen ob beide Welten unabhängig cachen |
| `CM.rng()` ist seeded — Höhle generiert deterministisch aus gleichem Seed, Eingänge und Ausgänge stimmen überein | Reihenfolge der `CM.rng()`-Aufrufe darf sich durch neue Calls nicht verschieben — `CM.CAVE_TILECREATOR` nach Surface-Generierung aufrufen |
| CaveCrab `tick()` braucht `torchActive` als dritten Parameter — bestehende `tick(player, playerMoving)` Signatur wird nur für CaveCrab erweitert | Prüfung via `element.isCaveCrab` im Tick-Loop |
| Save v3 macht alte v2-Saves inkompatibel | `getSavedSeed()` und `load()` mit v2-Fallback, oder migration: falls `state.v === 2` → upgraden ohne cave-Felder |
