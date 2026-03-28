CM = window.CM || {};

CM.Blockhut = class Blockhut extends CM.MoveableObject {
    constructor(position) {
        super(position, 44, 50, CM.GroundLevel);
        this.isSafePoint = true;
    }

    draw(renderer) {
        var x = this.position.x;
        var y = this.position.y;
        var z = this.z;
        var w = this.sizeX;

        // Roof (stepped rectangles to suggest a peaked shape)
        renderer.drawRectangleZ(x + 10, y,      w - 20, 10, '#3a2008', z);
        renderer.drawRectangleZ(x + 4,  y + 8,  w - 8,  10, '#4a3010', z);
        renderer.drawRectangleZ(x,      y + 16, w,       8, '#5a3a18', z);

        // Log walls
        renderer.drawRectangleZ(x, y + 24, w, 26, '#8B5E3C', z);

        // Horizontal log lines
        renderer.drawRectangleZ(x, y + 30, w, 2, '#6a4020', z);
        renderer.drawRectangleZ(x, y + 38, w, 2, '#6a4020', z);
        renderer.drawRectangleZ(x, y + 46, w, 2, '#6a4020', z);

        // Door
        renderer.drawRectangleZ(x + 14, y + 34, 16, 16, '#2a1800', z);
    }
}
