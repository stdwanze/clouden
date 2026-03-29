CM = window.CM || {};

CM.BerryBush = class BerryBush extends CM.Mineable {
    constructor(position, resourceType) {
        super(position, resourceType, null);
        this.sizeX = 14;
        this.sizeY = 11;
        this.hitsRequired = 2;
        this.classType = 'BerryBush';
        this.berryColor = resourceType === 'BERRY_RED' ? '#cc2828' : '#2848cc';
    }

    draw(renderer) {
        var x = this.position.x;
        var y = this.position.y;
        var z = renderer.zoom;
        var c = this.berryColor;

        // bush shape (layered rects to suggest roundness)
        renderer.drawRectangleZ(x + 3, y,      8,  3, '#2a6018', z);
        renderer.drawRectangleZ(x,     y + 2, 14,  6, '#378a22', z);
        renderer.drawRectangleZ(x + 2, y + 7,  10, 3, '#2a6018', z);

        // berries
        var berries = [
            { ox: 1,  oy: 1 },
            { ox: 5,  oy: 0 },
            { ox: 9,  oy: 1 },
            { ox: 3,  oy: 4 },
            { ox: 7,  oy: 3 },
            { ox: 11, oy: 4 },
        ];
        berries.forEach(function(b) {
            renderer.drawRectangleZ(x + b.ox, y + b.oy, 2, 2, c, z);
        });

        if (this.hitFlash > 0) {
            var alpha = (this.hitFlash / 8) * 0.45;
            renderer.drawRectangleZ(x, y, this.sizeX, this.sizeY, 'rgba(255,255,255,' + alpha + ')', z);
        }

        if (this.hitsReceived > 0) {
            var remaining = (this.hitsRequired - this.hitsReceived) / this.hitsRequired;
            renderer.drawRectangleZ(x, y - 4, this.sizeX, 3, '#333', z);
            renderer.drawRectangleZ(x, y - 4, this.sizeX * remaining, 3, '#ffcc00', z);
        }
    }
}
