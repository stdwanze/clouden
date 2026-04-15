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

        var panelW = 600;
        var panelH = 760;
        var panelX = (renderer.getScreenWidth() - panelW) / 2;
        var panelY = 10;
        var T = this._text.bind(this, renderer);
        var L = this._line.bind(this, renderer);

        renderer.drawRectangleStatic(panelX, panelY, panelW, panelH, '#f5f0e8');
        renderer.drawRectangleStatic(panelX,          panelY,          panelW, 2,      '#8b6914');
        renderer.drawRectangleStatic(panelX,          panelY+panelH-2, panelW, 2,      '#8b6914');
        renderer.drawRectangleStatic(panelX,          panelY,          2,      panelH, '#8b6914');
        renderer.drawRectangleStatic(panelX+panelW-2, panelY,          2,      panelH, '#8b6914');

        var S = 13;   // small font size
        var G = 17;   // line gap

        // ── title ────────────────────────────────────────────────────────────
        T("-- Cloud Adventurer --", panelX + 20, panelY + 28, 20, '#5a3a00', true);

        // divider between columns
        var midX = panelX + Math.floor(panelW / 2);
        renderer.drawRectangleStatic(midX, panelY + 40, 1, panelH - 50, 'rgba(139,105,20,0.25)');

        // ── LEFT COLUMN ───────────────────────────────────────────────────────
        var lx  = panelX + 18;
        var ly  = panelY + 50;

        T("Controls", lx, ly, 13, '#5a3a00', true);
        ly += G;
        L("\u2190\u2191\u2192\u2193  bewegen",            lx, ly, S, [37,38,39,40]); ly += G;
        L("[B]  Blimp besteigen / verlassen",              lx, ly, S, [66]);          ly += G;
        L("[A/S]  aufsteigen / absteigen",                 lx, ly, S, [65,83]);       ly += G;
        L("[C]  schie\u00dfen",                            lx, ly, S, [67]);          ly += G;
        L("[E]  abbauen",                                  lx, ly, S, [69]);          ly += G;
        L("[I]  Inventar \u00f6ffnen / Item benutzen",     lx, ly, S, [73]);          ly += G;
        L("[F]  NPC ansprechen / Segel",                   lx, ly, S, [70]);          ly += G;
        L("[H]  Blockh\u00fctte-Men\u00fc",                lx, ly, S, [72]);          ly += G + 4;

        T("Ressourcen abbauen [E]", lx, ly, 13, '#5a3a00', true); ly += G;
        T("Holz (braun)   \u2014  3 Treffer",       lx, ly, S); ly += G;
        T("Stein (grau)   \u2014  5 Treffer",        lx, ly, S); ly += G;
        T("Reed (Wasserrand)  \u2014  1 Treffer",    lx, ly, S); ly += G;
        T("Beeren (rot/blau)  \u2014  2 Treffer",    lx, ly, S); ly += G;
        T("Kristall (H\u00f6hle)  \u2014  3 Treffer",lx, ly, S); ly += G + 4;

        T("Sammelb. Gegenst\u00e4nde", lx, ly, 13, '#5a3a00', true);
        var iconSize = 22;
        var repo = this.imagerepo;
        var collectables = [
            { key: "coin_10",   text: "Coins  \u2014  erh\u00f6hen Score" },
            { key: "health_10", text: "Health \u2014  stellt HP wieder her" },
            { key: "ammo_10",   text: "Ammo   \u2014  gibt Munition" },
            { key: "fuel_10",   text: "Fuel   \u2014  tankt Blimp auf" },
        ];
        var self = this;
        collectables.forEach(function(c) {
            ly += G + 2;
            if (repo) renderer.drawImageStatic(repo.getImage(c.key), lx, ly - iconSize + 5, iconSize, iconSize, 1);
            self._text(renderer, c.text, lx + iconSize + 8, ly, S);
        });

        // ── RIGHT COLUMN ──────────────────────────────────────────────────────
        var rx  = midX + 12;
        var ry  = panelY + 50;

        T("Bauen [L]", rx, ry, 13, '#5a3a00', true); ry += G;
        T("Blockh\u00fctte  \u2014  6 Holz + 3 Stein",         rx, ry, S); ry += G;
        T("Vogelscheuche  \u2014  2 Holz + 1 Reed + 1 Beere",  rx, ry, S); ry += G;
        T("  (verhindert Feind-Spawns in der N\u00e4he)",       rx, ry, S); ry += G + 4;

        T("Blockh\u00fctte [H]", rx, ry, 13, '#5a3a00', true); ry += G;
        T("Ausbauen:",                                rx, ry, S, '#5a3a00', true); ry += G;
        T("  Bett         \u2014  4 Holz",            rx, ry, S); ry += G;
        T("  Werkbank      \u2014  3 Holz + 5 Stein", rx, ry, S); ry += G + 4;

        T("Craften (Werkbank erforderlich):", rx, ry, S, '#5a3a00', true); ry += G;
        T("  Fackel    \u2014  1 Holz + 1 Reed",              rx, ry, S); ry += G;
        T("    \u2192 H\u00f6hlen betreten (1 Min. Licht)",    rx, ry, S, '#7a5a20'); ry += G;
        T("  Kompass   \u2014  1 Stein + 3 Kristalle",         rx, ry, S); ry += G;
        T("    \u2192 Floating Islands auf Minimap*",           rx, ry, S, '#7a5a20'); ry += G;
        T("  Fernrohr  \u2014  2 Holz + 2 Kristalle",          rx, ry, S); ry += G;
        T("    \u2192 Minimap-Sichtweite dauerhaft gr\u00f6\u00dfer",  rx, ry, S, '#7a5a20'); ry += G;
        T("  Bogen+    \u2014  2 Holz + 3 Stein",              rx, ry, S); ry += G;
        T("  Pfeile    \u2014  2 Holz  (+3 Ammo)",             rx, ry, S); ry += G + 4;

        T("Fortschritt", rx, ry, 13, '#5a3a00', true); ry += G;
        T("H\u00f6hlen-Eingang finden (Map)",                   rx, ry, S); ry += G;
        T("\u2192 Fackel aus Inventar benutzen [I]",            rx, ry, S, '#7a5a20'); ry += G;
        T("Himmelskarte in H\u00f6hle sammeln",                 rx, ry, S); ry += G;
        T("\u2192 Floating Islands erscheinen in der Welt",     rx, ry, S, '#7a5a20'); ry += G;
        T("*Kompass aus Inventar benutzen [I]",                 rx, ry, S); ry += G;
        T("\u2192 Inseln auf Minimap sichtbar",                  rx, ry, S, '#7a5a20'); ry += G;
        T("Floating Islands per Blimp erreichen",               rx, ry, S); ry += G;
        T("(aufsteigen bis FloatLevel)",                        rx, ry, S, '#7a5a20'); ry += G + 4;

        T("NPC-Quests [F]", rx, ry, 13, '#5a3a00', true); ry += G;
        T("1.  15 Holz sammeln  \u2192  +50 M\u00fcnzen",               rx, ry, S); ry += G;
        T("2.  Werkbank bauen   \u2192  +5 HP + 10 Pfeile",             rx, ry, S); ry += G;
        T("3.  Kompass craften  \u2192  +30 M\u00fcnzen",               rx, ry, S); ry += G;
        T("4.  Himmelskarte find.\u2192  +50 M\u00fcnzen",              rx, ry, S); ry += G;
        T("5.  Himmelsstein bring.\u2192 Blimp +30 Fuel",               rx, ry, S); ry += G;

        // debug line
        if(this.inputHandler) {
            var dbg = 'last key: ' + (this.inputHandler.lastKeyCode !== undefined ? this.inputHandler.lastKeyCode : '-');
            T(dbg, panelX + 20, panelY + panelH - 10, 10, '#999');
        }
    }
}
