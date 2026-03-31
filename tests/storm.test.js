beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

// Helper: advance a StormManager by N ticks
function tick(storm, n) {
    for (var i = 0; i < n; i++) storm.tick();
}

// ── CM.StormManager — initial state ──────────────────────────────────────────

describe('CM.StormManager initial state', () => {
    test('starts in IDLE phase', () => {
        const s = new CM.StormManager();
        expect(s.phase).toBe('IDLE');
    });

    test('isActive() is false', () => {
        expect(new CM.StormManager().isActive()).toBe(false);
    });

    test('isWarning() is false', () => {
        expect(new CM.StormManager().isWarning()).toBe(false);
    });

    test('hasPendingStrike() is false', () => {
        expect(new CM.StormManager().hasPendingStrike()).toBe(false);
    });

    test('activeStrikes is empty', () => {
        expect(new CM.StormManager().activeStrikes).toHaveLength(0);
    });

    test('first idle countdown is 900 frames (30 s)', () => {
        expect(new CM.StormManager().idleFrames).toBe(900);
    });
});

// ── CM.StormManager — IDLE → WARNING transition ───────────────────────────────

describe('CM.StormManager IDLE → WARNING', () => {
    test('transitions to WARNING after 900 ticks', () => {
        const s = new CM.StormManager();
        tick(s, 900);
        expect(s.phase).toBe('WARNING');
        expect(s.isWarning()).toBe(true);
    });

    test('sets warningFrames to 900 on transition', () => {
        const s = new CM.StormManager();
        tick(s, 900);
        expect(s.warningFrames).toBe(900);
    });

    test('stays IDLE before 900 ticks', () => {
        const s = new CM.StormManager();
        tick(s, 899);
        expect(s.phase).toBe('IDLE');
    });
});

// ── CM.StormManager — WARNING phase ──────────────────────────────────────────

describe('CM.StormManager WARNING phase', () => {
    function warningStorm() {
        const s = new CM.StormManager();
        tick(s, 900);
        return s;
    }

    test('getWarningCountdown() returns 30 at start of warning', () => {
        const s = warningStorm();
        expect(s.getWarningCountdown()).toBe(30);
    });

    test('getWarningCountdown() decrements each 30 ticks', () => {
        const s = warningStorm();
        tick(s, 30);
        expect(s.getWarningCountdown()).toBe(29);
    });

    test('transitions to ACTIVE after 900 warning ticks', () => {
        const s = warningStorm();
        tick(s, 900);
        expect(s.phase).toBe('ACTIVE');
        expect(s.isActive()).toBe(true);
        expect(s.isWarning()).toBe(false);
    });

    test('stays WARNING before 900 warning ticks', () => {
        const s = warningStorm();
        tick(s, 899);
        expect(s.phase).toBe('WARNING');
    });
});

// ── CM.StormManager — ACTIVE phase ───────────────────────────────────────────

describe('CM.StormManager ACTIVE phase', () => {
    function activeStorm() {
        const s = new CM.StormManager();
        // Force straight into ACTIVE with deterministic duration
        s.phase        = 'ACTIVE';
        s.activeFrames = 500;
        s.nextFlashIn  = 10;
        s.nextStrikeIn = 20;
        return s;
    }

    test('isActive() returns true', () => {
        expect(activeStorm().isActive()).toBe(true);
    });

    test('getFlashAlpha() is 0 when no flash is running', () => {
        const s = activeStorm();
        s.flashFrames = 0;
        expect(s.getFlashAlpha()).toBe(0);
    });

    test('getFlashAlpha() > 0 when flashFrames > 0', () => {
        const s = activeStorm();
        s.flashFrames = 8;
        expect(s.getFlashAlpha()).toBeGreaterThan(0);
    });

    test('getFlashAlpha() does not exceed 0.75', () => {
        const s = activeStorm();
        s.flashFrames = 16; // maximum possible
        expect(s.getFlashAlpha()).toBeLessThanOrEqual(0.75);
    });

    test('flashFrames decrements each tick', () => {
        const s = activeStorm();
        s.flashFrames = 5;
        s.tick();
        expect(s.flashFrames).toBe(4);
    });

    test('nextFlashIn triggers a flash when it reaches 0', () => {
        const s = activeStorm();
        s.nextFlashIn = 1;
        s.flashFrames = 0;
        s.tick();
        expect(s.flashFrames).toBeGreaterThan(0);
    });

    test('pendingStrike set when nextStrikeIn reaches 0', () => {
        const s = activeStorm();
        s.nextStrikeIn = 1;
        s.tick();
        expect(s.hasPendingStrike()).toBe(true);
    });

    test('activeFrames decrements each tick', () => {
        const s = activeStorm();
        const before = s.activeFrames;
        s.tick();
        expect(s.activeFrames).toBe(before - 1);
    });

    test('returns to IDLE when activeFrames exhausted', () => {
        const s = activeStorm();
        s.activeFrames = 1;
        s.nextFlashIn  = 999;
        s.nextStrikeIn = 999;
        s.tick();
        expect(s.phase).toBe('IDLE');
        expect(s.isActive()).toBe(false);
    });

    test('new idleFrames after storm is within valid range (900–18000)', () => {
        const s = activeStorm();
        s.activeFrames = 1;
        s.nextFlashIn  = 999;
        s.nextStrikeIn = 999;
        s.tick();
        expect(s.idleFrames).toBeGreaterThanOrEqual(900);
        expect(s.idleFrames).toBeLessThanOrEqual(18000);
    });

    test('activeStrikes cleared when storm ends', () => {
        const s = activeStorm();
        s.addStrike(10, 20);
        s.activeFrames = 1;
        s.nextFlashIn  = 999;
        s.nextStrikeIn = 999;
        s.tick();
        expect(s.activeStrikes).toHaveLength(0);
    });
});

// ── CM.StormManager — addStrike ───────────────────────────────────────────────

describe('CM.StormManager addStrike', () => {
    test('clears pendingStrike flag', () => {
        const s = new CM.StormManager();
        s._pendingStrike = true;
        s.addStrike(0, 0);
        expect(s.hasPendingStrike()).toBe(false);
    });

    test('adds a strike to activeStrikes', () => {
        const s = new CM.StormManager();
        s.addStrike(100, 200);
        expect(s.activeStrikes).toHaveLength(1);
    });

    test('strike has correct coordinates', () => {
        const s = new CM.StormManager();
        s.addStrike(100, 200);
        expect(s.activeStrikes[0].x).toBe(100);
        expect(s.activeStrikes[0].y).toBe(200);
    });

    test('strike starts with 22 frames', () => {
        const s = new CM.StormManager();
        s.addStrike(0, 0);
        expect(s.activeStrikes[0].frames).toBe(22);
        expect(s.activeStrikes[0].totalFrames).toBe(22);
    });

    test('strike bolt has 11 points (segments 0–10)', () => {
        const s = new CM.StormManager();
        s.addStrike(0, 0);
        expect(s.activeStrikes[0].bolt).toHaveLength(11);
    });

    test('bolt endpoints have ox === 0', () => {
        const s = new CM.StormManager();
        s.addStrike(0, 0);
        const bolt = s.activeStrikes[0].bolt;
        expect(bolt[0].ox).toBe(0);
        expect(bolt[bolt.length - 1].ox).toBe(0);
    });

    test('bolt t values go from 0 to 1', () => {
        const s = new CM.StormManager();
        s.addStrike(0, 0);
        const bolt = s.activeStrikes[0].bolt;
        expect(bolt[0].t).toBe(0);
        expect(bolt[bolt.length - 1].t).toBe(1);
    });
});

// ── CM.StormManager — strike aging ───────────────────────────────────────────

describe('CM.StormManager strike aging', () => {
    test('strike frames decrement each tick in ACTIVE phase', () => {
        const s = new CM.StormManager();
        s.phase        = 'ACTIVE';
        s.activeFrames = 999;
        s.nextFlashIn  = 999;
        s.nextStrikeIn = 999;
        s.addStrike(0, 0);
        s.tick();
        expect(s.activeStrikes[0].frames).toBe(21);
    });

    test('strike removed after 22 ticks', () => {
        const s = new CM.StormManager();
        s.phase        = 'ACTIVE';
        s.activeFrames = 999;
        s.nextFlashIn  = 999;
        s.nextStrikeIn = 999;
        s.addStrike(0, 0);
        tick(s, 22);
        expect(s.activeStrikes).toHaveLength(0);
    });

    test('multiple strikes age independently', () => {
        const s = new CM.StormManager();
        s.phase        = 'ACTIVE';
        s.activeFrames = 999;
        s.nextFlashIn  = 999;
        s.nextStrikeIn = 999;
        s.addStrike(0, 0);
        tick(s, 11);
        s.addStrike(10, 10);
        tick(s, 11);
        // first strike: 22 ticks → gone; second: 11 ticks → still alive
        expect(s.activeStrikes).toHaveLength(1);
        expect(s.activeStrikes[0].x).toBe(10);
    });
});

// ── CM.drawLightningBolt ──────────────────────────────────────────────────────

describe('CM.drawLightningBolt', () => {
    function makeCtx() {
        return {
            save: jest.fn(), restore: jest.fn(),
            beginPath: jest.fn(), moveTo: jest.fn(),
            lineTo: jest.fn(), stroke: jest.fn(),
            arc: jest.fn(), fill: jest.fn(),
            shadowColor: '', shadowBlur: 0,
            strokeStyle: '', lineWidth: 0, lineJoin: '',
            fillStyle: '',
        };
    }

    function makeBolt() {
        return new CM.StormManager()._makeBolt();
    }

    test('calls save and restore', () => {
        const ctx = makeCtx();
        CM.drawLightningBolt(ctx, 0, 0, 10, 100, makeBolt(), 1.0);
        expect(ctx.save).toHaveBeenCalled();
        expect(ctx.restore).toHaveBeenCalled();
    });

    test('calls stroke at least twice (glow + core pass)', () => {
        const ctx = makeCtx();
        CM.drawLightningBolt(ctx, 0, 0, 10, 100, makeBolt(), 1.0);
        expect(ctx.stroke.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    test('draws impact flash when alpha > 0.4', () => {
        const ctx = makeCtx();
        CM.drawLightningBolt(ctx, 0, 0, 10, 100, makeBolt(), 0.8);
        expect(ctx.arc).toHaveBeenCalled();
        expect(ctx.fill).toHaveBeenCalled();
    });

    test('skips impact flash when alpha <= 0.4', () => {
        const ctx = makeCtx();
        CM.drawLightningBolt(ctx, 0, 0, 10, 100, makeBolt(), 0.4);
        expect(ctx.arc).not.toHaveBeenCalled();
    });

    test('first moveTo uses the first bolt point', () => {
        const ctx = makeCtx();
        const bolt = [
            { t: 0, ox: 0 }, { t: 0.5, ox: 5 }, { t: 1, ox: 0 }
        ];
        CM.drawLightningBolt(ctx, 10, 20, 10, 120, bolt, 1.0);
        // first point: x = 10 + 0*0 + 0 = 10, y = 20 + 0*100 = 20
        expect(ctx.moveTo).toHaveBeenCalledWith(10, 20);
    });
});

// ── CM._drawStormIcon ─────────────────────────────────────────────────────────

describe('CM._drawStormIcon', () => {
    function makeCtx() {
        return {
            fillStyle: '',
            beginPath: jest.fn(), arc: jest.fn(), fill: jest.fn(),
            fillRect: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(),
            closePath: jest.fn(),
        };
    }

    test('calls arc for cloud puffs', () => {
        const ctx = makeCtx();
        CM._drawStormIcon(ctx, 50, 50, 1.0);
        expect(ctx.arc.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    test('calls fillRect for cloud base', () => {
        const ctx = makeCtx();
        CM._drawStormIcon(ctx, 50, 50, 1.0);
        expect(ctx.fillRect).toHaveBeenCalled();
    });

    test('calls fill for cloud and bolt', () => {
        const ctx = makeCtx();
        CM._drawStormIcon(ctx, 50, 50, 1.0);
        expect(ctx.fill.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
});
