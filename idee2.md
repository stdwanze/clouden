# Implementierungsplan für Idee 2: Craftingsystem — Werkbank in Blockhütte (nur TORCH)

## Übersicht
Idee 2 erweitert die bestehende Blockhütte um ein Crafting-System. Die Werkbank wird aktiviert, sobald der Spieler eine Blockhütte baut (Holz + Stein). An der Werkbank kann folgendes Item gecraftet werden:
- **Fackel** (1 Holz + 1 Reed) → ermöglicht Höhlen zu betreten

## Schritt-für-Schritt Implementierung

### 1. Analyse der aktuellen Codebasis
- **Blockhütte (blockhut.js):** Hat bereits `hasCraftingStation = false;`, wird auf `true` gesetzt, wenn Crafting-Station gebaut wird (3 Holz + 5 Stein).
- **Bestehende Crafting-Funktionalität (app.js):** An der Crafting-Station können bereits Pfeile (2 Holz → +3 Pfeile) und Bogen-Upgrade (2 Holz + 3 Stein → bowLevel++) gecraftet werden. Das Menü zeigt "Craften: Bogen, Pfeile".
- **Inventar (inventory.js):** Vorhanden, unterstützt Item-Typen wie 'WOOD', 'STONE'. Muss erweitert werden um neue Typen ('TORCH', 'COMPASS', 'ANCHOR', 'TELESCOPE', 'REED', 'COINS', 'CRYSTAL').
- **Globale Konstanten (globals.js):** Neue Item-Typen hinzufügen.
- **Spieler-Interaktion (player.js/app.js):** Crafting erfolgt über Menü in der Nähe der Blockhütte.
- **Minimap und Effekte:** Implementierung der Item-Effekte (z.B. in minimap.js, player.js).

### 2. Neue Item-Typen definieren
- In `globals.js` oder neuer Datei `items.js` Konstanten für neue Items hinzufügen:
  - `CM.ItemType.TORCH = 'TORCH';`
  - `CM.ItemType.REED = 'REED';` (falls nicht vorhanden)
- Bilder für Items in `imagerepo.js` hinzufügen (z.B. 'item_torch' usw.).

### 3. Blockhütte erweitern
- In `blockhut.js`: Keine Änderung nötig, da `hasCraftingStation` bereits korrekt gesetzt wird.
- In `app.js`: Das Crafting-Menü ist bereits vorhanden. Erweitere die bestehenden Methoden `tryBowUpgrade` und `tryCraftArrows` um neue Crafting-Optionen für die Items aus Idee 2.

### 4. Crafting-UI erweitern
- Das Crafting-Menü in `app.js` (unter "Craften") zeigt bereits "Bogen, Pfeile". Erweitere es zu "Bogen, Pfeile, Fackel" oder füge separate Option hinzu.
- Neue Methode in `app.js` hinzufügen:
  - `tryCraftTorch()`: 1 WOOD + 1 REED → TORCH
- Im Menü neuen Eintrag hinzufügen, ähnlich wie für Bogen und Pfeile.

### 5. Crafting-Logik implementieren
- Erweitere `app.js`: Füge neue Methode `tryCraftTorch` hinzu, ähnlich wie `tryBowUpgrade` und `tryCraftArrows`.
- Methode prüft, ob 1 WOOD und 1 REED im Inventar vorhanden sind, entfernt sie und fügt TORCH hinzu.
- Integration mit `inventory.js`: Nutze bestehende Logik zum Entfernen von Items (wie in `tryBowUpgrade`).

### 6. Effekte der gecrafteten Items implementieren
- **Fackel (TORCH):** In `player.js` oder neuer Datei `lighting.js`: TORCH kann aktiviert werden (z.B. über Inventar oder OSD), erhöht Sichtradius in Höhlen für 1 Minute Brenndauer. Nach Ablauf wird TORCH verbraucht (aus Inventar entfernt) oder deaktiviert.

### 7. Integration und Spieler-Interaktion
- In `app.js`: Erweitere das Crafting-Menü, um die neue Option für TORCH anzuzeigen.
- Stelle sicher, dass TORCH ins Inventar hinzugefügt werden kann (erweitere `inventory.js` um `addItem` für TORCH).
- Erweitere `inventory.js`: Füge Selektionsmechanismus hinzu – gelber Rand um ausgewählten Slot, navigierbar mit Pfeiltasten (links/rechts/oben/unten) und Gamepad-Stick/D-Pad (z.B. links/rechts/oben/unten mit Gamepad). 
- Füge Interaktion hinzu, um TORCH zu aktivieren: Im Inventar selektierten Slot mit Enter/Space bzw. Gamepad-Button (z.B. A/X) aktivieren (z.B. Fackel anzünden, startet Timer).
- Implementiere Timer für 1 Minute Brenndauer: Nach Aktivierung startet Timer, erhöht Sichtradius, nach 1 Minute entfernt TORCH aus Inventar.
- OSD-Nachrichten für Erfolg/Fehler beim Craften und Aktivieren der Fackel.

### 8. Tests schreiben
- In `tests/`: Erweitere bestehende Tests oder füge neue hinzu für `app.test.js` und `inventory.test.js`:
  - Teste neue Crafting-Methode `tryCraftTorch`.
  - Teste Inventar-Selektion (Pfeiltasten-Navigation, gelber Rand).
  - Teste TORCH-Aktivierung und Brenndauer (Timer für 1 Minute, Sichtradius-Erhöhung, Entfernung aus Inventar).
  - Integrationstests mit Inventar und Blockhütte.

### 9. Validierung und Debugging
- Nach jeder Änderung: `npm run build` und Tests laufen lassen.
- Manuelle Tests: Baue Blockhütte, sammle Ressourcen, crafte Items, teste Effekte.
- Stelle sicher, dass keine bestehende Funktionalität gebrochen wird.

### 10. Dokumentation und README aktualisieren
- Aktualisiere `README.md` mit neuer Crafting-Funktionalität.
- Kommentare im Code hinzufügen.

## Risiken und Annahmen
- Annahme: Ressource 'REED' ist bereits im Spiel oder wird hinzugefügt.
- Risiko: Timer-Implementierung und Input-Handling für Inventar-Selektion könnten komplex sein; nutze bestehende Timer- und Input-Logik im Spiel.
- Zeitaufwand: 1-2 Tage für Implementierung, abhängig von bestehender Codebasis.

## Abhängigkeiten
- Idee 3 (Höhlen) für Fackel-Effekt.
- Stelle sicher, dass Blockhütte-Bau funktioniert (bereits vorhanden).