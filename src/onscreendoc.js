CM = window.CM || {}

CM.OnScreenDocu = class OnScreenDoc{

    constructor( cornerstone, imagerepo)
    {
        this.corner = cornerstone;
        this.imagerepo = imagerepo;
        this.visible = false;
    }

    toggle()
    {
        this.visible = !this.visible;
    }

    draw(renderer)
    {
        if (!this.visible) return;

        var panelW = 540;
        var panelH = 722;
        var panelX = (renderer.getScreenWidth() - panelW) / 2;
        var panelY = 10;
        var textX = panelX + 20;
        var line = 22;
        var s14 = 14;
        var gap14 = 18;

        renderer.drawRectangleStatic(panelX, panelY, panelW, panelH, "white");

        renderer.fillTextStatic("-- cloud adventurer --", textX, panelY + 30, 28);
        renderer.fillTextStatic("How to play:", textX, panelY + 30 + line, 18);
        renderer.fillTextStatic("move with the arrow keys",        textX, panelY + 30 + line*2);
        renderer.fillTextStatic("board the blimp with b-key",      textX, panelY + 30 + line*3);
        renderer.fillTextStatic("ascend/descend with a and s key", textX, panelY + 30 + line*4);
        renderer.fillTextStatic("fire with c-key",                 textX, panelY + 30 + line*5);
        renderer.fillTextStatic("mine resources with e-key",       textX, panelY + 30 + line*6);
        renderer.fillTextStatic("open inventory with i-key",       textX, panelY + 30 + line*7);
        renderer.fillTextStatic("talk to NPC with f-key",          textX, panelY + 30 + line*8);

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
        renderer.fillTextStatic("Mining (e-Taste):", textX, miningY, 18);
        renderer.fillTextStatic("Holz (braun)  -  3 Treffer",                    textX, miningY + line,          s14);
        renderer.fillTextStatic("Stein (grau)  -  5 Treffer",                    textX, miningY + line + gap14,   s14);
        renderer.fillTextStatic("Schilf (gr\u00fcn, Wasserrand)  -  1 Treffer", textX, miningY + line + gap14*2, s14);
        renderer.fillTextStatic("Beeren (rot/blau)  -  2 Treffer",              textX, miningY + line + gap14*3, s14);

        var buildY = miningY + line + gap14*4 + 14;
        renderer.fillTextStatic("Bauen:", textX, buildY, 18);
        renderer.fillTextStatic("[L] Blockh\u00fctte  -  6 Holz + 3 Stein",                         textX, buildY + line,          s14);
        renderer.fillTextStatic("[J] Vogelscheuche  -  2 Holz + 1 Schilf + 1 Rote Beere",          textX, buildY + line + gap14,   s14);
        renderer.fillTextStatic("    verhindert Gegner-Spawn im Umkreis",                           textX, buildY + line + gap14*2, s14);

        var hutY = buildY + line + gap14*3 + 12;
        renderer.fillTextStatic("Nahe Blockh\u00fctte:", textX, hutY, 16);
        renderer.fillTextStatic("[H] Heilen  (braucht Bett)",               textX, hutY + gap14 + 4,   s14);
        renderer.fillTextStatic("[D] Bett bauen  (4 Holz)",                 textX, hutY + gap14*2 + 4, s14);
        renderer.fillTextStatic("[D] Crafting Station  (3 Holz + 5 Stein)", textX, hutY + gap14*3 + 4, s14);
        renderer.fillTextStatic("[K] Bogen aufrüsten  (2 Holz + 3 Stein)",  textX, hutY + gap14*4 + 4, s14);
        renderer.fillTextStatic("[K] Pfeile herstellen  (2 Holz, +3 Ammo)", textX, hutY + gap14*5 + 4, s14);
    }
}
