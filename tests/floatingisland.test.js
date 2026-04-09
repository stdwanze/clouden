// Minimal canvas ctx mock with all methods used by FloatingIsland
function makeCtx() {
    return {
        save:       jest.fn(),
        restore:    jest.fn(),
        beginPath:  jest.fn(),
        arc:        jest.fn(),
        fill:       jest.fn(),
        fillRect:   jest.fn(),
        strokeRect: jest.fn(),
        translate:  jest.fn(),
        scale:      jest.fn(),
        fillStyle:   '',
        strokeStyle: '',
        globalAlpha: 1,
        lineWidth:   0,
    };
}

// Minimal renderer mock — translateAndZoom mirrors the real implementation.
function makeRenderer(playerZ) {
    var ctx = makeCtx();
    var r = {
        ctxt:     ctx,
        zoom:     playerZ !== undefined ? playerZ : CM.GroundLevel,
        viewport: new CM.Point(-640, -400),
        canvas:   { width: 1280, height: 800 },
        translateAndZoom: function(coord, base) {
            return ((coord - base) * this.zoom) + base;
        },
    };
    return { renderer: r, ctx };
}

// ── constructor ───────────────────────────────────────────────────────────────

describe('CM.FloatingIsland constructor', () => {
    test('z equals CM.FloatLevel', () => {
        const island = new CM.FloatingIsland(new CM.Point(0, 0));
        expect(island.z).toBe(CM.FloatLevel);
    });

    test('handlesOwnAlpha is true', () => {
        const island = new CM.FloatingIsland(new CM.Point(0, 0));
        expect(island.handlesOwnAlpha).toBe(true);
    });

    test('uses generateShape when no shape given', () => {
        const island = new CM.FloatingIsland(new CM.Point(0, 0));
        expect(Array.isArray(island.tiles)).toBe(true);
        expect(Array.isArray(island.tiles[0])).toBe(true);
        const flat = island.tiles.reduce((a, r) => a.concat(r), []);
        expect(flat.some(v => v === 1)).toBe(true);
    });

    test('accepts a custom shape', () => {
        const shape = [[1,1],[1,0]];
        const island = new CM.FloatingIsland(new CM.Point(0, 0), shape);
        expect(island.tiles).toBe(shape);
    });

    test('rows and cols derived from shape', () => {
        const shape = [[1,1,1],[1,1,1]];
        const island = new CM.FloatingIsland(new CM.Point(0, 0), shape);
        expect(island.rows).toBe(2);
        expect(island.cols).toBe(3);
    });

    test('worldW and worldH equal cols/rows × TILE', () => {
        const island = new CM.FloatingIsland(new CM.Point(0, 0));
        expect(island.worldW).toBe(island.cols * island.TILE);
        expect(island.worldH).toBe(island.rows * island.TILE);
    });
});

// ── defaultShape ──────────────────────────────────────────────────────────────

describe('CM.FloatingIsland.defaultShape()', () => {
    test('returns a 2-D array', () => {
        const s = CM.FloatingIsland.defaultShape();
        expect(Array.isArray(s)).toBe(true);
        expect(Array.isArray(s[0])).toBe(true);
    });

    test('all rows have equal length', () => {
        const s = CM.FloatingIsland.defaultShape();
        const len = s[0].length;
        s.forEach(row => expect(row.length).toBe(len));
    });

    test('contains only 0 and 1', () => {
        const s = CM.FloatingIsland.defaultShape();
        s.forEach(row => row.forEach(v => expect([0, 1]).toContain(v)));
    });

    test('has at least one tile set to 1', () => {
        const s = CM.FloatingIsland.defaultShape();
        const flat = s.reduce((a, r) => a.concat(r), []);
        expect(flat.some(v => v === 1)).toBe(true);
    });
});

// ── generateShape ─────────────────────────────────────────────────────────────

describe('CM.FloatingIsland.generateShape()', () => {
    test('returns a 2-D array', () => {
        const s = CM.FloatingIsland.generateShape();
        expect(Array.isArray(s)).toBe(true);
        expect(Array.isArray(s[0])).toBe(true);
    });

    test('all rows have equal length', () => {
        const s = CM.FloatingIsland.generateShape();
        const len = s[0].length;
        s.forEach(row => expect(row.length).toBe(len));
    });

    test('contains only 0 and 1', () => {
        const s = CM.FloatingIsland.generateShape();
        s.forEach(row => row.forEach(v => expect([0, 1]).toContain(v)));
    });

    test('has at least one tile set to 1', () => {
        const s = CM.FloatingIsland.generateShape();
        const flat = s.reduce((a, r) => a.concat(r), []);
        expect(flat.some(v => v === 1)).toBe(true);
    });

    test('size varies between calls', () => {
        const shapes = Array.from({ length: 6 }, () => CM.FloatingIsland.generateShape());
        const sizes  = shapes.map(s => s.length * 1000 + s[0].length);
        expect(new Set(sizes).size).toBeGreaterThan(1);
    });
});

// ── tick & getMidPoint ────────────────────────────────────────────────────────

describe('CM.FloatingIsland tick / getMidPoint', () => {
    test('tick() exists and does not throw', () => {
        const island = new CM.FloatingIsland(new CM.Point(0, 0));
        expect(() => island.tick()).not.toThrow();
    });

    test('getMidPoint() returns center of bounding box', () => {
        const island = new CM.FloatingIsland(new CM.Point(100, 200));
        const mid = island.getMidPoint();
        expect(mid.x).toBe(100 + island.worldW / 2);
        expect(mid.y).toBe(200 + island.worldH / 2);
    });
});

// ── draw — shadow (player below island) ──────────────────────────────────────

describe('CM.FloatingIsland draw() shadow', () => {
    test('draws fillRects for shadow when player is below island', () => {
        const island = new CM.FloatingIsland(new CM.Point(0, 0));
        const { renderer, ctx } = makeRenderer(CM.GroundLevel); // below island
        island.draw(renderer);
        expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(0);
    });

    test('shadow uses dark gray fillStyle', () => {
        const island = new CM.FloatingIsland(new CM.Point(0, 0));
        const { renderer, ctx } = makeRenderer(CM.GroundLevel);
        island.draw(renderer);
        expect(ctx.fillStyle).toBe('#555555');
    });

    test('shadow globalAlpha is less than 1', () => {
        const island = new CM.FloatingIsland(new CM.Point(0, 0));
        const { renderer, ctx } = makeRenderer(CM.GroundLevel);
        var alphaValues = [];
        Object.defineProperty(ctx, 'globalAlpha', {
            get: () => alphaValues[alphaValues.length - 1] ?? 1,
            set: v  => alphaValues.push(v),
            configurable: true,
        });
        island.draw(renderer);
        expect(alphaValues.some(a => a > 0 && a < 1)).toBe(true);
    });
});

// ── draw — island tiles ───────────────────────────────────────────────────────

describe('CM.FloatingIsland draw() tiles', () => {
    function tileCount(shape) {
        return shape.reduce((sum, row) => sum + row.filter(v => v).length, 0);
    }

    test('calls fillRect at least once per active tile when at island level', () => {
        const island = new CM.FloatingIsland(new CM.Point(0, 0));
        const { renderer, ctx } = makeRenderer(CM.FloatLevel);
        island.draw(renderer);
        const count = tileCount(island.tiles);
        expect(ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(count);
    });

    test('draws cliff fillRects for bottom-edge tiles', () => {
        const shape = [[1]];
        const island = new CM.FloatingIsland(new CM.Point(0, 0), shape);
        const { renderer, ctx } = makeRenderer(CM.FloatLevel);
        island.draw(renderer);
        // 1 base + 64 bumps (8×8) + 2 cliff = 67
        expect(ctx.fillRect.mock.calls.length).toBe(67);
    });

    test('no cliff for tile that has a tile below', () => {
        const shape = [[1],[1]];
        const island = new CM.FloatingIsland(new CM.Point(0, 0), shape);
        const { renderer, ctx } = makeRenderer(CM.FloatLevel);
        island.draw(renderer);
        // top tile: 1+64 = 65 (no cliff); bottom tile: 1+64+2 = 67 → total 132
        expect(ctx.fillRect.mock.calls.length).toBe(132);
    });

    test('draws tiles even when player is well above island', () => {
        const island = new CM.FloatingIsland(new CM.Point(0, 0));
        const { renderer, ctx } = makeRenderer(CM.FloatLevel - 0.5); // well above
        island.draw(renderer);
        expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(0);
    });
});

// ── CM.FloatLevel constant ────────────────────────────────────────────────────

describe('CM.FloatLevel', () => {
    test('is between CM.SkyLevel and CM.GroundLevel', () => {
        expect(CM.FloatLevel).toBeGreaterThan(CM.SkyLevel);
        expect(CM.FloatLevel).toBeLessThan(CM.GroundLevel);
    });
});

// ── biomeType ─────────────────────────────────────────────────────────────────

describe('CM.FloatingIsland biomeType', () => {
    const VALID_BIOMES = ['FOREST', 'RUINS', 'SHRINE', 'NEST'];

    test('biomeType is one of the four valid values', () => {
        const island = new CM.FloatingIsland(new CM.Point(0, 0));
        expect(VALID_BIOMES).toContain(island.biomeType);
    });

    test('biomeReady starts as false', () => {
        const island = new CM.FloatingIsland(new CM.Point(0, 0));
        expect(island.biomeReady).toBe(false);
    });

    test('different islands can have different biomes', () => {
        const biomes = new Set();
        for (let i = 0; i < 20; i++) {
            biomes.add(new CM.FloatingIsland(new CM.Point(0, 0)).biomeType);
        }
        expect(biomes.size).toBeGreaterThan(1);
    });
});

// ── populate() ────────────────────────────────────────────────────────────────

describe('CM.FloatingIsland populate()', () => {
    const img = () => ({ width: 32, height: 32, src: '' });

    function makeWorld() {
        return {
            objects: [],
            hitables: {},
            addObject:    jest.fn(),
            removeObject: jest.fn(),
            getObjects:   jest.fn(() => []),
            addHitable:   jest.fn(),
        };
    }

    function makeRepo() {
        return { getImage: jest.fn(() => img()) };
    }

    function makeIsland(biomeType, shape = [[1,1,1],[1,1,1],[1,1,1]]) {
        const island = new CM.FloatingIsland(new CM.Point(0, 0), shape);
        island.biomeType = biomeType;
        return island;
    }

    beforeEach(() => {
        CM.Sound.updateSpatialLoop = () => null;
        CM.Sound.playAt = jest.fn();
    });

    test('populate() sets biomeReady to true', () => {
        const island = makeIsland('SHRINE');
        island.populate(makeWorld(), makeRepo());
        expect(island.biomeReady).toBe(true);
    });

    test('populate() does not run twice (biomeReady guard)', () => {
        const island = makeIsland('SHRINE');
        const world = makeWorld();
        island.populate(world, makeRepo());
        const callsAfterFirst = world.addObject.mock.calls.length;
        island.populate(world, makeRepo()); // second call should be a no-op
        expect(world.addObject.mock.calls.length).toBe(callsAfterFirst);
    });

    test('SHRINE biome adds exactly one shrine object', () => {
        const island = makeIsland('SHRINE');
        const world = makeWorld();
        island.populate(world, makeRepo());
        const shrines = world.addObject.mock.calls.filter(c => c[0].isShrine);
        expect(shrines).toHaveLength(1);
    });

    test('SHRINE assigns a valid buffType', () => {
        const island = makeIsland('SHRINE');
        const world = makeWorld();
        island.populate(world, makeRepo());
        const shrine = world.addObject.mock.calls.find(c => c[0].isShrine)[0];
        expect(['MAX_HEALTH', 'MAX_AMMO', 'BOW_LEVEL']).toContain(shrine.buffType);
    });

    test('RUINS biome adds a chest (isChest) and a dragon', () => {
        const island = makeIsland('RUINS');
        const world = makeWorld();
        island.populate(world, makeRepo());
        const chests  = world.addObject.mock.calls.filter(c => c[0].isChest);
        const dragons = world.addObject.mock.calls.filter(c => c[0] instanceof CM.IslandDragon);
        expect(chests).toHaveLength(1);
        expect(dragons).toHaveLength(1);
    });

    test('NEST biome adds a dragon egg (isEgg)', () => {
        const island = makeIsland('NEST');
        const world = makeWorld();
        island.populate(world, makeRepo());
        const eggs = world.addObject.mock.calls.filter(c => c[0].isEgg);
        expect(eggs).toHaveLength(1);
    });

    test('NEST biome adds 1 or 2 island dragons', () => {
        const island = makeIsland('NEST');
        const world = makeWorld();
        island.populate(world, makeRepo());
        const dragons = world.addObject.mock.calls.filter(c => c[0] instanceof CM.IslandDragon);
        expect(dragons.length).toBeGreaterThanOrEqual(1);
        expect(dragons.length).toBeLessThanOrEqual(2);
    });

    test('FOREST biome adds mineables (wood)', () => {
        const island = makeIsland('FOREST');
        const world = makeWorld();
        island.populate(world, makeRepo());
        const mineables = world.addObject.mock.calls.filter(c => c[0].mineable && c[0].resourceType === 'WOOD');
        expect(mineables.length).toBeGreaterThanOrEqual(3);
        expect(mineables.length).toBeLessThanOrEqual(5);
    });

    test('FOREST biome adds berry bushes', () => {
        const island = makeIsland('FOREST');
        const world = makeWorld();
        island.populate(world, makeRepo());
        const berries = world.addObject.mock.calls.filter(c => c[0].classType === 'BerryBush');
        expect(berries.length).toBeGreaterThanOrEqual(2);
    });

    test('populate() does nothing when no tiles are solid', () => {
        const island = new CM.FloatingIsland(new CM.Point(0, 0), [[0,0],[0,0]]);
        island.biomeType = 'SHRINE';
        const world = makeWorld();
        island.populate(world, makeRepo());
        expect(world.addObject).not.toHaveBeenCalled();
    });
});
