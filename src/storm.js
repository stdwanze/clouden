CM = window.CM || {};

// StormManager: drives the storm cycle IDLE → WARNING (30s) → ACTIVE (60-120s) → IDLE
CM.StormManager = class StormManager {
    constructor() {
        this.phase          = 'IDLE';
        this.idleFrames     = 900;  // erster Sturm: 30s Idle + 30s Warning → Sturm aktiv nach genau 60s
        this.warningFrames  = 0;
        this.activeFrames   = 0;
        this.flashFrames    = 0;
        this.nextFlashIn    = 0;
        this.nextStrikeIn   = 0;
        this.activeStrikes  = [];  // [{x, y, frames, totalFrames, bolt:[{t,ox}]}]
        this._pendingStrike = false;
    }

    // 30 s – 10 min at 30 fps
    _randomIdleFrames()   { return Math.floor(900  + Math.random() * 17100); }
    // 60 s – 120 s at 30 fps
    _randomStormDuration(){ return Math.floor(1800 + Math.random() * 1800);  }

    // Randomise wind direction + strength for all layers after a storm.
    // New magnitude: between 1× and 2× baseMag (= 2× to 4× original baseline).
    _shiftWind() {
        CM.WindLayers.forEach(function(layer) {
            var angle = Math.random() * Math.PI * 2;
            var mag   = layer.baseMag * (1 + Math.random()); // 1–2× baseMag
            layer.wind.x = Math.cos(angle) * mag;
            layer.wind.y = Math.sin(angle) * mag;
        });
        console.log('[Storm] Wind gedreht. Neu:', CM.WindLayers.map(function(l) {
            return '(' + l.wind.x.toFixed(3) + ',' + l.wind.y.toFixed(3) + ')';
        }).join(' | '));
    }

    // Pre-bake a jagged bolt shape so it doesn't flicker per-frame
    _makeBolt() {
        var pts = [];
        var segments = 10;
        for (var i = 0; i <= segments; i++) {
            var jitter = (i === 0 || i === segments) ? 0 : (Math.random() - 0.5) * 38;
            pts.push({ t: i / segments, ox: jitter });
        }
        return pts;
    }

    tick() {
        if (this.phase === 'IDLE') {
            if (--this.idleFrames <= 0) {
                this.phase         = 'WARNING';
                this.warningFrames = 900; // 30 s
                console.log('[Storm] Warnung! Sturm in 30s.');
            }
        } else if (this.phase === 'WARNING') {
            if (--this.warningFrames <= 0) {
                this.phase        = 'ACTIVE';
                this.activeFrames = this._randomStormDuration();
                this.nextFlashIn  = Math.floor(60  + Math.random() * 90);
                this.nextStrikeIn = Math.floor(150 + Math.random() * 150);
                console.log('[Storm] Sturm AKTIV! Dauer: ' + Math.round(this.activeFrames / 30) + 's');
            }
        } else if (this.phase === 'ACTIVE') {
            this.activeFrames--;

            // Screen lightning flash
            if (this.flashFrames > 0) this.flashFrames--;
            if (--this.nextFlashIn <= 0) {
                this.flashFrames = 8 + Math.floor(Math.random() * 8);
                this.nextFlashIn = Math.floor(90 + Math.random() * 180);
            }

            // Ground strike trigger
            if (--this.nextStrikeIn <= 0) {
                this._pendingStrike = true;
                this.nextStrikeIn   = Math.floor(150 + Math.random() * 300);
            }

            // Age existing strikes
            for (var i = this.activeStrikes.length - 1; i >= 0; i--) {
                if (--this.activeStrikes[i].frames <= 0)
                    this.activeStrikes.splice(i, 1);
            }

            if (this.activeFrames <= 0) {
                this.phase         = 'IDLE';
                this.idleFrames    = this._randomIdleFrames();
                this.activeStrikes = [];
                this.flashFrames   = 0;
                this._shiftWind();
                console.log('[Storm] Sturm vorbei. Nächster Sturm in ~' + Math.round((this.idleFrames + 900) / 30) + 's (' + Math.round((this.idleFrames + 900) / 1800) + ' min)');
            }
        }
    }

    isActive()  { return this.phase === 'ACTIVE';  }
    isWarning() { return this.phase === 'WARNING'; }

    getWarningCountdown() { return Math.ceil(this.warningFrames / 30); }

    getFlashAlpha() {
        return this.flashFrames > 0 ? (this.flashFrames / 16) * 0.75 : 0;
    }

    hasPendingStrike()  { return !!this._pendingStrike; }

    addStrike(x, y) {
        this._pendingStrike = false;
        this.activeStrikes.push({
            x: x, y: y,
            frames: 22, totalFrames: 22,
            bolt: this._makeBolt()
        });
    }
};

// Draw a pre-baked jagged lightning bolt from (x1,y1) top to (x2,y2) bottom.
// bolt = [{t, ox}] array from StormManager._makeBolt()
CM.drawLightningBolt = function(ctx, x1, y1, x2, y2, bolt, alpha) {
    var dx = x2 - x1, dy = y2 - y1;
    var pts = bolt.map(function(p) {
        return { x: x1 + dx * p.t + p.ox, y: y1 + dy * p.t };
    });

    ctx.save();
    ctx.shadowColor = 'rgba(160,200,255,' + alpha + ')';
    ctx.shadowBlur  = 14;

    // Glow pass (thick, translucent)
    ctx.strokeStyle = 'rgba(100,160,255,' + (alpha * 0.5) + ')';
    ctx.lineWidth   = 6;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    // Core pass (thin, bright white-blue)
    ctx.strokeStyle = 'rgba(220,240,255,' + alpha + ')';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
    ctx.stroke();

    // Impact flash at ground point
    if (alpha > 0.4) {
        ctx.fillStyle = 'rgba(255,255,220,' + (alpha * 0.9) + ')';
        ctx.beginPath();
        ctx.arc(x2, y2, 6 * alpha, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
};

// Draw a small storm icon (grey cloud + yellow lightning bolt) centred at (cx,cy).
CM._drawStormIcon = function(ctx, cx, cy, alpha) {
    // cloud puffs
    ctx.fillStyle = 'rgba(140,150,170,' + alpha + ')';
    ctx.beginPath(); ctx.arc(cx,     cy - 2, 8,  0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - 6, cy + 3, 6,  0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 6, cy + 3, 6,  0, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx - 12, cy + 3, 24, 7);

    // lightning bolt
    ctx.fillStyle = 'rgba(255,220,30,' + alpha + ')';
    ctx.beginPath();
    ctx.moveTo(cx + 2,  cy - 2);
    ctx.lineTo(cx - 4,  cy + 5);
    ctx.lineTo(cx + 0,  cy + 4);
    ctx.lineTo(cx - 3,  cy + 12);
    ctx.lineTo(cx + 5,  cy + 3);
    ctx.lineTo(cx + 1,  cy + 4);
    ctx.closePath();
    ctx.fill();
};
