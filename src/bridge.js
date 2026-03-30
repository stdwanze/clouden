CM = window.CM || {};

CM.Bridge = class Bridge extends CM.MoveableObject {
    constructor(position, vertical) {
        super(position, vertical ? 14 : 32, vertical ? 32 : 14, CM.GroundLevel);
        this.isBridge = true;
        this.vertical = !!vertical;
    }
    tick() {}
    draw(renderer) {
        var x = this.position.x;
        var y = this.position.y;
        var z = renderer.zoom;
        if (this.vertical) {
            renderer.drawRectangleZ(x,      y,      14, 32, '#6b3a14', z);
            renderer.drawRectangleZ(x +  2, y,       1, 32, '#3a1a04', z);
            renderer.drawRectangleZ(x +  6, y,       1, 32, '#3a1a04', z);
            renderer.drawRectangleZ(x + 10, y,       1, 32, '#3a1a04', z);
            renderer.drawRectangleZ(x,      y,      14,  2, '#3a1a04', z);
            renderer.drawRectangleZ(x,      y + 30, 14,  2, '#3a1a04', z);
        } else {
            renderer.drawRectangleZ(x,      y,     32, 14, '#6b3a14', z);
            renderer.drawRectangleZ(x,      y + 2, 32,  1, '#3a1a04', z);
            renderer.drawRectangleZ(x,      y + 6, 32,  1, '#3a1a04', z);
            renderer.drawRectangleZ(x,      y + 10,32,  1, '#3a1a04', z);
            renderer.drawRectangleZ(x,      y,      2, 14, '#3a1a04', z);
            renderer.drawRectangleZ(x + 30, y,      2, 14, '#3a1a04', z);
        }
    }
}
