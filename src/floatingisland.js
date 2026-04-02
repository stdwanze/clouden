CM = window.CM || {};

/**
 * FloatingIsland — a tile-based platform at CM.FloatLevel.
 *
 * Behaviour:
 *  - Rendered with its own parallax zoom (CM.FloatLevel), independent of the
 *    player's current altitude.
 *  - Casts a dark ellipse shadow at CM.GroundLevel zoom directly below it.
 *  - Becomes semi-transparent when the player is below the island
 *    (player.z > CM.FloatLevel + 0.25).
 *  - Sets handlesOwnAlpha = true so the engine's generic lighter() call is
 *    skipped for this object.
 */
CM.FloatingIsland = class FloatingIsland {

    /**
     * @param {CM.Point} position  Top-left world coordinate of the island.
     * @param {number[][]} [shape] 2-D array of 1/0 tile flags (optional).
     */
    constructor(position, shape, tileImage) {
        this.position        = position;
        this.z               = CM.FloatLevel;
        this.interactable    = false;
        this.handlesOwnAlpha = true;
        this.TILE            = 32;
        this.tiles           = shape || CM.FloatingIsland.defaultShape();
        this.rows            = this.tiles.length;
        this.cols            = this.tiles[0].length;
        this.worldW          = this.cols * this.TILE;
        this.worldH          = this.rows * this.TILE;
        this.tileImage       = tileImage || null;
    }

    /** Default 7×5 oval shape. */
    static defaultShape() {
        return [
            [0,0,1,1,1,0,0],
            [0,1,1,1,1,1,0],
            [1,1,1,1,1,1,1],
            [0,1,1,1,1,1,0],
            [0,0,1,1,1,0,0],
        ];
    }

    tick() {} // required by the world object loop

    /** Returns true if the axis-aligned rect (rx,ry,rw,rh) overlaps any solid tile. */
    containsRect(rx, ry, rw, rh) {
        var T = this.TILE;
        for (var row = 0; row < this.rows; row++) {
            for (var col = 0; col < this.cols; col++) {
                if (!this.tiles[row][col]) continue;
                var tx = this.position.x + col * T;
                var ty = this.position.y + row * T;
                if (rx < tx + T && rx + rw > tx && ry < ty + T && ry + rh > ty) return true;
            }
        }
        return false;
    }

    getMidPoint() {
        return new CM.Point(
            this.position.x + this.worldW / 2,
            this.position.y + this.worldH / 2
        );
    }

    draw(renderer) {
        var ctx     = renderer.ctxt;
        var T       = this.TILE;
        var isBelow = !renderer.playerOnIsland && renderer.zoom > CM.FloatLevel + 0.25;

        ctx.save();

        if (isBelow) {
            // ── Shadow: gray footprint visible from ground level ──────────────
            ctx.globalAlpha = 0.60;
            ctx.fillStyle   = '#555555';
            for (var srow = 0; srow < this.rows; srow++) {
                for (var scol = 0; scol < this.cols; scol++) {
                    if (!this.tiles[srow][scol]) continue;
                    var sx  = Math.round(renderer.translateAndZoom(this.position.x + scol * T       - renderer.viewport.x, renderer.canvas.width  / 2));
                    var sy  = Math.round(renderer.translateAndZoom(this.position.y + srow * T       - renderer.viewport.y, renderer.canvas.height / 2));
                    var sx2 = Math.round(renderer.translateAndZoom(this.position.x + (scol + 1) * T - renderer.viewport.x, renderer.canvas.width  / 2));
                    var sy2 = Math.round(renderer.translateAndZoom(this.position.y + (srow + 1) * T - renderer.viewport.y, renderer.canvas.height / 2));
                    ctx.fillRect(sx, sy, sx2 - sx, sy2 - sy);
                }
            }
        } else {
            // ── Island tiles: visible at and above island altitude ────────────
            for (var row = 0; row < this.rows; row++) {
                for (var col = 0; col < this.cols; col++) {
                    if (!this.tiles[row][col]) continue;
                    var hasBelow = row + 1 < this.rows && !!this.tiles[row + 1][col];
                    this._drawTile(
                        renderer, ctx,
                        this.position.x + col * T,
                        this.position.y + row * T,
                        hasBelow
                    );
                }
            }
        }

        ctx.restore();
    }

    _drawTile(renderer, ctx, wx, wy, hasBelow) {
        var T      = this.TILE;
        var sx     = Math.round(renderer.translateAndZoom(wx     - renderer.viewport.x, renderer.canvas.width  / 2));
        var sy     = Math.round(renderer.translateAndZoom(wy     - renderer.viewport.y, renderer.canvas.height / 2));
        var sx2    = Math.round(renderer.translateAndZoom(wx + T - renderer.viewport.x, renderer.canvas.width  / 2));
        var sy2    = Math.round(renderer.translateAndZoom(wy + T - renderer.viewport.y, renderer.canvas.height / 2));
        var tSize  = sx2 - sx;
        var tSizeY = sy2 - sy;
        var cliffH = Math.round(tSizeY * 0.38);

        // tile surface
        if (this.tileImage) {
            ctx.drawImage(this.tileImage, sx, sy, tSize, tSizeY);
        } else {
            // fallback: programmatic green fill
            ctx.fillStyle = '#4e8c2c';
            ctx.fillRect(sx, sy, tSize, tSizeY);
            var BUMPS  = 8;
            var shades = ['#3a6818', '#4e8c2c', '#5ea034', '#70b840', '#3e7420', '#62aa38'];
            var bw = tSize  / BUMPS;
            var bh = tSizeY / BUMPS;
            for (var bi = 0; bi < BUMPS; bi++) {
                for (var bj = 0; bj < BUMPS; bj++) {
                    var gx = wx / 4 + bi;
                    var gy = wy / 4 + bj;
                    var idx = ((gx * 31 + gy * 17) % shades.length + shades.length) % shades.length;
                    ctx.fillStyle = shades[idx];
                    ctx.fillRect(
                        Math.round(sx + bi * bw),
                        Math.round(sy + bj * bh),
                        Math.max(1, Math.round(bw) - 1),
                        Math.max(1, Math.round(bh) - 1)
                    );
                }
            }
        }

        // cliff face on bottom edge when no tile below
        if (!hasBelow) {
            ctx.fillStyle = '#7a5c30';
            ctx.fillRect(sx, sy + tSizeY, tSize, cliffH);
            ctx.fillStyle = '#523a18';
            ctx.fillRect(sx, sy + tSizeY + Math.round(cliffH * 0.65), tSize, Math.round(cliffH * 0.35));
        }
    }
};
