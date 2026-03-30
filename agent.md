# Rendering-Erkenntnisse (clouden)

## Koordinatensystem

Alle Weltkoordinaten werden über `renderer.drawRectangleZ(x, y, w, h, color, z)` gerendert.
Die Bildschirmposition ergibt sich aus:

```
screenX = (worldX - player.x) * z + canvas.width/2
screenY = (worldY - player.y) * z + canvas.height/2
```

- `z` ist der **eigene Z-Wert des Objekts** (nicht der des Spielers)
- `CM.GroundLevel = 2.5`, `CM.SkyLevel = 1.75`
- Objekte mit **höherem z** erscheinen größer und weiter vom Zentrum entfernt (Bodennähe)
- Objekte mit **niedrigerem z** erscheinen kleiner und näher am Zentrum (Höhe/Himmel)

Der Zoom-Wert des Renderers (`renderer.zoom = player.z`) beeinflusst **nur** Objekte,
die ohne explizites z gezeichnet werden (z.B. `drawImage`, `drawImageZ`).
`drawRectangleZ` ignoriert `renderer.zoom` und verwendet immer das übergebene z.

### Regel: Bodenobjekte müssen `renderer.zoom` übergeben

Bodenobjekte (NPC, Blockhut, Vogelscheuche, Mineable, Reed, BerryBush) **dürfen nicht**
`this.z` (= GroundLevel = 2.5) als z-Parameter übergeben, sondern müssen `renderer.zoom` nutzen:

```js
// FALSCH — skaliert nicht mit dem Spieler-Zoom:
var z = this.z;  // immer 2.5, auch wenn Spieler in der Luft ist

// RICHTIG — skaliert mit dem Spieler:
var z = renderer.zoom;  // folgt player.z (2.5 am Boden → 1.75 in der Luft)
```

**Warum:** Tiles werden via `drawTile` → `translateAndZoom()` ohne explizites z gezeichnet,
nutzen also automatisch `renderer.zoom`. Würde ein Bodenobjekt mit `z = 2.5` gezeichnet
während `renderer.zoom = 1.75` (Spieler fliegt), erscheint es falsch skaliert und verschoben
relativ zur Umgebung — visuell als "Bewegung" wahrnehmbar.

**Testmuster** (siehe `mineable.test.js`, `reed.test.js`):
```js
renderer.zoom = 1.0; // sky zoom simulieren
const spy = jest.spyOn(renderer, 'drawRectangleZ');
obj.draw(renderer);
spy.mock.calls.forEach(call => expect(call[5]).toBe(1.0)); // 6. Arg = z
```

## Viewport

```
renderer.viewport = (player.position.x - canvas.width/2,
                     player.position.y - canvas.height/2)
```

Der Viewport folgt ausschließlich `player.position.x/y` — **nicht** `player.z`.
Aufsteigen/Absteigen (z-Änderung) bewegt den Viewport **nicht**.

## Tick-/Draw-Trennung (wichtig!)

**Falsch (erzeugt 1-Frame-Lag):**
```
1. updatePos(player.position)   ← Viewport gesetzt
2. handleMove()                 ← Spieler bewegt sich
3. blimp.tick() → wind → player.move()   ← Spieler bewegt sich NOCHMAL
4. draw(objects)                ← gezeichnet mit altem Viewport → Boot "zittert"
```

**Richtig (seit Fix):**
```
1. handleMove()
2. blimp.tick() → wind → player.move()
3. player.tick()
4. updatePos(player.position)   ← Viewport NACH aller Bewegung aktualisieren
5. draw(world + objects + player)
```

Erst wenn alle Ticks abgeschlossen sind, wird der Viewport aktualisiert.
So sind alle Objekte konsistent relativ zur finalen Spielerposition gerendert.

## Statische vs. Z-skalierte Objekte

| Methode              | Zoom-Quelle      | Verwendung                        |
|----------------------|------------------|-----------------------------------|
| `drawRectangleZ`     | übergebenes z    | Spielwelt — Bodenobjekte übergeben `renderer.zoom` |
| `drawRectangleStatic`| keiner           | UI, Overlays, Inventar            |
| `drawImage`          | `renderer.zoom`  | Sprites (nicht gemountet)         |
| `drawImageZ`         | `renderer.zoom` für Position, eigenes z für Größe | Sprites (gemountet, z.B. Blimp) |

## Bau-System-Muster

Neues Gebäude hinzufügen erfordert immer diese 4 Stellen:

1. **`src/<name>.js`** — Klasse extends `CM.MoveableObject`, `tick(){}`, `draw(renderer)` mit `renderer.zoom`
2. **`getBuildItems()`** in `app.js` — Eintrag mit `id`, `name`, `cost`, `build`-Callback, `drawPict`
3. **`tryBuild<Name>()`** in `app.js` — Ressourcen prüfen/abziehen, `world.addObject()`
4. **`index.htm`** — `<script>`-Tag vor `vogelscheuche.js` einfügen

Gebäude die **keinen Spielstand auslösen sollen** (temporäre Objekte): kein `CM.SaveLoad.save()` in `tryBuild*` aufrufen und nichts in `saveload.js` eintragen.

Gebäude mit **zweistufigem Bau** (Vorschau → Bestätigung): `buildMenuOpen` → `<name>PlacementMode` im Constructor initialisieren, in `handleInteractions` vor dem `buildMenuOpen`-Block behandeln.

## player.direction

`player.direction` (ein `CM.Point`) hält den **zuletzt gedrückten Bewegungsvektor** — wird in `player.move()` gesetzt sobald `x !== 0 || y !== 0`. Startwert: `new CM.Point(6, 0)` (rechts).

Nützlich um die Blickrichtung/Laufrichtung für Platzierungslogik abzufragen:
```js
var vertical = Math.abs(player.direction.y) > Math.abs(player.direction.x);
var dx = Math.sign(player.direction.x); // -1, 0, oder 1
```

## Bekannte Eigenheiten

- Blimp gezeichnet mit `drawImageZ(... z=3)` hardcoded — **nicht** der echte z-Wert des Blimps.
  Position nutzt `renderer.zoom` (= player.z); da blimp.x ≈ player.x bleibt er zentriert.
- Wind (`-0.01 px/frame`) wirkt nur wenn `blimp.z < GroundLevel` 