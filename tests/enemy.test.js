const { makeRenderer } = require('./helpers');
const img = () => ({ width: 32, height: 32 });

beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

function makeGroundEnemy(px = 50, py = 50) {
  return new CM.GroundEnemy(new CM.Point(px, py), img());
}

function makeDragon(px = 100, py = 100) {
  const i = img();
  return new CM.Dragon(new CM.Point(px, py), { right: i, left: i });
}

function makePlayer(px = 0, py = 0, z = CM.GroundLevel) {
  const p = new CM.CloudPlayer(new CM.Point(px, py), img(), img());
  p.z = z;
  CM.PLAYERDEATH = jest.fn();
  return p;
}

beforeEach(() => {
  CM.PLAYERDEATH = jest.fn();
  CM.VEHICLEDEATH = jest.fn();
});

describe('CM.GroundEnemy', () => {
  test('starts with 10 HP', () => {
    expect(makeGroundEnemy().scores.get('HEALTH').getScore()).toBe(10);
  });

  test('not dead initially', () => {
    expect(makeGroundEnemy().dead).toBe(false);
  });

  test('hit() reduces health', () => {
    const e = makeGroundEnemy();
    e.hit(3);
    expect(e.scores.get('HEALTH').getScore()).toBe(7);
  });

  test('hit() marks dead when health reaches 0', () => {
    const e = makeGroundEnemy();
    e.hit(10);
    expect(e.dead).toBe(true);
  });

  test('hit() calls remove callback on death', () => {
    const e = makeGroundEnemy();
    const remove = jest.fn();
    e.setRemover(remove);
    e.hit(10);
    expect(remove).toHaveBeenCalledWith(e);
  });

  test('hit() after death is ignored', () => {
    const e = makeGroundEnemy();
    const remove = jest.fn();
    e.setRemover(remove);
    e.hit(10);
    e.hit(1); // should be ignored
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test('tick() does nothing when player is null', () => {
    const e = makeGroundEnemy(0, 0);
    expect(() => e.tick(null)).not.toThrow();
    expect(e.position.x).toBe(0);
  });

  test('tick() does not aggro when player is airborne (z < GroundLevel - 0.3)', () => {
    const e = makeGroundEnemy(0, 0);
    const p = makePlayer(5, 0, CM.GroundLevel - 0.5); // airborne
    e.tick(p);
    expect(e.position.x).toBe(0); // didn't move
  });

  test('tick() moves toward player on the ground', () => {
    const e = makeGroundEnemy(0, 0);
    e.setTileInfoRetriever(() => ({ isLand: () => true }));
    const p = makePlayer(100, 0, CM.GroundLevel);
    e.tick(p);
    expect(e.position.x).toBeGreaterThan(0);
  });

  test('tick() deals contact damage when player is within 15px', () => {
    const e = makeGroundEnemy(0, 0);
    const p = makePlayer(5, 0, CM.GroundLevel);
    e.tick(p);
    expect(p.getScores().get('HEALTH').getScore()).toBe(9); // took 1 damage
  });

  test('damageCooldown prevents repeated contact damage', () => {
    const e = makeGroundEnemy(0, 0);
    const p = makePlayer(5, 0, CM.GroundLevel);
    e.tick(p); // first hit, cooldown = 60
    e.tick(p); // should not hit again
    expect(p.getScores().get('HEALTH').getScore()).toBe(9); // still only 1 damage
  });
});

describe('CM.Dragon', () => {
  test('starts with 20 HP', () => {
    expect(makeDragon().scores.get('HEALTH').getScore()).toBe(20);
  });

  test('not dead initially and has hitmanager', () => {
    const d = makeDragon();
    expect(d.hitmanager).toBeDefined();
  });

  test('hit() reduces health', () => {
    const d = makeDragon();
    d.hit(5);
    expect(d.scores.get('HEALTH').getScore()).toBe(15);
  });

  test('hit() calls remove when health reaches 0', () => {
    const d = makeDragon();
    const remove = jest.fn();
    d.setRemover(remove);
    d.hit(20);
    expect(remove).toHaveBeenCalledWith(d);
  });

  test('hit() does not call remove if health still above 0', () => {
    const d = makeDragon();
    const remove = jest.fn();
    d.setRemover(remove);
    d.hit(1);
    expect(remove).not.toHaveBeenCalled();
  });

  test('tick() does nothing when player is null', () => {
    expect(() => makeDragon().tick(null)).not.toThrow();
  });

  test('tick() moves toward player when within 150px', () => {
    const d = makeDragon(0, 0);
    d.idleSoundId = null;
    // Stub out sound update to avoid issues
    CM.Sound.updateSpatialLoop = () => null;
    const p = makePlayer(100, 0, CM.FloatLevel); // same z-level as dragon
    const xBefore = d.position.x;
    d.tick(p);
    expect(d.position.x).toBeGreaterThan(xBefore);
  });

  test('tick() fires after cooldown reaches 0', () => {
    const d = makeDragon(0, 0);
    CM.Sound.updateSpatialLoop = () => null;
    CM.Sound.playAt = jest.fn();
    const fired = [];
    d.setFireBallCreator((...args) => fired.push(args));
    const p = makePlayer(100, 0, CM.FloatLevel); // same z-level as dragon
    d.cooldown = 0;
    d.tick(p);
    expect(fired.length).toBe(1);
    expect(d.cooldown).toBe(120);
  });
});

// ── CM.CaveCrab ───────────────────────────────────────────────────────────────

describe('CM.CaveCrab', () => {
  function makeCrab(px = 0, py = 0) {
    return new CM.CaveCrab(new CM.Point(px, py), img());
  }

  beforeEach(() => {
    CM.Sound.updateSpatialLoop = () => null;
    CM.Sound.playAt = jest.fn();
  });

  test('z is CM.CaveLevel', () => {
    expect(makeCrab().z).toBe(CM.CaveLevel);
  });

  test('starts with 10 HP', () => {
    expect(makeCrab().scores.get('HEALTH').getScore()).toBe(10);
  });

  test('isCaveCrab flag is true', () => {
    expect(makeCrab().isCaveCrab).toBe(true);
  });

  test('speed is 1.1', () => {
    expect(makeCrab().speed).toBe(1.1);
  });

  test('tick() does nothing when player is null', () => {
    expect(() => makeCrab().tick(null)).not.toThrow();
    expect(makeCrab().position.x).toBe(0);
  });

  test('tick() does nothing when player is above cave level', () => {
    const c = makeCrab(0, 0);
    const p = makePlayer(5, 0, CM.GroundLevel); // well above CaveLevel
    c.tick(p);
    expect(c.position.x).toBe(0);
  });

  test('tick() moves toward player at cave level when within aggro range (no torch)', () => {
    const c = makeCrab(0, 0);
    c.setTileInfoRetriever(() => ({ isLand: () => true }));
    const p = makePlayer(30, 0, CM.CaveLevel);
    c.tick(p, false, false); // torchActive = false, aggroRadius = 50
    expect(c.position.x).toBeGreaterThan(0);
  });

  test('tick() uses larger aggro radius with torch active', () => {
    const cNoTorch = makeCrab(0, 0);
    const cTorch   = makeCrab(0, 0);
    cNoTorch.setTileInfoRetriever(() => ({ isLand: () => true }));
    cTorch.setTileInfoRetriever(() => ({ isLand: () => true }));
    const pFar = makePlayer(100, 0, CM.CaveLevel); // 100px — beyond default aggro (50) but within torch aggro (200)
    cNoTorch.tick(pFar, false, false);
    cTorch.tick(pFar, false, true);
    // no-torch crab doesn't reach aggro range; torch crab does
    expect(cNoTorch.position.x).toBe(0);
    expect(cTorch.position.x).toBeGreaterThan(0);
  });

  test('tick() deals 1 damage on contact (dist < 15)', () => {
    const c = makeCrab(0, 0);
    c.setTileInfoRetriever(() => ({ isLand: () => true }));
    const p = makePlayer(5, 0, CM.CaveLevel);
    c.tick(p, false, true);
    expect(p.getScores().get('HEALTH').getScore()).toBe(9);
  });
});

// ── CM.Dragon._updateDirection ────────────────────────────────────────────────

describe('CM.Dragon direction', () => {
  function makeDragonAt(px, py) {
    const i = img();
    const d = new CM.Dragon(new CM.Point(px, py), { right: i, left: i });
    d.idleSoundId = null;
    CM.Sound.updateSpatialLoop = () => null;
    CM.Sound.playAt = jest.fn();
    return d;
  }

  test('starts facing right (facingLeft = false)', () => {
    expect(makeDragonAt(0, 0).facingLeft).toBe(false);
  });

  test('facing switches to left when moving left', () => {
    const d = makeDragonAt(100, 0); // within 150px of player
    const p = makePlayer(0, 0, CM.FloatLevel); // player to the left
    d.tick(p); // dx < 0 → facingLeft = true
    expect(d.facingLeft).toBe(true);
  });

  test('facing stays right when moving right', () => {
    const d = makeDragonAt(0, 0);
    const p = makePlayer(100, 0, CM.FloatLevel);
    d.tick(p);
    expect(d.facingLeft).toBe(false);
  });
});

// ── CM.GroundEnemy.draw ───────────────────────────────────────────────────────

describe('CM.GroundEnemy.draw', () => {
  test('draw() does not throw', () => {
    const { makeRenderer } = require('./helpers');
    const { renderer } = makeRenderer();
    const e = new CM.GroundEnemy(new CM.Point(0, 0), img());
    expect(() => e.draw(renderer)).not.toThrow();
  });
});

// ── CM.IslandDragon ───────────────────────────────────────────────────────────

describe('CM.IslandDragon', () => {
  function makeIsland(cx = 0, cy = 0) {
    // minimal stub with getMidPoint
    return { getMidPoint: () => new CM.Point(cx, cy) };
  }

  function makeIslandDragon(px = 0, py = 0, island = makeIsland()) {
    const i = img();
    return new CM.IslandDragon(new CM.Point(px, py), { right: i, left: i }, island);
  }

  beforeEach(() => {
    CM.Sound.updateSpatialLoop = () => null;
    CM.Sound.playAt = jest.fn();
  });

  test('z is CM.FloatLevel', () => {
    expect(makeIslandDragon().z).toBe(CM.FloatLevel);
  });

  test('stores homeIsland reference', () => {
    const island = makeIsland(100, 200);
    const d = makeIslandDragon(0, 0, island);
    expect(d.homeIsland).toBe(island);
  });

  test('PATROL_RADIUS is 180', () => {
    expect(makeIslandDragon().PATROL_RADIUS).toBe(180);
  });

  test('inherits hit() from CM.Dragon — reduces health', () => {
    const d = makeIslandDragon();
    d.hit(5);
    expect(d.scores.get('HEALTH').getScore()).toBe(15);
  });

  test('tick() does nothing when player is null', () => {
    expect(() => makeIslandDragon().tick(null)).not.toThrow();
  });

  test('tick() moves back toward island when distance exceeds PATROL_RADIUS', () => {
    // Island is at (0,0), dragon spawns far away
    const island = makeIsland(0, 0);
    const d = makeIslandDragon(0, 0, island);
    d.position.x = 999; // manually place dragon far
    const xBefore = d.position.x;
    d.tick(null);
    // should have moved toward 0,0 (x decreased)
    expect(d.position.x).toBeLessThan(xBefore);
  });

  test('tick() delegates to Dragon.tick when within PATROL_RADIUS', () => {
    const island = makeIsland(0, 0);
    const d = makeIslandDragon(50, 0, island); // well within 180
    const p = makePlayer(60, 0, CM.FloatLevel);
    // should not throw and should call super.tick
    expect(() => d.tick(p)).not.toThrow();
  });
});
