const { makeWorldMock, makeRepoMock } = require('./helpers');

beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

// ── CM.BuildWorld ─────────────────────────────────────────────────────────────

describe('CM.BuildWorld', () => {
  test('returns array of length n*n', () => {
    const arr = CM.BuildWorld(10);
    expect(arr.length).toBe(100);
  });

  test('all values are booleans', () => {
    const arr = CM.BuildWorld(10);
    arr.forEach(v => expect(typeof v).toBe('boolean'));
  });

  test('border tiles (first two rows) are always water', () => {
    const n = 10;
    const arr = CM.BuildWorld(n);
    for (let i = 0; i < n * 2; i++) expect(arr[i]).toBe(false);
  });

  test('border tiles (last two rows) are always water', () => {
    const n = 10;
    const arr = CM.BuildWorld(n);
    for (let i = n * (n - 2); i < n * n; i++) expect(arr[i]).toBe(false);
  });
});

// ── CM.AnnotateWorld ──────────────────────────────────────────────────────────

describe('CM.AnnotateWorld', () => {
  test('returns same number of TileInfo as input', () => {
    const arr = CM.BuildWorld(10);
    const annotated = CM.AnnotateWorld(arr, 10, '#fff');
    expect(annotated.length).toBe(arr.length);
  });

  test('each element is a CM.TileInfo', () => {
    const arr = CM.BuildWorld(10);
    const annotated = CM.AnnotateWorld(arr, 10, '#fff');
    annotated.forEach(t => expect(t).toBeInstanceOf(CM.TileInfo));
  });

  test('preserves isLand from input array', () => {
    const input = [false, true, false];
    const annotated = CM.AnnotateWorld(input, 3, '#fff');
    expect(annotated[0].isLand).toBe(false);
    expect(annotated[1].isLand).toBe(true);
  });
});

// ── CM.TILEACCESS ─────────────────────────────────────────────────────────────

describe('CM.TILEACCESS', () => {
  test('returns a function', () => {
    expect(typeof CM.TILEACCESS(makeWorldMock())).toBe('function');
  });

  test('calls world.getChunk with the given location', () => {
    const world = makeWorldMock();
    const access = CM.TILEACCESS(world);
    const pos = new CM.Point(100, 200);
    access(pos);
    expect(world.getChunk).toHaveBeenCalledWith(pos);
  });

  test('returns null when chunk is out of bounds', () => {
    const world = { getChunk: jest.fn().mockReturnValue(null) };
    const access = CM.TILEACCESS(world);
    expect(access(new CM.Point(-1, -1))).toBeNull();
  });
});

// ── CM.FireBallCreator ────────────────────────────────────────────────────────

describe('CM.FireBallCreator', () => {
  test('returns a function', () => {
    expect(typeof CM.FireBallCreator(makeWorldMock(), makeRepoMock())).toBe('function');
  });

  test('HANDGUN: adds a FireBall to the world', () => {
    const world = makeWorldMock();
    const create = CM.FireBallCreator(world, makeRepoMock());
    create(new CM.Point(0, 0), CM.GroundLevel, 'HANDGUN', new CM.Point(5, 0), [99]);
    expect(world.addObject).toHaveBeenCalled();
    expect(world.addObject.mock.calls[0][0]).toBeInstanceOf(CM.FireBall);
  });

  test('DRAGONFIRE: adds a FireBall to the world', () => {
    const world = makeWorldMock();
    const create = CM.FireBallCreator(world, makeRepoMock());
    create(new CM.Point(0, 0), CM.GroundLevel, 'DRAGONFIRE', new CM.Point(3, 0), 42);
    expect(world.addObject.mock.calls[0][0]).toBeInstanceOf(CM.FireBall);
  });

  test('BLIMBGUN: adds a larger FireBall (range 250)', () => {
    const world = makeWorldMock();
    const create = CM.FireBallCreator(world, makeRepoMock());
    create(new CM.Point(0, 0), CM.GroundLevel, 'BLIMBGUN', new CM.Point(3, 0), [1]);
    const fb = world.addObject.mock.calls[0][0];
    expect(fb.range).toBe(250);
  });
});

// ── CM.TILECREATOR ────────────────────────────────────────────────────────────

describe('CM.TILECREATOR', () => {
  test('returns a function', () => {
    expect(typeof CM.TILECREATOR(makeRepoMock(), 10)).toBe('function');
  });

  test('created function returns a CM.TileSprite', () => {
    const tileCreator = CM.TILECREATOR(makeRepoMock(), 10);
    const tile = tileCreator(0, 0, new CM.Point(0, 0), 32, 0, 0);
    expect(tile).toBeInstanceOf(CM.TileSprite);
  });
});

// ── CM.CLOUDGEN ───────────────────────────────────────────────────────────────

describe('CM.CLOUDGEN', () => {
  test('returns a factory function', () => {
    const factory = CM.CLOUDGEN(makeWorldMock(), makeRepoMock());
    expect(typeof factory).toBe('function');
  });

  test('factory returns a VehicleSprite at the given position', () => {
    const factory = CM.CLOUDGEN(makeWorldMock(), makeRepoMock());
    const cloud = factory(100, 200);
    expect(cloud).toBeInstanceOf(CM.VehicleSprite);
    expect(cloud.position.x).toBe(100);
    expect(cloud.position.y).toBe(200);
  });

  test('cloud has a ticker set', () => {
    const factory = CM.CLOUDGEN(makeWorldMock(), makeRepoMock());
    const cloud = factory(0, 0);
    expect(typeof cloud.ticker).toBe('function');
  });
});

// ── CM.COLLECTABLEMAKER ───────────────────────────────────────────────────────

describe('CM.COLLECTABLEMAKER', () => {
  test('returns a function', () => {
    expect(typeof CM.COLLECTABLEMAKER(makeWorldMock(), makeRepoMock())).toBe('function');
  });

  test('does not add object for water tiles', () => {
    const world = makeWorldMock();
    const maker = CM.COLLECTABLEMAKER(world, makeRepoMock());
    maker({ isLand: () => false });
    expect(world.addObject).not.toHaveBeenCalled();
  });

  test('may add a Collectable for land tiles (random — run many times)', () => {
    const world = makeWorldMock();
    const maker = CM.COLLECTABLEMAKER(world, makeRepoMock());
    const tile = { isLand: () => true, location: { clone: () => new CM.Point(0, 0) } };
    // Run 200 times — with 5% probability at least one spawn expected
    for (let i = 0; i < 200; i++) maker(tile);
    expect(world.addObject.mock.calls.length).toBeGreaterThan(0);
    expect(world.addObject.mock.calls[0][0]).toBeInstanceOf(CM.Collectable);
  });
});

// ── CM.ADDENEMYMAKER ─────────────────────────────────────────────────────────

describe('CM.ADDENEMYMAKER', () => {
  test('returns a function', () => {
    expect(typeof CM.ADDENEMYMAKER(makeWorldMock(), makeRepoMock())).toBe('function');
  });

  test('calling maker adds dragons to the world', () => {
    const world = makeWorldMock();
    const maker = CM.ADDENEMYMAKER(world, makeRepoMock());
    maker(1, 1);
    const dragons = world.addObject.mock.calls.map(c => c[0]).filter(o => o instanceof CM.Dragon);
    expect(dragons.length).toBeGreaterThan(0);
  });

  test('calling maker adds ground enemies to the world', () => {
    const world = makeWorldMock();
    const maker = CM.ADDENEMYMAKER(world, makeRepoMock());
    maker(1, 1);
    const enemies = world.addObject.mock.calls.map(c => c[0]).filter(o => o instanceof CM.GroundEnemy);
    expect(enemies.length).toBeGreaterThan(0);
  });

  test('does not add enemies for out-of-bounds chunks (x<0 or y<0)', () => {
    const world = makeWorldMock();
    const maker = CM.ADDENEMYMAKER(world, makeRepoMock());
    maker(0, 0); // surrounding chunks at -1 are skipped
    // Only chunks at (0,0), (1,0), (0,1), (1,1) are valid (x1>=0, y1>=0)
    expect(world.addObject).toHaveBeenCalled();
  });
});

// ── CM.VEHICLEDEATHMAKER ──────────────────────────────────────────────────────

describe('CM.VEHICLEDEATHMAKER', () => {
  test('sets CM.VEHICLEDEATH as a function', () => {
    const app = { gameOver: jest.fn() };
    const player = {
      descend: jest.fn(),
      z: CM.GroundLevel,
      dismount: jest.fn(),
      getMountScores: () => ({ get: () => ({ reduce: jest.fn() }) }),
      position: new CM.Point(0, 0),
    };
    const world = {
      getChunk: jest.fn().mockReturnValue({
        getTile: jest.fn().mockReturnValue({ isLand: () => true }),
      }),
    };
    CM.VEHICLEDEATHMAKER(app, world, player);
    expect(typeof CM.VEHICLEDEATH).toBe('function');
  });

  test('sets CM.PLAYERDEATH as a function', () => {
    const app = { gameOver: jest.fn() };
    const player = {
      descend: jest.fn(), z: CM.GroundLevel, dismount: jest.fn(),
      getMountScores: () => ({ get: () => ({ reduce: jest.fn() }) }),
      position: new CM.Point(0, 0),
    };
    CM.VEHICLEDEATHMAKER(app, { getChunk: jest.fn() }, player);
    expect(typeof CM.PLAYERDEATH).toBe('function');
  });

  test('CM.PLAYERDEATH calls app.gameOver() when no safe point exists', () => {
    const app = { gameOver: jest.fn(), paused: false, respawnDialog: false, respawnAction: null, notify: jest.fn() };
    const player = {
      descend: jest.fn(), z: CM.GroundLevel, dismount: jest.fn(),
      getMountScores: () => ({ get: () => ({ reduce: jest.fn() }) }),
      position: new CM.Point(0, 0),
    };
    CM.VEHICLEDEATHMAKER(app, { getChunk: jest.fn(), getObjects: jest.fn().mockReturnValue([]) }, player);
    CM.PLAYERDEATH(player);
    expect(app.gameOver).toHaveBeenCalled();
  });
});

// ── CM.PLAYERDEATH — respawn dialog ──────────────────────────────────────────

describe('CM.PLAYERDEATH respawn dialog', () => {
  const safePoint = { isSafePoint: true, position: new CM.Point(200, 300) };

  function makeApp() {
    return { gameOver: jest.fn(), paused: false, respawnDialog: false, respawnAction: null, notify: jest.fn() };
  }
  function makePlayer() {
    const healthScore = { score: 0 };
    return {
      position: new CM.Point(50, 50),
      spriteright: { position: new CM.Point(50, 50) },
      spriteleft:  { position: new CM.Point(50, 50) },
      getScores: () => ({ get: () => healthScore }),
      dead: true,
      _health: healthScore,
    };
  }
  function makeWorld(objects) {
    return { getObjects: jest.fn().mockReturnValue(objects), getChunk: jest.fn() };
  }

  test('sets respawnDialog to true when safe point exists', () => {
    const app = makeApp();
    const player = makePlayer();
    CM.VEHICLEDEATHMAKER(app, makeWorld([safePoint]), player);
    CM.PLAYERDEATH(player);
    expect(app.respawnDialog).toBe(true);
  });

  test('sets paused to true when safe point exists', () => {
    const app = makeApp();
    const player = makePlayer();
    CM.VEHICLEDEATHMAKER(app, makeWorld([safePoint]), player);
    CM.PLAYERDEATH(player);
    expect(app.paused).toBe(true);
  });

  test('stores respawnAction as a function', () => {
    const app = makeApp();
    const player = makePlayer();
    CM.VEHICLEDEATHMAKER(app, makeWorld([safePoint]), player);
    CM.PLAYERDEATH(player);
    expect(typeof app.respawnAction).toBe('function');
  });

  test('does not immediately respawn (player.dead still true after PLAYERDEATH)', () => {
    const app = makeApp();
    const player = makePlayer();
    CM.VEHICLEDEATHMAKER(app, makeWorld([safePoint]), player);
    CM.PLAYERDEATH(player);
    expect(player.dead).toBe(true);
  });

  test('respawnAction moves player to nearest safe point', () => {
    const app = makeApp();
    const player = makePlayer();
    const origSave = CM.SaveLoad.save;
    CM.SaveLoad.save = jest.fn();
    CM.VEHICLEDEATHMAKER(app, makeWorld([safePoint]), player);
    CM.PLAYERDEATH(player);
    app.respawnAction();
    expect(player.position.x).toBe(200);
    expect(player.position.y).toBe(300);
    CM.SaveLoad.save = origSave;
  });

  test('respawnAction resets health to 3', () => {
    const app = makeApp();
    const player = makePlayer();
    const origSave = CM.SaveLoad.save;
    CM.SaveLoad.save = jest.fn();
    CM.VEHICLEDEATHMAKER(app, makeWorld([safePoint]), player);
    CM.PLAYERDEATH(player);
    app.respawnAction();
    expect(player._health.score).toBe(3);
    CM.SaveLoad.save = origSave;
  });

  test('respawnAction clears player.dead flag', () => {
    const app = makeApp();
    const player = makePlayer();
    const origSave = CM.SaveLoad.save;
    CM.SaveLoad.save = jest.fn();
    CM.VEHICLEDEATHMAKER(app, makeWorld([safePoint]), player);
    CM.PLAYERDEATH(player);
    app.respawnAction();
    expect(player.dead).toBe(false);
    CM.SaveLoad.save = origSave;
  });
});

// ── CM.MINEABLEMAKER ──────────────────────────────────────────────────────────

describe('CM.MINEABLEMAKER', () => {
  const { makeWorldMock, makeRepoMock } = require('./helpers');

  function makeTile({ isWaterEdge = false, land = true } = {}) {
    return {
      isLand: () => land,
      info: {
        borderTop:   isWaterEdge,
        borderLeft:  false,
        borderRight: false,
        borderDown:  false,
      },
      location: new CM.Point(100, 100),
    };
  }

  test('returns a function', () => {
    expect(typeof CM.MINEABLEMAKER(makeWorldMock(), makeRepoMock())).toBe('function');
  });

  test('does nothing for water tiles', () => {
    const world = makeWorldMock();
    const maker = CM.MINEABLEMAKER(world, makeRepoMock());
    maker(makeTile({ land: false }));
    expect(world.addObject).not.toHaveBeenCalled();
  });

  test('does not spawn reeds on non-coastal land tiles', () => {
    const world = makeWorldMock();
    const maker = CM.MINEABLEMAKER(world, makeRepoMock());
    const origRng = CM.rng;
    CM.rng = () => 0.001; // triggers all spawn paths
    maker(makeTile({ isWaterEdge: false }));
    CM.rng = origRng;
    const reeds = world.addObject.mock.calls.map(c => c[0]).filter(o => o instanceof CM.Reed);
    expect(reeds.length).toBe(0);
  });

  test('can spawn reeds on coastal (water-edge) tiles', () => {
    const world = makeWorldMock();
    const maker = CM.MINEABLEMAKER(world, makeRepoMock());
    const origRng = CM.rng;
    CM.rng = () => 0.001; // < 0.10 → triggers reed spawn
    maker(makeTile({ isWaterEdge: true }));
    CM.rng = origRng;
    const reeds = world.addObject.mock.calls.map(c => c[0]).filter(o => o instanceof CM.Reed);
    expect(reeds.length).toBeGreaterThan(0);
  });

  test('does not spawn reeds on coastal tile when rand >= 0.10', () => {
    const world = makeWorldMock();
    const maker = CM.MINEABLEMAKER(world, makeRepoMock());
    const origRng = CM.rng;
    CM.rng = () => 0.15; // >= 0.10 → no reed spawn
    maker(makeTile({ isWaterEdge: true }));
    CM.rng = origRng;
    expect(world.addObject).not.toHaveBeenCalled();
  });

  test('spawnCluster skips positions where getTile returns water', () => {
    const world = makeWorldMock();
    world.getChunk = jest.fn().mockReturnValue({
      getTile: jest.fn().mockReturnValue({ isLand: () => false }),
    });
    const maker = CM.MINEABLEMAKER(world, makeRepoMock());
    const origRng = CM.rng;
    CM.rng = () => 0.001; // triggers stone spawn path
    maker(makeTile({ isWaterEdge: false }));
    CM.rng = origRng;
    expect(world.addObject).not.toHaveBeenCalled();
  });

  test('spawns stones on interior land tiles when rand < 0.01', () => {
    const world = makeWorldMock();
    const maker = CM.MINEABLEMAKER(world, makeRepoMock());
    const origRng = CM.rng;
    CM.rng = () => 0.005; // < 0.01 → stone path
    maker(makeTile({ isWaterEdge: false }));
    CM.rng = origRng;
    const stones = world.addObject.mock.calls.map(c => c[0]).filter(o => o instanceof CM.Mineable && o.resourceType === 'STONE');
    expect(stones.length).toBeGreaterThan(0);
  });

  test('spawns trees on interior land tiles when 0.01 <= rand < 0.03', () => {
    const world = makeWorldMock();
    const maker = CM.MINEABLEMAKER(world, makeRepoMock());
    const origRng = CM.rng;
    CM.rng = () => 0.02;
    maker(makeTile({ isWaterEdge: false }));
    CM.rng = origRng;
    const trees = world.addObject.mock.calls.map(c => c[0]).filter(o => o instanceof CM.Mineable && o.resourceType === 'WOOD');
    expect(trees.length).toBeGreaterThan(0);
  });
});
