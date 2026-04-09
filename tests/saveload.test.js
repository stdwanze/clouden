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
        v: 3, seed: 1,
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
        localStorage.setItem('clouden_save_v3', makeSaveJson([], { seed: 42 }));
        expect(CM.SaveLoad.getSavedSeed()).toBe(42);
    });

    test('returns null for wrong schema version', () => {
        localStorage.setItem('clouden_save_v3', JSON.stringify({ v: 1, seed: 99 }));
        expect(CM.SaveLoad.getSavedSeed()).toBeNull();
    });

    test('returns null for invalid JSON', () => {
        localStorage.setItem('clouden_save_v3', 'not json');
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
        const state = JSON.parse(localStorage.getItem('clouden_save_v3'));
        expect(state.mineables[0].resourceType).toBe('STONE');
    });

    test('records resourceType for WOOD', () => {
        const tree = new CM.Mineable(new CM.Point(30, 40), 'WOOD');
        CM.currentSeed = 1;
        CM.SaveLoad.save(makeEngine([tree]));
        const state = JSON.parse(localStorage.getItem('clouden_save_v3'));
        expect(state.mineables[0].resourceType).toBe('WOOD');
    });

    test('records hitsReceived', () => {
        const stone = new CM.Mineable(new CM.Point(0, 0), 'STONE');
        stone.hitsReceived = 3;
        CM.currentSeed = 1;
        CM.SaveLoad.save(makeEngine([stone]));
        const state = JSON.parse(localStorage.getItem('clouden_save_v3'));
        expect(state.mineables[0].hitsReceived).toBe(3);
    });

    test('records seed from CM.currentSeed', () => {
        CM.currentSeed = 55;
        CM.SaveLoad.save(makeEngine());
        const state = JSON.parse(localStorage.getItem('clouden_save_v3'));
        expect(state.seed).toBe(55);
    });
});

// ---------------------------------------------------------------------------

describe('CM.SaveLoad.load — mineable image mapping', () => {
    test('requests mineable_rock image for STONE (not mineable_stone)', () => {
        localStorage.setItem('clouden_save_v3', makeSaveJson([
            { x: 10, y: 20, resourceType: 'STONE', hitsReceived: 0, hitsRequired: 5 },
        ]));
        const engine = makeEngine();
        CM.SaveLoad.load(engine);

        const requested = engine.imagerepo.getImage.mock.calls.map(c => c[0]);
        expect(requested).toContain('mineable_rock');
        expect(requested).not.toContain('mineable_stone');
    });

    test('requests mineable_tree image for WOOD (not mineable_wood)', () => {
        localStorage.setItem('clouden_save_v3', makeSaveJson([
            { x: 10, y: 20, resourceType: 'WOOD', hitsReceived: 0, hitsRequired: 3 },
        ]));
        const engine = makeEngine();
        CM.SaveLoad.load(engine);

        const requested = engine.imagerepo.getImage.mock.calls.map(c => c[0]);
        expect(requested).toContain('mineable_tree');
        expect(requested).not.toContain('mineable_wood');
    });

    test('adds one mineable object to the world per saved entry', () => {
        localStorage.setItem('clouden_save_v3', makeSaveJson([
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
        localStorage.setItem('clouden_save_v3', makeSaveJson([
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
        localStorage.setItem('clouden_save_v3', makeSaveJson([]));
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

// ---------------------------------------------------------------------------

describe('CM.SaveLoad — score max values', () => {
    function makeEngineWithScores(scores = []) {
        const world = {
            objects: [],
            addObject: jest.fn(),
            removeObject: jest.fn(),
            getObjects: jest.fn(() => []),
        };
        const player = {
            position: { x: 0, y: 0 }, z: CM.GroundLevel,
            spriteright: { position: { x: 0, y: 0 } },
            spriteleft:  { position: { x: 0, y: 0 } },
            getScores: () => ({
                getAll: () => scores,
            }),
        };
        return { player, world, imagerepo: { getImage: jest.fn(() => ({ width: 32, height: 32 })) }, inventory: { slots: new Array(16).fill(null) } };
    }

    test('save stores score max values in JSON', () => {
        const score = { getName: () => 'HEALTH', getScore: () => 8, getMax: () => 13, score: 8, max: 13 };
        const engine = makeEngineWithScores([score]);
        CM.currentSeed = 1;
        CM.SaveLoad.save(engine);
        const state = JSON.parse(localStorage.getItem('clouden_save_v3'));
        expect(state.player.scores['HEALTH_max']).toBe(13);
    });

    test('load restores score max values', () => {
        const score = { getName: () => 'HEALTH', getScore: () => 8, getMax: () => 10, score: 8, max: 10 };
        const engine = makeEngineWithScores([score]);
        CM.currentSeed = 1;
        CM.SaveLoad.save(engine);

        // load with a fresh score object
        const restoredScore = { getName: () => 'HEALTH', getScore: () => 5, getMax: () => 10, score: 5, max: 10 };
        const loadEngine = makeEngineWithScores([restoredScore]);
        CM.SaveLoad.load(loadEngine);
        expect(restoredScore.max).toBe(10);
    });
});

// ---------------------------------------------------------------------------

describe('CM.SaveLoad — shrine save/load', () => {
    function makeEngineWithShrines(shrines = []) {
        const objects = [...shrines];
        const world = {
            objects,
            addObject: jest.fn(),
            removeObject: jest.fn(),
            getObjects: jest.fn(() => objects),
        };
        const player = {
            position: { x: 0, y: 0 }, z: CM.GroundLevel,
            spriteright: { position: { x: 0, y: 0 } },
            spriteleft:  { position: { x: 0, y: 0 } },
            getScores: () => ({ getAll: () => [] }),
        };
        return { player, world, imagerepo: { getImage: jest.fn(() => ({ width: 32, height: 32 })) }, inventory: { slots: new Array(16).fill(null) } };
    }

    test('save records shrine position, used state, and buffType', () => {
        const img = { width: 32, height: 32 };
        const shrine = new CM.Shrine(new CM.Point(100, 200), img);
        shrine.used = true;
        shrine.buffType = 'MAX_HEALTH';
        const engine = makeEngineWithShrines([shrine]);
        CM.currentSeed = 1;
        CM.SaveLoad.save(engine);
        const state = JSON.parse(localStorage.getItem('clouden_save_v3'));
        expect(state.shrines).toHaveLength(1);
        expect(state.shrines[0]).toMatchObject({ x: 100, y: 200, used: true, buffType: 'MAX_HEALTH' });
    });

    test('save records unused shrine correctly', () => {
        const img = { width: 32, height: 32 };
        const shrine = new CM.Shrine(new CM.Point(50, 60), img);
        shrine.buffType = 'BOW_LEVEL';
        const engine = makeEngineWithShrines([shrine]);
        CM.currentSeed = 1;
        CM.SaveLoad.save(engine);
        const state = JSON.parse(localStorage.getItem('clouden_save_v3'));
        expect(state.shrines[0].used).toBe(false);
    });

    test('load restores shrine used state by position', () => {
        const img = { width: 32, height: 32 };
        const shrine = new CM.Shrine(new CM.Point(100, 200), img);
        shrine.buffType = 'MAX_AMMO';
        const engine = makeEngineWithShrines([shrine]);
        CM.currentSeed = 1;
        CM.SaveLoad.save(engine);

        // mark used, then reload
        shrine.used = true;
        CM.SaveLoad.save(engine); // save with used = true

        // load into a fresh shrine at same position
        const freshShrine = new CM.Shrine(new CM.Point(100, 200), img);
        freshShrine.buffType = 'MAX_AMMO';
        const loadEngine = makeEngineWithShrines([freshShrine]);
        CM.SaveLoad.load(loadEngine);
        expect(freshShrine.used).toBe(true);
    });

    test('load preserves buffType on shrine', () => {
        const img = { width: 32, height: 32 };
        const shrine = new CM.Shrine(new CM.Point(10, 10), img);
        shrine.buffType = 'BOW_LEVEL';
        shrine.used = false;
        const engine = makeEngineWithShrines([shrine]);
        CM.currentSeed = 1;
        CM.SaveLoad.save(engine);

        const freshShrine = new CM.Shrine(new CM.Point(10, 10), img);
        const loadEngine = makeEngineWithShrines([freshShrine]);
        CM.SaveLoad.load(loadEngine);
        expect(freshShrine.buffType).toBe('BOW_LEVEL');
    });

    test('load with no shrines key does not throw', () => {
        localStorage.setItem('clouden_save_v3', JSON.stringify({
            v: 3, seed: 1,
            player: { x: 0, y: 0, z: CM.GroundLevel, scores: {} },
            inventory: new Array(16).fill(null),
            mineables: [], collectables: [], blimps: [],
        }));
        expect(() => CM.SaveLoad.load(makeEngineWithShrines([]))).not.toThrow();
    });
});
