CM = window.CM || {}

CM.OnScreenDocu = class OnScreenDoc{

    constructor( cornerstone)
    {
        this.corner = cornerstone;
    }

    draw(renderer, pos)
    {
        var textLine1 = "move with the arrow keys";
        var textLine2 = "board the blimp with c-key";
        var textLine3 = "ascend/descend with a and s key";
        var textLine4 = "fire with c-key";
        var textLine5 = "collect ammo, health and coins";
        var textLine6 = "collect fuel (yellow) with the blimp";
        
        var line = 10;
        renderer.fillText("How to play:",this.corner.x, this.corner.y+(line*1),30);
      
        renderer.fillText(textLine1,this.corner.x, this.corner.y+(line*2));
        renderer.fillText(textLine2,this.corner.x, this.corner.y+(line*3));
        renderer.fillText(textLine3,this.corner.x, this.corner.y+(line*4));
        renderer.fillText(textLine4,this.corner.x, this.corner.y+(line*5));
        renderer.fillText(textLine5,this.corner.x, this.corner.y+(line*6));
        renderer.fillText(textLine6,this.corner.x, this.corner.y+(line*7));
        
        renderer.fillText("-- cloud adventurer --", this.corner.x+200, this.corner.y, 40);
        
        
        
    }
}