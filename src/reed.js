CM = window.CM || {};

CM.Reed = class Reed extends CM.Mineable {
    constructor(position) {
        super(position, 'REED', null);
        this.sizeX = 12;
        this.sizeY = 18;
        this.hitsRequired = 1;
        this.classType = 'Reed';
    }

    draw(renderer) {
        var x = this.position.x;
        var y = this.position.y;
        var z = this.z;

        var stems = [
            { ox: 1, h: 13 },
            { ox: 5, h: 18 },
            { ox: 9, h: 11 },
        ];
        stems.forEach(function(s) {
            var ty = y + (18 - s.h);
            renderer.drawRectangleZ(x + s.ox,     ty,      2, s.h, '#5a8a1a', z);
            renderer.drawRectangleZ(x + s.ox - 3, ty,      8, 2,   '#7ab830', z);
            renderer.drawRectangleZ(x + s.ox - 1, ty + 2,  4, 2,   '#8fcc44', z);
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
