CM = window.CM || {}

CM.OnScreenDocu = class OnScreenDoc{

    constructor( cornerstone)
    {
        this.corner = cornerstone;
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
        var panelH = 210;
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
        renderer.fillTextStatic("collect ammo, health and coins", textX, panelY + 30 + line*6);
        renderer.fillTextStatic("collect fuel (yellow) with the blimp", textX, panelY + 30 + line*7);
    }
}
