CM = window.CM || {};

CM.Minimap = class Minimap {
    constructor() {
        this.size    = 120;
        this.radius  = 800; // world units shown from center to edge
        this.margin  = 16;
    }

    draw(renderer, player, world) {
        var s      = this.size;
        var ox     = renderer.getScreenWidth() - this.margin - s;
        var oy     = this.margin;
        var half   = s / 2;
        var scale  = half / this.radius;
        var CHUNK  = world.TILESIZE * world.CHUNKWIDTHINTILES; // 960
        var TILE   = world.TILESIZE;                           // 32
        var tilePixels = Math.ceil(TILE * scale) + 1;

        var ctx = renderer.ctxt;
        ctx.save();

        // water background
        ctx.fillStyle = 'rgba(20,40,80,0.75)';
        ctx.fillRect(ox, oy, s, s);

        ctx.beginPath();
        ctx.rect(ox, oy, s, s);
        ctx.clip();

        var px = player.position.x;
        var py = player.position.y;

        // land tiles
        var chunkX0 = Math.floor((px - this.radius) / CHUNK);
        var chunkX1 = Math.floor((px + this.radius) / CHUNK);
        var chunkY0 = Math.floor((py - this.radius) / CHUNK);
        var chunkY1 = Math.floor((py + this.radius) / CHUNK);

        for (var cy2 = chunkY0; cy2 <= chunkY1; cy2++) {
            for (var cx2 = chunkX0; cx2 <= chunkX1; cx2++) {
                var chunk = world.getChunkByIndeces(cx2, cy2);
                if (!chunk) continue;
                var tiles = chunk.getTiles();
                for (var t = 0; t < tiles.length; t++) {
                    var tile = tiles[t];
                    if (!tile.isLand()) continue;
                    var mx = ox + half + (tile.location.x - px) * scale;
                    var my = oy + half + (tile.location.y - py) * scale;
                    ctx.fillStyle = '#4a7a3a';
                    ctx.fillRect(Math.floor(mx), Math.floor(my), tilePixels, tilePixels);
                }
            }
        }

        // border
        ctx.strokeStyle = 'rgba(180,180,200,0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox, oy, s, s);

        function toScreen(wx, wy) {
            return {
                x: ox + half + (wx - px) * scale,
                y: oy + half + (wy - py) * scale
            };
        }

        // blockhütten
        world.getObjects().forEach(function(obj) {
            if (obj.isSafePoint) {
                var p = toScreen(obj.position.x, obj.position.y);
                ctx.fillStyle = '#f4a020';
                ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
            } else if (obj.interactable && obj.scores && obj.scores.get('FUEL')) {
                var p = toScreen(obj.position.x, obj.position.y);
                ctx.fillStyle = '#4af';
                ctx.fillRect(p.x - 2, p.y - 2, 5, 5);
            }
        });

        // player dot
        ctx.fillStyle = '#fff';
        ctx.fillRect(ox + half - 3, oy + half - 3, 6, 6);

        ctx.restore();
    }
}
