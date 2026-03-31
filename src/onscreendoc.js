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

    _text(renderer, text, x, y, size, color, bold) {
        var ctx = renderer.ctxt;
        ctx.fillStyle = color || '#2a1f0e';
        ctx.font = (bold ? 'bold ' : '') + (size || 16) + 'px Cinzel, serif';
        ctx.fillText(text, x, y);
    }

    _line(renderer, text, x, y, size, keycodes) {
        var active = keycodes && this._isActive(keycodes);
        this._text(renderer, text, x, y, size || 16, active ? '#c87820' : '#2a1f0e');
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
        var s14 = 13;
        var gap14 = 18;
        var T = this._text.bind(this, renderer);
        var L = this._line.bind(this, renderer);

        renderer.drawRectangleStatic(panelX, panelY, panelW, panelH, '#f5f0e8');
        // subtle border
        renderer.drawRectangleStatic(panelX,     panelY,          panelW, 2,      '#8b6914');
        renderer.drawRectangleStatic(panelX,     panelY+panelH-2, panelW, 2,      '#8b6914');
        renderer.drawRectangleStatic(panelX,     panelY,          2,      panelH, '#8b6914');
        renderer.drawRectangleStatic(panelX+panelW-2, panelY,     2,      panelH, '#8b6914');

        T("-- Cloud Adventurer --", textX, panelY + 32, 22, '#5a3a00', true);
        T("How to play:", textX, panelY + 32 + line, 15, '#5a3a00', true);
        L("move with the arrow keys",        textX, panelY + 32 + line*2, 14, [37,38,39,40]);
        L("board the blimp with b-key",      textX, panelY + 32 + line*3, 14, [66]);
        L("ascend/descend with a and s key", textX, panelY + 32 + line*4, 14, [65,83]);
        L("fire with c-key",                 textX, panelY + 32 + line*5, 14, [67]);
        L("mine resources with e-key",       textX, panelY + 32 + line*6, 14, [69]);
        L("open inventory with i-key",       textX, panelY + 32 + line*7, 14, [73]);
        L("talk to NPC / sail with f-key",   textX, panelY + 32 + line*8, 14, [70]);

        if(CM.gamepadActive) {
            T('use gamepad to see', textX + 300, panelY + 32 + line, 11, '#7a6030');
        }

        var collectY = panelY + 32 + line * 9 + 8;
        T("Collectables:", textX, collectY, 14, '#5a3a00', true);

        var iconSize = 24;
        var rowH = 30;
        var self = this;
        var collectables = [
            { key: "coin_10",   text: "Coins \u2014 collect to increase your score" },
            { key: "health_10", text: "Health \u2014 restores your health" },
            { key: "ammo_10",   text: "Ammo \u2014 gives you ammo to fire" },
            { key: "fuel_10",   text: "Fuel \u2014 refuels the blimp" },
        ];

        var repo = this.imagerepo;
        collectables.forEach(function(c, i) {
            var rowY = collectY + line + i * rowH;
            if (repo) renderer.drawImageStatic(repo.getImage(c.key), textX, rowY - iconSize + 4, iconSize, iconSize, 1);
            self._text(renderer, c.text, textX + iconSize + 10, rowY, s14);
        });

        var miningY = collectY + line + collectables.length * rowH + 8;
        L("Mining (e-key):", textX, miningY, 14, [69]);
        T("Wood (brown)  \u2014  3 hits",                    textX, miningY + line,          s14);
        T("Stone (grey)  \u2014  5 hits",                    textX, miningY + line + gap14,   s14);
        T("Reed (green, water edge)  \u2014  1 hit",         textX, miningY + line + gap14*2, s14);
        T("Berries (red/blue)  \u2014  2 hits",              textX, miningY + line + gap14*3, s14);

        var buildY = miningY + line + gap14*4 + 12;
        T("Build:", textX, buildY, 14, '#5a3a00', true);
        L("[L] Open build menu",                                          textX, buildY + line,          s14, [76]);
        T("    Blockh\u00fctte  \u2014  6 Wood + 3 Stone",               textX, buildY + line + gap14,   s14);
        T("    Scarecrow  \u2014  2 Wood + 1 Reed + 1 Red Berry",        textX, buildY + line + gap14*2, s14);
        T("    (prevents enemy spawn nearby)",                            textX, buildY + line + gap14*3, s14);

        var hutY = buildY + line + gap14*3 + 10;
        T("Near Blockh\u00fctte:", textX, hutY, 14, '#5a3a00', true);
        L("[H] Heal  (requires bed)",                   textX, hutY + gap14 + 4,   s14, [72]);
        T("[D] Build bed  (4 Wood)",                    textX, hutY + gap14*2 + 4, s14);
        T("[D] Crafting Station  (3 Wood + 5 Stone)",   textX, hutY + gap14*3 + 4, s14);
        T("[K] Upgrade bow  (2 Wood + 3 Stone)",        textX, hutY + gap14*4 + 4, s14);
        T("[K] Craft arrows  (2 Wood, +3 Ammo)",        textX, hutY + gap14*5 + 4, s14);

        // debug line
        if(this.inputHandler) {
            var dbg = 'last key: ' + (this.inputHandler.lastKeyCode !== undefined ? this.inputHandler.lastKeyCode : '-');
            T(dbg, textX, panelY + panelH - 12, 11, '#999');
        }
    }
}
