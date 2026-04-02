# Spielideen

## Leitidee: Entdeckungsbaum
Fortschritt entsteht durch Ketten: Man findet/craftet A → das schaltet B frei → B führt zu C.
Floating Islands sind ein gutes Beispiel für ein "Endgame-Ziel" an der Spitze so einer Kette.

---

## Idee 1: Floating Islands erst sichtbar nach Fund der Himmelskarte

**Kette:**
1. Spieler baut eine **Fackel** (Holz + Stein) → damit betritt man dunkle Höhlen
2. In einer Höhle (neuer Biom-Typ) liegt eine **Himmelskarte** (Collectible)
3. Erst nach Fund der Karte tauchen Floating Islands auf der Minimap und im Spiel auf — davor sind sie unsichtbar (alpha = 0 oder gar nicht gerendert)

**Gameplay-Wert:** Erkundung und Vorbereitung werden belohnt; die Inseln fühlen sich wie eine echte Entdeckung an.

---

## Idee 2: Craftingsystem — Werkbank (in Blockhütte, bereits vorhanden)

Die Blockhütte enthält bereits eine Werkbank. Diese kann als Crafting-Interface ausgebaut werden:

**Erweiterung:**
An der Werkbank in der Blockhütte craftbar:
   - **Fackel** (Holz + Reed) → ermöglicht Höhlen zu betreten (Idee 3)
   - **Kompass** (Stein + Coins) → zeigt nächste unentdeckte Floating Island auf der Minimap an
   - **Anker** (Holz + Stein) → Blimp kann auf Floating Island als Respawn-Punkt verankert werden
   - **Fernrohr** (Holz + Kristall) → erhöht Sichtweite auf der Minimap dauerhaft

**Voraussetzung:** Spieler muss zuerst eine Blockhütte bauen (Holz + Stein) — damit ist die Werkbank automatisch verfügbar und das Crafting-System hat einen natürlichen Einstiegspunkt.

---

## Idee 3: Höhlen / Untergrund-Ebene

Neue z-Tiefe: CM.CaveLevel (tiefer als GroundLevel).
- Betritt man Höhlen-Eingang (spezielles Tile) sinkt Spieler automatisch auf CaveLevel
- Höhlen sind dunkel — ohne Fackel sieht man nur 80px Radius (radial gradient über Canvas)
- Darin: seltene Ressourcen (Kristalle, Himmelskarte), Fledermauskrebse als neuer Feind
- Ausgang bringt einen zurück auf GroundLevel

---

## Idee 4: Floating Islands als Mini-Biome

Jede Insel hat einen Typ (per RNG beim Generieren):
- **Wald-Insel**: extra Holz, Beeren — ruhig, keine Feinde
- **Ruinen-Insel**: Truhe mit Coins/Ammo, aber ein Dragon nistet dort
- **Schrein-Insel**: interagierbares Objekt → dauerhafter Buff (z.B. +5 max Health)
- **Nest-Insel**: Dragon-Ei — zerstören für Quest-Belohnung, oder stehen lassen...

---

## Idee 5: Questkette (aufbauend auf bestehendem NPC)

NPC gibt stufenweise Quests — die letzten Stufen setzen Fortschritt voraus:
1. Bring mir 5 Holz ✓ (schon vorhanden)
2. Baue eine Werkbank
3. Craft einen Kompass
4. Finde die Himmelskarte in einer Höhle
5. Besuche eine Floating Island und bring mir einen **Himmelsstein** zurück → Belohnung: Blimp-Upgrade (mehr Fuel, mehr HP)

---

## Idee 6: Blimp-Upgrades

An der Werkbank oder auf einer Ruinen-Insel craftbar:
- **Panzerplating** (Stein + Wood): Blimp +10 HP
- **Zusatztank** (Reed + Coins): Blimp-Fuel von 30 → 60
- **Turboschraube** (Himmelsstein): Blimp schneller, weniger Winddrift

---

## Idee 7: Tag-Nacht-Zyklus

- Alle 5–10 Minuten Echtzeit wechselt Lichtstärke (globalAlpha-Overlay auf Canvas)
- Nachts: Feinde aggressiver, Sichtweite reduziert, aber Himmelskarte leuchtet
- Fackeln und Blockhut-Licht halten Dunkel in 150px Radius fern
- Morgens spawnen Berries nach

---

## Idee 8: Wetter / Wind-Events

- Sturm: erhöhter Winddrift für Blimp, Wellen auf Wasser (visuell)
- Nebel: reduzierte Sichtweite, Minimap ausgegraut
- Tailwind-Event: kurze Phase mit Rückenwind → Blimp kostenlos schnell in eine Richtung
- Events sind zeitlich begrenzt, angekündigt via OSD ("Sturm zieht auf...")

---

## Idee 9: Angelangeln / Fishing

- Am Wasserrand mit Reed in Inventory → Aktion "Angeln"
- Minispiel: Balken erscheint, Timing-Button → Fisch landet im Inventory
- Fisch = Nahrung → Health regenerieren (statt sofort, langsam über Zeit)
- Seltener Fang: **Meisterkarte** (alternativer Pfad zur Himmelskarte)

---

## Idee 10: Floatng Island — Fallmechanik

Wenn man vom Rand einer Insel fällt ohne Blimp:
- Spieler fällt frei (z steigt schnell Richtung GroundLevel)
- **Fallschirm**-Item (craftbar) bremst Fall: öffnet sich automatisch, einmalig verwendbar
- Ohne Fallschirm: Schaden beim Aufprall proportional zur Fallhöhe

---

## Idee 11: Multiplayer-Spur / Flaschenposts

Kein echtes Multiplayer, aber asynchron:
- Spieler kann eine **Flaschenpost** schreiben (kurze Nachricht + aktuelle Position)
- Wird beim Speichern an einen Server geschickt
- Andere Spieler finden Flaschen als Collectible am Strand → lesen Nachricht + sehen Markierung auf Minimap wo jemand anderes war

---

