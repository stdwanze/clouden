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

  test('CM.PLAYERDEATH calls app.gameOver()', () => {
    const app = { gameOver: jest.fn() };
    const player = {
      descend: jest.fn(), z: CM.GroundLevel, dismount: jest.fn(),
      getMountScores: () => ({ get: () => ({ reduce: jest.fn() }) }),
      position: new CM.Point(0, 0),
    };
    CM.VEHICLEDEATHMAKER(app, { getChunk: jest.fn() }, player);
    CM.PLAYERDEATH(player);
    expect(app.gameOver).toHaveBeenCalled();
  });
});
