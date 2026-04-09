# Idee 4: Floating Islands als Mini-Biome — Umsetzungsspec

## Überblick

Jede der 4 bestehenden Floating Islands erhält beim Generieren einen zufälligen Biom-Typ.
Der Typ steuert Optik, Ressourcen, Feinde und interaktive Objekte.

| Typ | Kennzeichen | Feinde | Besonderheit |
|---|---|---|---|
| `FOREST` | Wald-Insel | keine | Holz- & Beerenbäume |
| `RUINS` | Ruinen-Insel | 1 Dragon auf der Insel | Truhe mit Loot |
| `SHRINE` | Schrein-Insel | keine | Schrein → dauerhafter Buff |
| `NEST` | Nest-Insel | 1–2 Dragons (patrouillierende Wächter) | Dragon-Ei |

---

## Architektur

```
CM.FloatingIsland
  └── this.biomeType  ← NEU: 'FOREST' | 'RUINS' | 'SHRINE' | 'NEST'
  └── this.biomeReady ← NEU: false bis populate() aufgerufen
  └── populate(world, imagerepo) ← NEU: spawnt Insel-Objekte

app.js init()
  └── jede Insel bekommt nach Erstellung populate(world, imagerepo) aufgerufen
```

---

## Phase 1: FloatingIsland erweitern

**Datei:** `floatingisland.js`

### 1a. Biom-Typ zuweisen

Im Konstruktor, nach `generateShape()`:

```js
var BIOME_TYPES = ['FOREST', 'RUINS', 'SHRINE', 'NEST'];
this.biomeType = BIOME_TYPES[Math.floor(CM.rng() * BIOME_TYPES.length)];
this.biomeReady = false;
```

### 1b. Biom-Optik (Tile-Farbe / Overlay)

In `_drawTile(renderer, ctx, wx, wy, hasBelow)` — die Hintergrundfarbe der prozeduralen Tiles
wird je nach `this.biomeType` variiert (nur wenn kein `tileImage` vorhanden):

```js
var biomeColor = {
    FOREST: ['#3a7a2a', '#2e6020', '#4a8a3a'],
    RUINS:  ['#7a7060', '#5a5040', '#8a8070'],
    SHRINE: ['#4a6a9a', '#3a5a8a', '#5a7aaa'],
    NEST:   ['#7a5a30', '#6a4a20', '#8a6a40'],
}[this.biomeType] || ['#3a7a2a', '#2e6020', '#4a8a3a'];
// Zufallsauswahl aus drei Varianten pro Tile via (wx*7+wy*13) % 3
```

---

## Phase 2: populate() Methode

**Datei:** `floatingisland.js`

Neue Methode `populate(world, imagerepo)` — wird einmalig nach der Welterstellung aufgerufen.
Spawnt Ressourcen und Feinde je nach Biom-Typ auf walkbaren Insel-Tiles.

```js
populate(world, imagerepo) {
    if (this.biomeReady) return;
    this.biomeReady = true;
    var self = this;
    var T = this.TILE;

    // Alle walkbaren Insel-Tile-Mittelpunkte sammeln
    var positions = [];
    for (var row = 0; row < this.rows; row++) {
        for (var col = 0; col < this.cols; col++) {
            if (!this.tiles[row][col]) continue;
            positions.push(new CM.Point(
                this.position.x + col * T + T / 2,
                this.position.y + row * T + T / 2
            ));
        }
    }
    if (positions.length === 0) return;

    function pick() {
        return positions[Math.floor(CM.rng() * positions.length)];
    }

    switch (this.biomeType) {
        case 'FOREST':  self._populateForest(world, imagerepo, positions, pick); break;
        case 'RUINS':   self._populateRuins(world, imagerepo, positions, pick);  break;
        case 'SHRINE':  self._populateShrine(world, imagerepo, pick);            break;
        case 'NEST':    self._populateNest(world, imagerepo, pick);              break;
    }
}
```

---

## Phase 3: Biom-Implementierungen

### 3a. FOREST — Wald-Insel

```js
_populateForest(world, imagerepo, positions, pick) {
    // 3–5 Holz-Mineables
    var woodCount = 3 + Math.floor(CM.rng() * 3);
    for (var i = 0; i < woodCount; i++) {
        var m = new CM.Mineable(pick(), 'WOOD', imagerepo.getImage('mineable_tree'));
        m.setRemover(world.removeObject.bind(world));
        world.addObject(m);
    }
    // 2–3 Beerenbüsche (rot oder blau)
    var berryCount = 2 + Math.floor(CM.rng() * 2);
    for (var j = 0; j < berryCount; j++) {
        var type = CM.rng() < 0.5 ? 'BERRY_RED' : 'BERRY_BLUE';
        var b = new CM.BerryBush(pick(), type);
        b.setRemover(world.removeObject.bind(world));
        world.addObject(b);
    }
    // Keine Feinde
}
```

**Neue Assets:** keine — `mineable_tree`, `berry_red_inventory` bereits vorhanden.

---

### 3b. RUINS — Ruinen-Insel

```js
_populateRuins(world, imagerepo, positions, pick) {
    // 1 Truhe (CM.Chest) mit Coins/Ammo-Loot
    var chest = new CM.IslandChest(pick(), imagerepo.getImage('chest'));
    chest.setRemover(world.removeObject.bind(world));
    world.addObject(chest);

    // 1 Dragon, der die Insel bewacht (patrouillierende Wächter-KI)
    var dragonPos = pick();
    var dragon = new CM.IslandDragon(dragonPos, imagerepo.getImage('dragon_small'), this);
    dragon.setFireBallCreator(CM.FireBallCreator(world, imagerepo));
    dragon.setRemover(world.removeObject.bind(world));
    dragon.setScarecrowGetter(function() {
        return world.getObjects().filter(function(o) { return o.isScarecrow; });
    });
    world.addObject(dragon);
    world.addHitable('island_dragon_ruins_' + dragonPos.x, dragon);
}
```

**CM.IslandChest** — Subklasse von CM.Chest, identisch aber mit `z = CM.FloatLevel` statt `CM.CaveLevel`:
```js
CM.IslandChest = class IslandChest extends CM.Chest {
    constructor(location, image) {
        super(location, image);
        this.z = CM.FloatLevel;
    }
    open(_world, imagerepo) {
        if (this.opened) return null;
        this.opened = true;
        var lootPool = [
            { img: 'coin_10',   type: 'COINS', val: 30 },
            { img: 'coin_10',   type: 'COINS', val: 50 },
            { img: 'ammo_10',   type: 'AMMO',  val: 10 },
            { img: 'health_10', type: 'HEALTH', val: 5 },
        ];
        var item = lootPool[Math.floor(CM.rng() * lootPool.length)];
        return new CM.Collectable(
            this.position.clone().move(5, 5),
            imagerepo.getImage(item.img), item.type, item.val, 0.4
        );
    }
}
```

---

### 3c. SHRINE — Schrein-Insel

```js
_populateShrine(world, imagerepo, pick) {
    var shrine = new CM.Shrine(pick(), imagerepo.getImage('shrine'));
    shrine.setRemover(world.removeObject.bind(world));
    world.addObject(shrine);
}
```

**CM.Shrine** — neue Klasse in `objects.js`:

```js
CM.Shrine = class Shrine extends CM.Sprite {
    constructor(location, image) {
        super(image, location, CM.FloatLevel, false, 0.7);
        this.interactable = true;
        this.isShrine = true;
        this.used = false;
        this.buffType = null; // gesetzt beim Platzieren in populate()
    }
}
```

**Buff-Typen** (zufällig beim populate(), 1 aus 3):

| Buff | Effekt |
|---|---|
| `MAX_HEALTH` | `player.scores.get('HEALTH').max += 3` |
| `MAX_AMMO`   | `player.scores.get('AMMO').max += 5`   |
| `BOW_LEVEL`  | `player.bowLevel++` (wie Bogenupgrade)  |

**Buff-Zuweisung in populate:**
```js
var buffTypes = ['MAX_HEALTH', 'MAX_AMMO', 'BOW_LEVEL'];
shrine.buffType = buffTypes[Math.floor(CM.rng() * buffTypes.length)];
```

**Interaktion** in `app.js` — analog zu NPC (F-Taste, Nähe < 30px):
```js
tryIslandInteract() {
    var obj = this.world.getNearestObject(this.player.position, 'isShrine');
    // ACHTUNG: getNearestObject nimmt Property-Key → isShrine = true ✓
    if (!obj || CM.distance(this.player.position, obj.position) > 40) return;
    if (obj.used) { this.notify('Schrein bereits aktiviert.', 90); return; }
    obj.used = true;
    var player = this.player;
    switch (obj.buffType) {
        case 'MAX_HEALTH':
            player.scores.get('HEALTH').max += 3;
            this.notify('+3 max. Leben! (permanent)', 180);
            break;
        case 'MAX_AMMO':
            player.scores.get('AMMO').max += 5;
            this.notify('+5 max. Pfeile! (permanent)', 180);
            break;
        case 'BOW_LEVEL':
            player.bowLevel++;
            this.notify('Bogen gesegnet! +' + (4 + player.bowLevel) + ' Schaden', 180);
            break;
    }
    CM.SaveLoad.save(this);
}
```

Aufruf im `handleInteractions` switch, case `"70"` (F-Taste), neben `tryNPCInteract`:
```js
case "70":
    if (this.player.isMounted()) { /* sail */ }
    else { this.tryNPCInteract(); this.tryIslandInteract(); }
    break;
```

---

### 3d. NEST — Nest-Insel

```js
_populateNest(world, imagerepo, pick) {
    // Dragon-Ei
    var egg = new CM.DragonEgg(pick(), imagerepo.getImage('dragon_egg'));
    egg.setRemover(world.removeObject.bind(world));
    world.addObject(egg);
    world.addHitable('dragon_egg_' + egg.position.x, egg);

    // 1–2 Wächter-Dragons
    var guardCount = 1 + Math.floor(CM.rng() * 2);
    for (var i = 0; i < guardCount; i++) {
        var dragon = new CM.IslandDragon(pick(), imagerepo.getImage('dragon_small'), this);
        dragon.setFireBallCreator(CM.FireBallCreator(world, imagerepo));
        dragon.setRemover(world.removeObject.bind(world));
        dragon.setScarecrowGetter(function() {
            return world.getObjects().filter(function(o) { return o.isScarecrow; });
        });
        world.addObject(dragon);
        world.addHitable('island_dragon_nest_' + i + '_' + dragon.position.x, dragon);
    }
}
```

**CM.DragonEgg** — neue Klasse in `objects.js`:

```js
CM.DragonEgg = class DragonEgg extends CM.Sprite {
    constructor(location, image) {
        super(image, location, CM.FloatLevel, false, 0.6);
        this.isEgg = true;
        this.mineable = true;        // per E-Taste zerstörbar
        this.hitsRequired = 3;
        this.hitsReceived = 0;
        this.hitFlash = 0;
        this.resourceType = 'EGG';  // wird als Questitem ins Inventory gepackt
        this.classType = 'DragonEgg';
    }
    mine() {
        this.hitsReceived++;
        this.hitFlash = 8;
        CM.Sound.play('mine_stone'); // gleicher Sound wie Stein
        if (this.hitsReceived >= this.hitsRequired) {
            if (this.remove) this.remove(this);
            return true;
        }
        return false;
    }
    tick() { if (this.hitFlash > 0) this.hitFlash--; }
}
```

Ei landet über `tryMine()` im Inventory als `type: 'EGG'`.
Kann später als Quest-Item abgegeben werden (Idee 5).

---

## Phase 4: CM.IslandDragon — Wächter-KI

**Datei:** `enemy.js`

Normaler Dragon mit einer Erweiterung: Patrouilliert um seine Heimatinsel, verlässt sie nie weit.

```js
CM.IslandDragon = class IslandDragon extends CM.Dragon {
    constructor(location, image, island) {
        super(location, image);
        this.homeIsland = island;           // Referenz zur FloatingIsland
        this.PATROL_RADIUS = 180;           // max. Abstand vom Insel-Mittelpunkt
    }

    tick(player) {
        // Bleib in der Nähe der Insel
        if (this.homeIsland) {
            var home = this.homeIsland.getMidPoint();
            var distFromHome = CM.distance(this.position, home);
            if (distFromHome > this.PATROL_RADIUS) {
                // Zurück zur Insel
                var back = CM.getVector(this.position, home, 1);
                super.move(back.x * this.speed * 2, back.y * this.speed * 2); // schneller zurück
                return;
            }
        }
        super.tick(player);
    }
}
```

---

## Phase 5: Assets

| Schlüssel | Datei | Beschreibung |
|---|---|---|
| `shrine` | `img/shrine.png` | Stein-Sockel mit Leuchtkristall (32×32) |
| `dragon_egg` | `img/dragon_egg.png` | Großes, rotgesprenkeltes Ei (32×32) |

Beide werden per Python-Script generiert (ähnlich wie cave-assets).

**Registrierung in `imagerepo.js`:**
```js
this.register("img/shrine.png",     "shrine");
this.register("img/dragon_egg.png", "dragon_egg");
```

---

## Phase 6: Chest-Interaktion auf Inseln

In `tryCollect()` in `app.js` — analog zur Cave-Truhe, aber für `world` (nicht `caveWorld`):

```js
// Island chest — world-Ebene, FloatLevel
this.world.getObjects().forEach(function(obj) {
    if (obj.isChest && !obj.opened &&
        Math.abs(self.player.z - CM.FloatLevel) <= 0.25 &&
        CM.distance(self.player.position, obj.position) < 30) {
        var drop = obj.open(null, self.imagerepo);
        if (drop) { drop.z = CM.FloatLevel; self.world.addObject(drop); }
        self.notify('Truhe ge\u00f6ffnet!', 90);
        CM.Sound.play('collect');
    }
});
```

---

## Phase 7: Save/Load

**Datei:** `saveload.js`

### 7a. Schrein-Zustand (used + buffType) speichern

Im `save()` — Schreins aus `world.getObjects()` sammeln:
```js
var shrines = [];
engine.world.getObjects().forEach(function(obj) {
    if (obj.isShrine) {
        shrines.push({ x: obj.position.x, y: obj.position.y, used: obj.used, buffType: obj.buffType });
    }
});
// state.shrines = shrines;
```

Im `load()`:
```js
var shrineObjects = engine.world.getObjects().filter(function(o) { return o.isShrine; });
(state.shrines || []).forEach(function(s, i) {
    if (shrineObjects[i]) {
        shrineObjects[i].used = !!s.used;
        shrineObjects[i].buffType = s.buffType;
    }
});
// Buff-Werte auf Player anwenden wenn used = true (werden beim Load re-applied)
```

### 7b. Player-Max-Werte speichern

`player.scores.get('HEALTH').max` und `.get('AMMO').max` im bestehenden `scores`-Block:
```js
// In save():
scores[s.getName() + '_max'] = s.getMax();
// In load():
if (savedScores[s.getName() + '_max'] !== undefined) s.max = savedScores[s.getName() + '_max'];
```

### 7c. Dragon-Ei im Inventory

`'EGG'` erscheint automatisch in `inventory.slots` — wird über normalen Inventory-Save mitgespeichert.

Kein `COLLECTABLE_IMAGE`-Eintrag nötig (Ei ist kein Collectable-Objekt, sondern Inventory-Item).

---

## Implementierungsreihenfolge

```
Phase 5  imagerepo.js + Python-Assets   shrine.png, dragon_egg.png
    ↓
Phase 1  floatingisland.js              biomeType + _drawTile-Farben
    ↓
Phase 3a objects.js                     CM.IslandChest, CM.Shrine, CM.DragonEgg
    ↓
Phase 4  enemy.js                       CM.IslandDragon
    ↓
Phase 2  floatingisland.js              populate() + _populateXxx()
    ↓
Phase 3c app.js                         tryIslandInteract() + F-Taste
    ↓
Phase 6  app.js                         Island-Chest in tryCollect()
    ↓
Phase 7  saveload.js                    Schrein-State + max-Werte
    ↓
Phase 3b app.js init()                  populate() Aufruf nach Island-Erstellung
```

---

## Bekannte Risiken

| Risiko | Maßnahme |
|---|---|
| `CM.rng()` in biomeType+populate verändert Seed-Reihenfolge | populate() nach allen anderen World-Generierungen aufrufen |
| Dragon z-Level: Dragon hat `z = CM.SkyLevel+1 = 2.75`, Insel ist bei `CM.FloatLevel = 1.85` — FireBalls treffen Spieler (z 1.85) wenn `Math.abs(2.75 - 1.85) < 0.6` → false (= 0.9 > 0.6): Drachen auf Inseln schaden nicht! | `CM.IslandDragon` z-Level anpassen: `this.z = CM.FloatLevel` |
| Schrein-Buff wird bei jedem Load neu applied wenn `used = true` | Only apply-on-first-activation; beim Load nur `used` + `max` als gespeicherten Wert restoren, keinen zweiten Buff geben |
| Dragon-Ei landet als `type: 'EGG'` im Inventory — kein Bild registriert | `item_egg` in imagerepo registrieren, oder Inventory zeigt Fallback-Text (bereits unterstützt) |
