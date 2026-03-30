CM = window.CM || {}

CM.OnScreenDocu = class OnScreenDoc{

    constructor( cornerstone, imagerepo, inputHandler)
    {
        this.corner = cornerstone;
        this.imagerepo = imagerepo;
        this.inputHandler = inputHandler || null;
        this.visible = false;
    }

    toggle()
    {
        this.visible = !this.visible;
    }

    _isActive(keycodes) {
        if(!this.inputHandler) return false;
        var keys = this.inputHandler.currentKeys;
        return keycodes.some(function(k) { return !!keys[k]; });
    }

    _line(renderer, text, x, y, size, keycodes) {
        var active = keycodes && this._isActive(keycodes);
        renderer.fillTextStaticColor(text, x, y, size || 20, active ? '#e8a020' : '#24272b');
    }

    draw(renderer)
    {
        if (!this.visible) return;

        var panelW = 540;
        var panelH = 740;
        var panelX = (renderer.getScreenWidth() - panelW) / 2;
        var panelY = 10;
        var textX = panelX + 20;
        var line = 22;
        var s14 = 14;
        var gap14 = 18;
        var L = this._line.bind(this, renderer);

        renderer.drawRectangleStatic(panelX, panelY, panelW, panelH, "white");

        renderer.fillTextStatic("-- cloud adventurer --", textX, panelY + 30, 28);
        renderer.fillTextStatic("How to play:", textX, panelY + 30 + line, 18);
        L("move with the arrow keys",        textX, panelY + 30 + line*2, 20, [37,38,39,40]);
        L("board the blimp with b-key",      textX, panelY + 30 + line*3, 20, [66]);
        L("ascend/descend with a and s key", textX, panelY + 30 + line*4, 20, [65,83]);
        L("fire with c-key",                 textX, panelY + 30 + line*5, 20, [67]);
        L("mine resources with e-key",       textX, panelY + 30 + line*6, 20, [69]);
        L("open inventory with i-key",       textX, panelY + 30 + line*7, 20, [73]);
        L("talk to NPC / sail with f-key",   textX, panelY + 30 + line*8, 20, [70]);

        // gamepad hint
        if(CM.gamepadActive) {
            renderer.fillTextStaticColor('use gamepad to see', textX + 300, panelY + 30 + line, 13, '#888');
        }

        var collectY = panelY + 30 + line * 9 + 10;
        renderer.fillTextStatic("Collectables:", textX, collectY, 18);

        var iconSize = 24;
        var rowH = 32;
        var collectables = [
            { key: "coin_10",   text: "Coins - collect to increase your score" },
            { key: "health_10", text: "Health - restores your health" },
            { key: "ammo_10",   text: "Ammo - gives you ammo to fire (c-key)" },
            { key: "fuel_10",   text: "Fuel - refuels the blimp (on ground, b-key)" },
        ];

        var repo = this.imagerepo;
        collectables.forEach(function(c, i) {
            var rowY = collectY + line + i * rowH;
            if (repo) renderer.drawImageStatic(repo.getImage(c.key), textX, rowY - iconSize + 4, iconSize, iconSize, 1);
            renderer.fillTextStatic(c.text, textX + iconSize + 10, rowY);
        });

        var miningY = collectY + line + collectables.length * rowH + 10;
        L("Mining (e-Taste):", textX, miningY, 18, [69]);
        renderer.fillTextStatic("Holz (braun)  -  3 Treffer",                    textX, miningY + line,          s14);
        renderer.fillTextStatic("Stein (grau)  -  5 Treffer",                    textX, miningY + line + gap14,   s14);
        renderer.fillTextStatic("Schilf (gr\u00fcn, Wasserrand)  -  1 Treffer", textX, miningY + line + gap14*2, s14);
        renderer.fillTextStatic("Beeren (rot/blau)  -  2 Treffer",              textX, miningY + line + gap14*3, s14);

        var buildY = miningY + line + gap14*4 + 14;
        renderer.fillTextStatic("Bauen:", textX, buildY, 18);
        L("[L] Bau-Men\u00fc \u00f6ffnen",                                        textX, buildY + line,          s14, [76]);
        renderer.fillTextStatic("    Blockh\u00fctte  -  6 Holz + 3 Stein",                          textX, buildY + line + gap14,   s14);
        renderer.fillTextStatic("    Vogelscheuche  -  2 Holz + 1 Schilf + 1 Rote Beere",           textX, buildY + line + gap14*2, s14);
        renderer.fillTextStatic("    (verhindert Gegner-Spawn im Umkreis)",                          textX, buildY + line + gap14*3, s14);

        var hutY = buildY + line + gap14*3 + 12;
        renderer.fillTextStatic("Nahe Blockh\u00fctte:", textX, hutY, 16);
        L("[H] Heilen  (braucht Bett)",               textX, hutY + gap14 + 4,   s14, [72]);
        renderer.fillTextStatic("[D] Bett bauen  (4 Holz)",                 textX, hutY + gap14*2 + 4, s14);
        renderer.fillTextStatic("[D] Crafting Station  (3 Holz + 5 Stein)", textX, hutY + gap14*3 + 4, s14);
        renderer.fillTextStatic("[K] Bogen aufr\u00fcsten  (2 Holz + 3 Stein)",  textX, hutY + gap14*4 + 4, s14);
        renderer.fillTextStatic("[K] Pfeile herstellen  (2 Holz, +3 Ammo)", textX, hutY + gap14*5 + 4, s14);

        // debug line
        if(this.inputHandler) {
            var dbg = 'last key: ' + (this.inputHandler.lastKeyCode !== undefined ? this.inputHandler.lastKeyCode : '-');
            renderer.fillTextStaticColor(dbg, textX, panelY + panelH - 16, 13, '#888');
        }
    }
}
