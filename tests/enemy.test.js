const { makeRenderer } = require('./helpers');
const img = () => ({ width: 32, height: 32 });

beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

function makeGroundEnemy(px = 50, py = 50) {
  return new CM.GroundEnemy(new CM.Point(px, py), img());
}

function makeDragon(px = 100, py = 100) {
  return new CM.Dragon(new CM.Point(px, py), img());
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
    const p = makePlayer(100, 0, CM.GroundLevel);
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
    const p = makePlayer(100, 0, CM.GroundLevel);
    d.cooldown = 0;
    d.tick(p);
    expect(fired.length).toBe(1);
    expect(d.cooldown).toBe(120);
  });
});
