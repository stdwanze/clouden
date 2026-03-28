function makeEngine(worldObjects = []) {
    const world = {
        objects: [...worldObjects],
        addObject: jest.fn(),
        removeObject: jest.fn(),
    };
    world.getObjects = jest.fn(() => world.objects);

    const imagerepo = { getImage: jest.fn(key => ({ key, width: 32, height: 32 })) };
    const inventory = { slots: new Array(16).fill(null) };
    const player = {
        position: { x: 0, y: 0 },
        z: CM.GroundLevel,
        spriteright: { position: { x: 0, y: 0 } },
        spriteleft:  { position: { x: 0, y: 0 } },
        getScores: () => ({ getAll: () => [] }),
    };
    return { player, world, imagerepo, inventory };
}

function makeSaveJson(mineables = [], extra = {}) {
    return JSON.stringify({
        v: 2, seed: 1,
        player: { x: 0, y: 0, z: CM.GroundLevel, scores: {} },
        inventory: new Array(16).fill(null),
        mineables,
        collectables: [],
        blimps: [],
        ...extra,
    });
}

beforeEach(() => {
    localStorage.clear();
    CM.currentSeed = null;
});

// ---------------------------------------------------------------------------

describe('CM.SaveLoad.getSavedSeed', () => {
    test('returns null when nothing is saved', () => {
        expect(CM.SaveLoad.getSavedSeed()).toBeNull();
    });

    test('returns the stored seed for a valid v2 save', () => {
        localStorage.setItem('clouden_save_v2', makeSaveJson([], { seed: 42 }));
        expect(CM.SaveLoad.getSavedSeed()).toBe(42);
    });

    test('returns null for wrong schema version', () => {
        localStorage.setItem('clouden_save_v2', JSON.stringify({ v: 1, seed: 99 }));
        expect(CM.SaveLoad.getSavedSeed()).toBeNull();
    });

    test('returns null for invalid JSON', () => {
        localStorage.setItem('clouden_save_v2', 'not json');
        expect(CM.SaveLoad.getSavedSeed()).toBeNull();
    });
});

// ---------------------------------------------------------------------------

describe('CM.SaveLoad.clear', () => {
    test('removes the saved state so getSavedSeed returns null', () => {
        CM.currentSeed = 7;
        CM.SaveLoad.save(makeEngine());
        CM.SaveLoad.clear();
        expect(CM.SaveLoad.getSavedSeed()).toBeNull();
    });
});

// ---------------------------------------------------------------------------

describe('CM.SaveLoad.save — mineables', () => {
    test('records resourceType for STONE', () => {
        const stone = new CM.Mineable(new CM.Point(10, 20), 'STONE');
        CM.currentSeed = 1;
        CM.SaveLoad.save(makeEngine([stone]));
        const state = JSON.parse(localStorage.getItem('clouden_save_v2'));
        expect(state.mineables[0].resourceType).toBe('STONE');
    });

    test('records resourceType for WOOD', () => {
        const tree = new CM.Mineable(new CM.Point(30, 40), 'WOOD');
        CM.currentSeed = 1;
        CM.SaveLoad.save(makeEngine([tree]));
        const state = JSON.parse(localStorage.getItem('clouden_save_v2'));
        expect(state.mineables[0].resourceType).toBe('WOOD');
    });

    test('records hitsReceived', () => {
        const stone = new CM.Mineable(new CM.Point(0, 0), 'STONE');
        stone.hitsReceived = 3;
        CM.currentSeed = 1;
        CM.SaveLoad.save(makeEngine([stone]));
        const state = JSON.parse(localStorage.getItem('clouden_save_v2'));
        expect(state.mineables[0].hitsReceived).toBe(3);
    });

    test('records seed from CM.currentSeed', () => {
        CM.currentSeed = 55;
        CM.SaveLoad.save(makeEngine());
        const state = JSON.parse(localStorage.getItem('clouden_save_v2'));
        expect(state.seed).toBe(55);
    });
});

// ---------------------------------------------------------------------------

describe('CM.SaveLoad.load — mineable image mapping', () => {
    test('requests mineable_rock image for STONE (not mineable_stone)', () => {
        localStorage.setItem('clouden_save_v2', makeSaveJson([
            { x: 10, y: 20, resourceType: 'STONE', hitsReceived: 0, hitsRequired: 5 },
        ]));
        const engine = makeEngine();
        CM.SaveLoad.load(engine);

        const requested = engine.imagerepo.getImage.mock.calls.map(c => c[0]);
        expect(requested).toContain('mineable_rock');
        expect(requested).not.toContain('mineable_stone');
    });

    test('requests mineable_tree image for WOOD (not mineable_wood)', () => {
        localStorage.setItem('clouden_save_v2', makeSaveJson([
            { x: 10, y: 20, resourceType: 'WOOD', hitsReceived: 0, hitsRequired: 3 },
        ]));
        const engine = makeEngine();
        CM.SaveLoad.load(engine);

        const requested = engine.imagerepo.getImage.mock.calls.map(c => c[0]);
        expect(requested).toContain('mineable_tree');
        expect(requested).not.toContain('mineable_wood');
    });

    test('adds one mineable object to the world per saved entry', () => {
        localStorage.setItem('clouden_save_v2', makeSaveJson([
            { x: 0, y: 0, resourceType: 'STONE', hitsReceived: 0, hitsRequired: 5 },
            { x: 10, y: 10, resourceType: 'WOOD',  hitsReceived: 0, hitsRequired: 3 },
        ]));
        const engine = makeEngine();
        CM.SaveLoad.load(engine);
        expect(engine.world.addObject).toHaveBeenCalledTimes(2);
        expect(engine.world.addObject.mock.calls[0][0].mineable).toBe(true);
        expect(engine.world.addObject.mock.calls[1][0].mineable).toBe(true);
    });

    test('restores hitsReceived on the reconstructed object', () => {
        localStorage.setItem('clouden_save_v2', makeSaveJson([
            { x: 0, y: 0, resourceType: 'STONE', hitsReceived: 4, hitsRequired: 5 },
        ]));
        const engine = makeEngine();
        CM.SaveLoad.load(engine);
        const added = engine.world.addObject.mock.calls[0][0];
        expect(added.hitsReceived).toBe(4);
    });

    test('strips existing mineables from world before restoring', () => {
        const existing = new CM.Mineable(new CM.Point(0, 0), 'STONE');
        const engine = makeEngine([existing]);
        localStorage.setItem('clouden_save_v2', makeSaveJson([]));
        CM.SaveLoad.load(engine);
        expect(engine.world.objects.some(o => o.mineable)).toBe(false);
    });

    test('returns false when nothing is in localStorage', () => {
        expect(CM.SaveLoad.load(makeEngine())).toBe(false);
    });
});

// ---------------------------------------------------------------------------

describe('CM.SaveLoad save/load round-trip', () => {
    test('preserves mineable position and hitsReceived', () => {
        const stone = new CM.Mineable(new CM.Point(55, 77), 'STONE');
        stone.hitsReceived = 2;
        CM.currentSeed = 5;
        CM.SaveLoad.save(makeEngine([stone]));

        const loadEngine = makeEngine();
        CM.SaveLoad.load(loadEngine);
        const restored = loadEngine.world.addObject.mock.calls[0][0];
        expect(restored.position.x).toBe(55);
        expect(restored.position.y).toBe(77);
        expect(restored.hitsReceived).toBe(2);
    });

    test('preserves resourceType across save and load', () => {
        const tree = new CM.Mineable(new CM.Point(0, 0), 'WOOD');
        CM.currentSeed = 1;
        CM.SaveLoad.save(makeEngine([tree]));

        const loadEngine = makeEngine();
        CM.SaveLoad.load(loadEngine);
        const restored = loadEngine.world.addObject.mock.calls[0][0];
        expect(restored.resourceType).toBe('WOOD');
    });
});
