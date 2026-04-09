# Idee 5: Questkette — Umsetzungsspec

## Überblick

Der NPC erhält eine 5-stufige Questreihe, die alle bisherigen Systeme verknüpft.
Jede Stufe setzt den Fortschritt der vorherigen voraus.

| # | Text | Bedingung | Belohnung |
|---|---|---|---|
| 0 | Bringe mir 15 Holz! | `inventory: WOOD ×15` | +50 Münzen |
| 1 | Baue eine Werkbank! | Blockhütte mit `hasCraftingStation = true` | +5 Leben +10 Pfeile |
| 2 | Craft einen Kompass! | `inventory: COMPASS ×1` | +30 Münzen |
| 3 | Finde die Himmelskarte! | `CM.skyMapFound === true` | +50 Münzen |
| 4 | Bring mir einen Himmelsstein! | `inventory: EGG ×1` (Dragon-Ei von NEST-Insel) | Blimp +30 Fuel-Kapazität |

**Verbindung Himmelsstein ↔ Dragon-Ei:** Das Dragon-Ei (`resourceType: 'EGG'`) aus dem NEST-Biom
(Idee 4) landet bereits als Inventory-Item. Es wird direkt als "Himmelsstein" des Händlers akzeptiert —
kein neues Item nötig.

---

## Architektur

```
Quest-Typen:
  resource-Quest  { resource, amount, text, rewardText, reward }
                  → normaler Inventory-Check (wie bisher)
  check-Quest     { check, text, rewardText, reward }
                  → prüft Weltzustand, verbraucht kein Item

Neue Hilfsmethoden in app.js:
  _checkQuestCondition(check)     → bool
  _applyQuestReward(reward, npc)  → void
  _applyBlimpUpgrade(upgrade)     → void
```

---

## Phase 1: NPC-Quests ersetzen

**Datei:** `npc.js`

Die 5 bisherigen Quests werden durch die neue Kette ersetzt.
Das `check`-Feld markiert Weltzustands-Quests (kein Inventory-Verbrauch):

```js
this.quests = [
    {
        resource: 'WOOD', amount: 15,
        text: 'Bringe mir 15 Holz!',
        rewardText: '+50 M\u00fcnzen',
        reward: { coins: 50 },
    },
    {
        check: 'CRAFTING_STATION',
        text: 'Baue eine Werkbank in deiner Blockh\u00fctte! (H \u2192 Ausbauen)',
        rewardText: '+5 Leben + 10 Pfeile',
        reward: { health: 5, ammo: 10 },
    },
    {
        resource: 'COMPASS', amount: 1,
        text: 'Craft einen Kompass an der Werkbank! (1 Stein + 3 Kristalle)',
        rewardText: '+30 M\u00fcnzen',
        reward: { coins: 30 },
    },
    {
        check: 'SKYMAP',
        text: 'Finde die Himmelskarte in einer H\u00f6hle!',
        rewardText: '+50 M\u00fcnzen',
        reward: { coins: 50 },
    },
    {
        resource: 'EGG', amount: 1,
        text: 'Bring mir einen Himmelsstein von einer Floating Island!',
        rewardText: 'Blimp-Upgrade: +30 Fuel-Kapazit\u00e4t!',
        reward: { blimpUpgrade: { fuelMax: 30 } },
    },
];
```

---

## Phase 2: tryNPCInteract() erweitern

**Datei:** `app.js`

### 2a. Annehmen — check-Quests zeigen sofort ob erfüllt

```js
if (!npc.questAccepted) {
    npc.questAccepted = true;
    var alreadyMet = quest.check && this._checkQuestCondition(quest.check);
    var suffix = alreadyMet ? ' (bereits erf\u00fcllt — nochmal F dr\u00fccken!)' : '';
    this.notify('Auftrag angenommen: ' + quest.text + suffix, 200);
    return;
}
```

### 2b. Einlösen — check-Quest vs. resource-Quest

Vor dem bisherigen `var slots = ...`-Block:

```js
// check-Quest (kein Inventory-Verbrauch)
if (quest.check) {
    if (!this._checkQuestCondition(quest.check)) {
        this.notify('Noch nicht erf\u00fcllt: ' + quest.text, 150);
        return;
    }
    this._applyQuestReward(quest, npc);
    return;
}
```

Der bisherige Inventory-Block bleibt für resource-Quests erhalten, ruft am Ende aber
`_applyQuestReward()` auf (anstatt die Reward-Logik inline zu haben):

```js
// resource-Quest — Inventory-Check wie bisher
var slots = this.inventory.slots;
var si = slots.findIndex(function(s) { return s && s.type === quest.resource; });
var have = si >= 0 ? slots[si].count : 0;
if (have < quest.amount) {
    this.notify(quest.resource + ': ' + have + '/' + quest.amount + ' \u2014 noch nicht fertig', 150);
    return;
}
slots[si].count -= quest.amount;
if (slots[si].count === 0) slots[si] = null;
this._applyQuestReward(quest, npc);
```

### 2c. Hilfsmethoden

```js
_checkQuestCondition(check) {
    if (check === 'CRAFTING_STATION') {
        return this.world.getObjects().some(function(o) { return o.hasCraftingStation; });
    }
    if (check === 'SKYMAP') {
        return CM.skyMapFound;
    }
    return false;
}

_applyQuestReward(quest, npc) {
    var r = quest.reward;
    if (r.coins)        this.player.getScores().get('COINS').up(r.coins);
    if (r.ammo)         this.player.getScores().get('AMMO').up(r.ammo);
    if (r.health)       this.player.getScores().get('HEALTH').up(r.health);
    if (r.blimpUpgrade) this._applyBlimpUpgrade(r.blimpUpgrade);
    npc.questIndex++;
    npc.questAccepted = false;
    this.notify('Auftrag erf\u00fcllt! Belohnung: ' + quest.rewardText, 200);
    CM.SaveLoad.save(this);
}

_applyBlimpUpgrade(upgrade) {
    if (upgrade.fuelMax) {
        this.blimpFuelBonus = (this.blimpFuelBonus || 0) + upgrade.fuelMax;
        var blimp = this.world.getObjects().find(function(o) {
            return o.scores && o.scores.get('FUEL');
        });
        if (blimp) blimp.scores.get('FUEL').max += upgrade.fuelMax;
    }
}
```

---

## Phase 3: Kompass craften

**Datei:** `app.js`

### 3a. tryCraftCompass()

```js
tryCraftCompass() {
    if (!this.nearbyHut || !this.nearbyHut.hasCraftingStation) return;
    var slots = this.inventory.slots;
    var si = slots.findIndex(function(s) { return s && s.type === 'STONE'; });
    var stoneHave = si >= 0 ? slots[si].count : 0;
    var crystalScore = this.player.getScores().get('CRYSTAL');
    var crystalHave = crystalScore ? crystalScore.getScore() : 0;
    if (stoneHave < 1 || crystalHave < 3) {
        var missing = [];
        if (stoneHave  < 1) missing.push('1 Stein (vorhanden: '    + stoneHave  + ')');
        if (crystalHave < 3) missing.push('3 Kristalle (vorhanden: ' + crystalHave + ')');
        this.notify('Ben\u00f6tigt: ' + missing.join(' + '), 180);
        return;
    }
    slots[si].count -= 1;
    if (slots[si].count === 0) slots[si] = null;
    crystalScore.reduce(3);
    this.inventory.addItem('COMPASS');
    CM.SaveLoad.save(this);
    this.notify('Kompass hergestellt!', 120);
}
```

### 3b. Eintrag in getHutItems('craft')

Neuer Eintrag nach "Lampe herstellen":

```js
{
    name: 'Kompass herstellen',
    sub: '1 Stein + 3 Kristalle',
    disabled: !hut.hasCraftingStation,
    action: function() { self.tryCraftCompass(); },
    drawPict: function(ctx, cx, cy) {
        // Äußerer Ring
        ctx.strokeStyle = '#8B5E3C'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.stroke();
        // Innerer Punkt
        ctx.fillStyle = '#cc2222';
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
        // N-Nadel (rot)
        ctx.fillStyle = '#cc2222';
        ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx - 3, cy); ctx.lineTo(cx + 3, cy); ctx.closePath(); ctx.fill();
        // S-Nadel (weiß/grau)
        ctx.fillStyle = '#aaaaaa';
        ctx.beginPath(); ctx.moveTo(cx, cy + 12); ctx.lineTo(cx - 3, cy); ctx.lineTo(cx + 3, cy); ctx.closePath(); ctx.fill();
    }
},
```

---

## Phase 4: Assets

| Key | Datei | Beschreibung |
|---|---|---|
| `item_compass` | `img/item_compass.png` | Kompass-Rose, 32×32 |
| `item_egg` | Alias auf `img/dragon_egg.png` | Inventory-Icon für EGG |

**Registrierung in `imagerepo.js`:**
```js
this.register("img/item_compass.png", "item_compass");
this.register("img/dragon_egg.png",   "item_egg");   // Alias: EGG im Inventory
```

`item_compass.png` — Python generiert (Kompass-Rose, blauer Hintergrund, rote N-Nadel).

---

## Phase 5: Save/Load — blimpFuelBonus

**Datei:** `saveload.js`

`blimpFuelBonus` muss den Blimp-Fuel-Max über Neustarts hinweg erhalten.

**save():**
```js
state.blimpFuelBonus = engine.blimpFuelBonus || 0;
```

**load():**
```js
engine.blimpFuelBonus = state.blimpFuelBonus || 0;
if (engine.blimpFuelBonus > 0) {
    var blimp = engine.world.getObjects().find(function(o) {
        return o.scores && o.scores.get('FUEL');
    });
    if (blimp) blimp.scores.get('FUEL').max += engine.blimpFuelBonus;
}
```

---

## Implementierungsreihenfolge

```
Phase 4  Python-Asset + imagerepo.js    item_compass.png, item_egg Alias
    ↓
Phase 1  npc.js                         Neue 5-stufige Questkette
    ↓
Phase 2  app.js                         _checkQuestCondition, _applyQuestReward,
                                         _applyBlimpUpgrade, tryNPCInteract erweitern
    ↓
Phase 3  app.js                         tryCraftCompass() + getHutItems('craft')
    ↓
Phase 5  saveload.js                    blimpFuelBonus save/load
```

---

## Bekannte Risiken

| Risiko | Maßnahme |
|---|---|
| Spieler erfüllt Quest 1 (Werkbank) bevor Quest angenommen → sofort abgebbar beim ersten F-Druck | `_checkQuestCondition` prüft Weltzustand live — egal wann ✓ |
| Skymap vor Quest 3 gefunden → gleiche Lösung | Live-Check auf `CM.skyMapFound` ✓ |
| Blimp nicht in World bei Quest 4 Belohnung | `blimpFuelBonus` gecacht → wird beim Load angewendet ✓ |
| `CRYSTAL` ist ein Score, kein Inventory-Item | `crystalScore.reduce(3)` — gleiche Logik wie bei Lampen-Crafting ✓ |
| EGG taucht in Inventory als Text auf wenn kein `item_egg` registriert | `item_egg` als Alias auf `dragon_egg.png` registrieren ✓ |
| Neue `check`-Quests in `tryNPCInteract` — akzeptieren/einlösen müssen sauber getrennt sein | check-Quests nicht einlösen wenn `questAccepted = false` (wie resource-Quests) ✓ |
