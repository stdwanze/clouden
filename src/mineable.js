CM = window.CM || {};

CM.Mineable = class Mineable extends CM.MoveableObject {
    constructor(position, resourceType, image) {
        var scale = resourceType === 'WOOD' ? 0.2 : 0.18;
        var w = image ? image.width * scale : 24;
        var h = image ? image.height * scale : 24;
        super(position, w, h, CM.GroundLevel);
        this.mineable = true;
        this.resourceType = resourceType;
        this.image = image || null;
        this.hitsRequired = resourceType === 'STONE' ? 5 : 3;
        this.hitsReceived = 0;
        this.hitFlash = 0;
    }

    mine() {
        if (this.hitsReceived >= this.hitsRequired) return true;
        this.hitsReceived++;
        this.hitFlash = 8;
        CM.Sound.play(this.resourceType === 'STONE' ? 'mine_stone' : 'mine_wood');
        if (this.hitsReceived >= this.hitsRequired) {
            if (this.remove) this.remove(this);
            return true;
        }
        return false;
    }

    tick() {
        if (this.hitFlash > 0) this.hitFlash--;
    }

    draw(renderer) {
        var z = renderer.zoom;
        if (this.image) {
            renderer.drawImage(this.image, this.position.x, this.position.y, this.sizeX, this.sizeY, 1);
        } else {
            var baseColor = this.resourceType === 'STONE' ? '#8a8a8a' : '#5a3010';
            renderer.drawRectangleZ(this.position.x, this.position.y, this.sizeX, this.sizeY, baseColor, z);
        }

        if (this.hitFlash > 0) {
            var alpha = (this.hitFlash / 8) * 0.45;
            renderer.drawRectangleZ(this.position.x, this.position.y, this.sizeX, this.sizeY, 'rgba(255,255,255,' + alpha + ')', z);
        }

        if (this.hitsReceived > 0) {
            var barY = this.position.y - 5;
            var remaining = (this.hitsRequired - this.hitsReceived) / this.hitsRequired;
            renderer.drawRectangleZ(this.position.x, barY, this.sizeX, 3, '#333333', z);
            renderer.drawRectangleZ(this.position.x, barY, this.sizeX * remaining, 3, '#ffcc00', z);
        }
    }
}
