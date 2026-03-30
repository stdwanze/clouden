CM = window.CM || {};

CM.Vogelscheuche = class Vogelscheuche extends CM.MoveableObject {
    constructor(position) {
        super(position, 14, 24, CM.GroundLevel);
        this.isScarecrow = true;
        this.repelRadius = 700; // world pixels (~0.75 chunks)
        this.pulseFrame = 0;
    }

    tick() {
        this.pulseFrame = (this.pulseFrame + 1) % 150;
    }

    draw(renderer) {
        var x = this.position.x;
        var y = this.position.y;
        var z = renderer.zoom;

        // Vertical post
        renderer.drawRectangleZ(x + 6, y + 4, 2, 20, '#8B6914', z);
        // Horizontal crossbeam
        renderer.drawRectangleZ(x,     y + 9, 14, 2,  '#7a5c10', z);
        // Hat top
        renderer.drawRectangleZ(x + 4, y,     6,  3,  '#3a2008', z);
        // Hat brim
        renderer.drawRectangleZ(x + 3, y + 3, 8,  1,  '#3a2008', z);
        // Head
        renderer.drawRectangleZ(x + 4, y + 4, 6,  5,  '#e8c87a', z);
        // Eyes
        renderer.drawRectangleZ(x + 5, y + 5, 1,  1,  '#3a2008', z);
        renderer.drawRectangleZ(x + 8, y + 5, 1,  1,  '#3a2008', z);
        // Left sleeve
        renderer.drawRectangleZ(x + 1, y + 11, 4, 5,  '#cc6622', z);
        // Right sleeve
        renderer.drawRectangleZ(x + 9, y + 11, 4, 5,  '#cc6622', z);
        // Body cloth
        renderer.drawRectangleZ(x + 5, y + 14, 4, 8,  '#cc6622', z);
    }
}
