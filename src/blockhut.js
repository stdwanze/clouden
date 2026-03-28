CM = window.CM || {};

CM.Blockhut = class Blockhut extends CM.MoveableObject {
    constructor(position) {
        super(position, 11, 12, CM.GroundLevel);
        this.isSafePoint = true;
    }

    draw(renderer) {
        var x = this.position.x;
        var y = this.position.y;
        var z = this.z;
        var w = this.sizeX;

        // Roof (stepped rectangles to suggest a peaked shape)
        renderer.drawRectangleZ(x + 2, y,     w - 4, 2, '#3a2008', z);
        renderer.drawRectangleZ(x + 1, y + 2, w - 2, 2, '#4a3010', z);
        renderer.drawRectangleZ(x,     y + 4, w,     2, '#5a3a18', z);

        // Log walls
        renderer.drawRectangleZ(x, y + 6, w, 6, '#8B5E3C', z);

        // Horizontal log lines
        renderer.drawRectangleZ(x, y + 7,  w, 1, '#6a4020', z);
        renderer.drawRectangleZ(x, y + 9,  w, 1, '#6a4020', z);
        renderer.drawRectangleZ(x, y + 11, w, 1, '#6a4020', z);

        // Door
        renderer.drawRectangleZ(x + 3, y + 8, 4, 4, '#2a1800', z);
    }
}
