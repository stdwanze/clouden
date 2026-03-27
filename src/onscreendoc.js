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

        var panelW = 420;
        var panelH = 370;
        var panelX = (renderer.getScreenWidth() - panelW) / 2;
        var panelY = 10;
        var textX = panelX + 20;
        var line = 22;

        renderer.drawRectangleStatic(panelX, panelY, panelW, panelH, "white");

        renderer.fillTextStatic("-- cloud adventurer --", textX, panelY + 30, 28);
        renderer.fillTextStatic("How to play:", textX, panelY + 30 + line, 18);
        renderer.fillTextStatic("move with the arrow keys", textX, panelY + 30 + line*2);
        renderer.fillTextStatic("board the blimp with b-key", textX, panelY + 30 + line*3);
        renderer.fillTextStatic("ascend/descend with a and s key", textX, panelY + 30 + line*4);
        renderer.fillTextStatic("fire with c-key", textX, panelY + 30 + line*5);

        var collectY = panelY + 30 + line * 6 + 10;
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
    }
}
