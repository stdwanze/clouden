const { makeRenderer } = require('./helpers');

function makeHut(x = 0, y = 0) {
    return new CM.Blockhut(new CM.Point(x, y));
}

// ---------------------------------------------------------------------------

describe('CM.Blockhut — initial state', () => {
    test('isSafePoint is true', () => {
        expect(makeHut().isSafePoint).toBe(true);
    });

    test('z is GroundLevel', () => {
        expect(makeHut().z).toBe(CM.GroundLevel);
    });

    test('has non-zero size', () => {
        const h = makeHut();
        expect(h.sizeX).toBeGreaterThan(0);
        expect(h.sizeY).toBeGreaterThan(0);
    });

    test('position matches constructor argument', () => {
        const h = makeHut(100, 200);
        expect(h.position.x).toBe(100);
        expect(h.position.y).toBe(200);
    });
});

// ---------------------------------------------------------------------------

describe('CM.Blockhut — draw()', () => {
    let renderer, ctx;
    beforeEach(() => ({ renderer, ctx } = makeRenderer()));

    test('draws multiple rectangles (roof + walls + door)', () => {
        makeHut().draw(renderer);
        expect(ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(5);
    });

    test('does not throw', () => {
        expect(() => makeHut(50, 80).draw(renderer)).not.toThrow();
    });
});

// ---------------------------------------------------------------------------

describe('CM.SaveLoad — blockhut save/load', () => {
    function makeEngine(worldObjects = []) {
        const world = {
            objects: [...worldObjects],
            addObject: jest.fn(),
            removeObject: jest.fn(),
        };
        world.getObjects = jest.fn(() => world.objects);
        const player = {
            position: { x: 0, y: 0 }, z: CM.GroundLevel,
            spriteright: { position: { x: 0, y: 0 } },
            spriteleft:  { position: { x: 0, y: 0 } },
            getScores: () => ({ getAll: () => [] }),
        };
        return {
            player,
            world,
            imagerepo: { getImage: jest.fn(() => ({ width: 32, height: 32 })) },
            inventory: { slots: new Array(16).fill(null) },
        };
    }

    beforeEach(() => {
        localStorage.clear();
        CM.currentSeed = null;
    });

    test('save records blockhut position', () => {
        const hut = makeHut(55, 77);
        CM.currentSeed = 1;
        CM.SaveLoad.save(makeEngine([hut]));
        const state = JSON.parse(localStorage.getItem('clouden_save_v2'));
        expect(state.blockhuts).toHaveLength(1);
        expect(state.blockhuts[0]).toMatchObject({ x: 55, y: 77 });
    });

    test('save records multiple blockhuts', () => {
        CM.currentSeed = 1;
        CM.SaveLoad.save(makeEngine([makeHut(10, 20), makeHut(30, 40)]));
        const state = JSON.parse(localStorage.getItem('clouden_save_v2'));
        expect(state.blockhuts).toHaveLength(2);
    });

    test('load restores blockhut as CM.Blockhut with isSafePoint', () => {
        localStorage.setItem('clouden_save_v2', JSON.stringify({
            v: 2, seed: 1,
            player: { x: 0, y: 0, z: CM.GroundLevel, scores: {} },
            inventory: new Array(16).fill(null),
            mineables: [], collectables: [], blimps: [],
            blockhuts: [{ x: 55, y: 77 }],
        }));
        const engine = makeEngine();
        CM.SaveLoad.load(engine);
        const added = engine.world.addObject.mock.calls.find(c => c[0].isSafePoint);
        expect(added).toBeDefined();
        expect(added[0].position.x).toBe(55);
        expect(added[0].position.y).toBe(77);
    });

    test('load with no blockhuts key does not throw', () => {
        localStorage.setItem('clouden_save_v2', JSON.stringify({
            v: 2, seed: 1,
            player: { x: 0, y: 0, z: CM.GroundLevel, scores: {} },
            inventory: new Array(16).fill(null),
            mineables: [], collectables: [], blimps: [],
        }));
        expect(() => CM.SaveLoad.load(makeEngine())).not.toThrow();
    });

    test('load strips existing blockhuts before restoring', () => {
        const existing = makeHut(0, 0);
        const engine = makeEngine([existing]);
        localStorage.setItem('clouden_save_v2', JSON.stringify({
            v: 2, seed: 1,
            player: { x: 0, y: 0, z: CM.GroundLevel, scores: {} },
            inventory: new Array(16).fill(null),
            mineables: [], collectables: [], blimps: [], blockhuts: [],
        }));
        CM.SaveLoad.load(engine);
        expect(engine.world.objects.some(o => o.isSafePoint)).toBe(false);
    });

    test('round-trip preserves blockhut position', () => {
        CM.currentSeed = 1;
        CM.SaveLoad.save(makeEngine([makeHut(123, 456)]));
        const engine = makeEngine();
        CM.SaveLoad.load(engine);
        const restored = engine.world.addObject.mock.calls.find(c => c[0].isSafePoint)[0];
        expect(restored.position.x).toBe(123);
        expect(restored.position.y).toBe(456);
    });
});
