const { makeRenderer } = require('./helpers');

const img = () => ({ width: 32, height: 32 });
const pos = () => new CM.Point(100, 200);

beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

describe('CM.CloudObject', () => {
  test('stores position, size, and z', () => {
    const obj = new CM.CloudObject(pos(), 16, 16, 1.5);
    expect(obj.position.x).toBe(100);
    expect(obj.position.y).toBe(200);
    expect(obj.sizeX).toBe(16);
    expect(obj.sizeY).toBe(16);
    expect(obj.z).toBe(1.5);
  });

  test('getMidPoint returns center', () => {
    const obj = new CM.CloudObject(new CM.Point(0, 0), 20, 10, 1);
    const mid = obj.getMidPoint();
    expect(mid.x).toBe(10);
    expect(mid.y).toBe(5);
  });

  test('interactable is false by default', () => {
    expect(new CM.CloudObject(pos(), 10, 10, 1).interactable).toBe(false);
  });
});

describe('CM.MoveableObject', () => {
  test('gets a unique auto-incrementing id', () => {
    const a = new CM.MoveableObject(pos(), 10, 10, 1);
    const b = new CM.MoveableObject(pos(), 10, 10, 1);
    expect(b.id).toBe(a.id + 1);
  });

  test('move updates position', () => {
    const obj = new CM.MoveableObject(new CM.Point(10, 20), 10, 10, 1);
    obj.move(5, -3);
    expect(obj.position.x).toBe(15);
    expect(obj.position.y).toBe(17);
  });
});

describe('CM.Sprite', () => {
  test('single image: getImage returns that image', () => {
    const image = img();
    const s = new CM.Sprite(image, pos(), CM.GroundLevel, false, 1);
    expect(s.getImage()).toBe(image);
  });

  test('size is derived from image dimensions and scale factor', () => {
    const s = new CM.Sprite(img(), pos(), CM.GroundLevel, false, 0.5);
    expect(s.sizeX).toBeCloseTo(16);
    expect(s.sizeY).toBeCloseTo(16);
  });

  test('image array: cycles frames on tick when animate=true', () => {
    const frames = [{ width: 8, height: 8 }, { width: 8, height: 8 }];
    const s = new CM.Sprite(frames, pos(), CM.GroundLevel, false, 1);
    s.toggleAnimation(true);
    s.anispeed = 1; // advance every frame
    s.tick();
    expect(s.getImage()).toBe(frames[1]);
    s.tick();
    expect(s.getImage()).toBe(frames[0]); // wraps around
  });

  test('does not advance frame when animate=false', () => {
    const frames = [{ width: 8, height: 8 }, { width: 8, height: 8 }];
    const s = new CM.Sprite(frames, pos(), CM.GroundLevel, false, 1);
    s.toggleAnimation(false);
    for (let i = 0; i < 20; i++) s.tick();
    expect(s.getImage()).toBe(frames[0]);
  });
});

describe('CM.Collectable', () => {
  test('stores typeName and pointvalue', () => {
    const c = new CM.Collectable(pos(), img(), 'COINS', 10, 0.2);
    expect(c.getTypeName()).toBe('COINS');
    expect(c.getPointValue()).toBe(10);
  });

  test('collectable flag is true', () => {
    expect(new CM.Collectable(pos(), img(), 'HEALTH', 5, 0.3).collectable).toBe(true);
  });

  test('z is always CM.GroundLevel', () => {
    expect(new CM.Collectable(pos(), img(), 'AMMO', 3, 0.4).z).toBe(CM.GroundLevel);
  });
});

describe('CM.FireBall', () => {
  function makeFireball(range = 100, speedX = 5, speedY = 0) {
    const fb = new CM.FireBall(
      new CM.Point(0, 0), img(), CM.GroundLevel,
      range, new CM.Point(speedX, speedY), 0.1, []
    );
    fb.registerRangeEx(jest.fn());
    fb.registerGetHitables(() => []);
    return fb;
  }

  test('moves by speed vector on each tick', () => {
    const fb = makeFireball(1000, 3, 2);
    fb.tick();
    expect(fb.position.x).toBeCloseTo(3);
    expect(fb.position.y).toBeCloseTo(2);
  });

  test('calls rangeExCallback when travelLength exceeds range', () => {
    const fb = makeFireball(5, 10, 0);
    fb.tick();
    expect(fb.rangeExCallback).toHaveBeenCalledWith(fb);
  });

  test('does not call rangeExCallback before range is exceeded', () => {
    const fb = makeFireball(1000, 1, 0);
    fb.tick();
    expect(fb.rangeExCallback).not.toHaveBeenCalled();
  });

  test('hits object within 15px and calls rangeExCallback', () => {
    const fb = new CM.FireBall(
      new CM.Point(0, 0), img(), CM.GroundLevel,
      1000, new CM.Point(1, 0), 0.1, []
    );
    const onRange = jest.fn();
    fb.registerRangeEx(onRange);

    const target = { id: 999, position: new CM.Point(5, 0), z: CM.GroundLevel, hit: jest.fn() };
    fb.registerGetHitables(() => [target]);
    fb.tick();

    expect(target.hit).toHaveBeenCalledWith(fb.strength);
    expect(onRange).toHaveBeenCalled();
  });

  test('does not hit source object (same id)', () => {
    const fb = new CM.FireBall(
      new CM.Point(0, 0), img(), CM.GroundLevel,
      1000, new CM.Point(1, 0), 0.1, [42]
    );
    fb.registerRangeEx(jest.fn());
    const source = { id: 42, position: new CM.Point(2, 0), hit: jest.fn() };
    fb.registerGetHitables(() => [source]);
    fb.tick();
    expect(source.hit).not.toHaveBeenCalled();
  });
});

describe('CM.Sprite — draw()', () => {
  test('non-static sprite calls renderer.drawImage', () => {
    const { renderer, ctx } = makeRenderer();
    const s = new CM.Sprite(img(), pos(), CM.GroundLevel, false, 1);
    s.draw(renderer);
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  test('static sprite calls renderer.drawImageZ', () => {
    const { renderer, ctx } = makeRenderer();
    const s = new CM.Sprite(img(), pos(), CM.GroundLevel, true, 1);
    s.draw(renderer);
    expect(ctx.drawImage).toHaveBeenCalled();
  });
});

describe('CM.TileSprite', () => {
  const tileImg = () => ({ width: 32, height: 32, src: '' });

  test('isLand() reflects tileInfo.isLand', () => {
    const info = new CM.TileInfo(true, false, false, false, false, false, false, '#fff');
    const ts = new CM.TileSprite(new CM.Point(0, 0), 32, tileImg(), info);
    expect(ts.isLand()).toBe(true);
  });

  test('addBorder adds to border array', () => {
    const info = new CM.TileInfo(true, false, false, false, false, false, false, '#fff');
    const ts = new CM.TileSprite(new CM.Point(0, 0), 32, tileImg(), info);
    ts.addBorder(tileImg(), new CM.Point(0, 0));
    expect(ts.border.length).toBe(1);
  });

  test('addDecals adds to decals array', () => {
    const info = new CM.TileInfo(true, false, false, false, false, false, false, '#fff');
    const ts = new CM.TileSprite(new CM.Point(0, 0), 32, tileImg(), info);
    ts.addDecals(tileImg(), new CM.Point(0, 0));
    expect(ts.decals.length).toBe(1);
  });

  test('draw() calls renderer.drawTile', () => {
    const { renderer, ctx } = makeRenderer();
    const info = new CM.TileInfo(false, false, false, false, false, false, false, '#fff');
    const ts = new CM.TileSprite(new CM.Point(0, 0), 32, tileImg(), info);
    ts.draw(renderer);
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  test('draw() renders border images for land tiles', () => {
    const { renderer, ctx } = makeRenderer();
    const info = new CM.TileInfo(true, false, false, false, false, false, false, '#fff');
    const ts = new CM.TileSprite(new CM.Point(0, 0), 32, tileImg(), info);
    ts.addBorder(tileImg(), new CM.Point(0, -2));
    ts.draw(renderer);
    // drawTile (tile itself) + drawImage (border)
    expect(ctx.drawImage.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('CM.Blimp', () => {
  beforeEach(() => {
    CM.VEHICLEDEATH = jest.fn();
  });

  function makeBlimp() {
    return new CM.Blimp(new CM.Point(0, 0), img());
  }

  test('has Fuel, Ammo, Health scores', () => {
    const b = makeBlimp();
    expect(b.scores.get('FUEL').getName()).toBe('FUEL');
    expect(b.scores.get('AMMO').getName()).toBe('AMMO');
    expect(b.scores.get('HEALTH').getName()).toBe('HEALTH');
  });

  test('hit reduces health', () => {
    const b = makeBlimp();
    const before = b.scores.get('HEALTH').getScore();
    b.hit(1);
    expect(b.scores.get('HEALTH').getScore()).toBe(before - 1);
  });

  test('hit to zero triggers VEHICLEDEATH', () => {
    const b = makeBlimp();
    b.hit(9999);
    expect(CM.VEHICLEDEATH).toHaveBeenCalledWith(b);
  });

  test('move consumes fuel', () => {
    const b = makeBlimp();
    b.z = 1; // airborne so wind branch is skipped
    const fuelBefore = b.scores.get('FUEL').getScore();
    b.move(5, 0);
    expect(b.scores.get('FUEL').getScore()).toBeLessThan(fuelBefore);
  });

  test('move returns false when out of fuel', () => {
    const b = makeBlimp();
    b.scores.get('FUEL').reduce(9999);
    b.z = 1;
    expect(b.move(5, 0)).toBe(false);
  });
});

// ── CM.IslandChest ────────────────────────────────────────────────────────────

describe('CM.IslandChest', () => {
  const makeChest = () => new CM.IslandChest(new CM.Point(10, 20), img());
  const makeRepo  = () => ({ getImage: jest.fn(() => img()) });

  test('z is CM.FloatLevel', () => {
    expect(makeChest().z).toBe(CM.FloatLevel);
  });

  test('isChest is true', () => {
    expect(makeChest().isChest).toBe(true);
  });

  test('opened is false initially', () => {
    expect(makeChest().opened).toBe(false);
  });

  test('open() returns a Collectable on first call', () => {
    const c = makeChest().open(null, makeRepo());
    expect(c).not.toBeNull();
    expect(c.collectable).toBe(true);
  });

  test('open() returns null on second call (already opened)', () => {
    const ch = makeChest();
    ch.open(null, makeRepo());
    expect(ch.open(null, makeRepo())).toBeNull();
  });

  test('open() sets opened = true', () => {
    const ch = makeChest();
    ch.open(null, makeRepo());
    expect(ch.opened).toBe(true);
  });
});

// ── CM.Shrine ─────────────────────────────────────────────────────────────────

describe('CM.Shrine', () => {
  const makeShrine = () => new CM.Shrine(new CM.Point(0, 0), img());

  test('z is CM.FloatLevel', () => {
    expect(makeShrine().z).toBe(CM.FloatLevel);
  });

  test('isShrine is true', () => {
    expect(makeShrine().isShrine).toBe(true);
  });

  test('used is false initially', () => {
    expect(makeShrine().used).toBe(false);
  });

  test('buffType is null initially', () => {
    expect(makeShrine().buffType).toBeNull();
  });
});

// ── CM.DragonEgg ──────────────────────────────────────────────────────────────

describe('CM.DragonEgg', () => {
  const makeEgg = () => new CM.DragonEgg(new CM.Point(0, 0), img());

  test('z is CM.FloatLevel', () => {
    expect(makeEgg().z).toBe(CM.FloatLevel);
  });

  test('isEgg is true', () => {
    expect(makeEgg().isEgg).toBe(true);
  });

  test('mineable is true', () => {
    expect(makeEgg().mineable).toBe(true);
  });

  test('resourceType is EGG', () => {
    expect(makeEgg().resourceType).toBe('EGG');
  });

  test('hitsRequired is 3', () => {
    expect(makeEgg().hitsRequired).toBe(3);
  });

  test('mine() increments hitsReceived', () => {
    const e = makeEgg();
    e.mine();
    expect(e.hitsReceived).toBe(1);
  });

  test('mine() returns false before hitsRequired reached', () => {
    const e = makeEgg();
    expect(e.mine()).toBe(false);
    expect(e.mine()).toBe(false);
  });

  test('mine() returns true and calls remove when hitsRequired reached', () => {
    const e = makeEgg();
    const remove = jest.fn();
    e.setRemover(remove);
    e.mine(); e.mine(); const result = e.mine(); // 3rd hit
    expect(result).toBe(true);
    expect(remove).toHaveBeenCalledWith(e);
  });

  test('mine() sets hitFlash to 8', () => {
    const e = makeEgg();
    e.mine();
    expect(e.hitFlash).toBe(8);
  });

  test('tick() decrements hitFlash', () => {
    const e = makeEgg();
    e.mine(); // hitFlash = 8
    e.tick();
    expect(e.hitFlash).toBe(7);
  });

  test('tick() does not go below 0', () => {
    const e = makeEgg();
    for (let i = 0; i < 20; i++) e.tick();
    expect(e.hitFlash).toBe(0);
  });
});
