const { makeRenderer } = require('./helpers');

const img = () => ({ width: 32, height: 32 });

beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

function makePlayer(px = 100, py = 100) {
  return new CM.CloudPlayer(new CM.Point(px, py), img(), img());
}

beforeEach(() => {
  CM.PLAYERDEATH = jest.fn();
  CM.VEHICLEDEATH = jest.fn();
});

describe('CM.CloudPlayer — initial state', () => {
  test('starts with HEALTH=10', () => {
    expect(makePlayer().getScores().get('HEALTH').getScore()).toBe(10);
  });

  test('starts with AMMO=10', () => {
    expect(makePlayer().getScores().get('AMMO').getScore()).toBe(10);
  });

  test('starts with COINS=0', () => {
    expect(makePlayer().getScores().get('COINS').getScore()).toBe(0);
  });

  test('not mounted initially', () => {
    expect(makePlayer().isMounted()).toBe(false);
  });

  test('hitFlashFrames starts at 0', () => {
    expect(makePlayer().hitFlashFrames).toBe(0);
  });

  test('not dead initially', () => {
    expect(makePlayer().dead).toBe(false);
  });
});

describe('CM.CloudPlayer — hit()', () => {
  test('reduces health by strength', () => {
    const p = makePlayer();
    p.hit(3);
    expect(p.getScores().get('HEALTH').getScore()).toBe(7);
  });

  test('sets hitFlashFrames to 20', () => {
    const p = makePlayer();
    p.hit(1);
    expect(p.hitFlashFrames).toBe(20);
  });

  test('health does not go below 0', () => {
    const p = makePlayer();
    p.hit(999);
    expect(p.getScores().get('HEALTH').getScore()).toBe(0);
  });

  test('triggers PLAYERDEATH when health reaches 0', () => {
    const p = makePlayer();
    p.hit(10);
    expect(CM.PLAYERDEATH).toHaveBeenCalledWith(p);
    expect(p.dead).toBe(true);
  });

  test('PLAYERDEATH is only called once even if hit again after death', () => {
    const p = makePlayer();
    p.hit(10);
    p.hit(1);
    expect(CM.PLAYERDEATH).toHaveBeenCalledTimes(1);
  });

  test('when mounted delegates to vehicle.hit()', () => {
    const p = makePlayer();
    const vehicle = { hit: jest.fn(), setMountedState: () => {}, scores: new CM.ScoreSet() };
    p.vehicle = vehicle;
    p.hit(2);
    expect(vehicle.hit).toHaveBeenCalledWith(2);
    expect(p.getScores().get('HEALTH').getScore()).toBe(10); // player health unchanged
  });

  test('hitFlashFrames set to 20 even when mounted', () => {
    const p = makePlayer();
    p.vehicle = { hit: jest.fn(), setMountedState: () => {}, scores: new CM.ScoreSet() };
    p.hit(1);
    expect(p.hitFlashFrames).toBe(20);
  });
});

describe('CM.CloudPlayer — tick()', () => {
  test('decrements hitFlashFrames each tick', () => {
    const p = makePlayer();
    p.hit(1); // sets hitFlashFrames = 20
    p.tick();
    expect(p.hitFlashFrames).toBe(19);
  });

  test('hitFlashFrames does not go below 0', () => {
    const p = makePlayer();
    for (let i = 0; i < 30; i++) p.tick();
    expect(p.hitFlashFrames).toBe(0);
  });
});

describe('CM.CloudPlayer — collect()', () => {
  function makeCoin(px = 100, py = 100) {
    return new CM.Collectable(new CM.Point(px, py), img(), 'COINS', 10, 0.2);
  }

  test('collects a nearby collectable and returns true', () => {
    const p = makePlayer(100, 100);
    const coin = makeCoin(100, 100);
    const result = p.collect(coin);
    expect(result).toBe(true);
    expect(p.getScores().get('COINS').getScore()).toBe(10);
  });

  test('returns false for null', () => {
    expect(makePlayer().collect(null)).toBe(false);
  });

  test('returns false when collectable is out of range', () => {
    const p = makePlayer(0, 0);
    const coin = makeCoin(9999, 9999);
    expect(p.collect(coin)).toBe(false);
  });

  test('collects HEALTH when not mounted and nearby', () => {
    const p = makePlayer(100, 100);
    p.getScores().get('HEALTH').reduce(5);
    const pack = new CM.Collectable(new CM.Point(100, 100), img(), 'HEALTH', 3, 0.4);
    p.collect(pack);
    expect(p.getScores().get('HEALTH').getScore()).toBe(8);
  });
});

describe('CM.CloudPlayer — mount/dismount', () => {
  test('isMounted() returns true after mount()', () => {
    const p = makePlayer(0, 0);
    const blimp = new CM.Blimp(new CM.Point(0, 0), img());
    p.mount(blimp);
    expect(p.isMounted()).toBe(true);
  });

  test('mount returns false when vehicle is null', () => {
    const p = makePlayer();
    expect(p.mount(null)).toBe(false);
    expect(p.isMounted()).toBe(false);
  });

  test('mount returns false when vehicle is out of range', () => {
    const p = makePlayer(0, 0);
    const blimp = new CM.Blimp(new CM.Point(9999, 9999), img());
    expect(p.mount(blimp)).toBe(false);
  });

  test('dismount clears vehicle and returns it', () => {
    const p = makePlayer(0, 0);
    const blimp = new CM.Blimp(new CM.Point(0, 0), img());
    p.mount(blimp);
    p.tileInfoRetriever = () => ({ isLand: () => true });
    const v = p.dismount();
    expect(v).toBe(blimp);
    expect(p.isMounted()).toBe(false);
  });

  test('dismount returns null when not on land', () => {
    const p = makePlayer(0, 0);
    const blimp = new CM.Blimp(new CM.Point(0, 0), img());
    p.mount(blimp);
    p.tileInfoRetriever = () => ({ isLand: () => false });
    expect(p.dismount()).toBeNull();
    expect(p.isMounted()).toBe(true);
  });
});

describe('CM.CloudPlayer — draw()', () => {
  test('draws sprite when not mounted', () => {
    const { renderer, ctx } = makeRenderer();
    const p = makePlayer();
    p.draw(renderer);
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  test('does not draw sprite when mounted', () => {
    const { renderer, ctx } = makeRenderer();
    const p = makePlayer();
    p.vehicle = { hit: jest.fn(), setMountedState: () => {} };
    p.draw(renderer);
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });
});

describe('CM.CloudPlayer — fire()', () => {
  test('calls fireBallMaker and reduces ammo', () => {
    const p = makePlayer();
    const fireBallMaker = jest.fn();
    p.setFireBallCreator(fireBallMaker);
    p.fire();
    expect(fireBallMaker).toHaveBeenCalled();
    expect(p.getScores().get('AMMO').getScore()).toBe(9);
  });

  test('does not fire when ammo is 0', () => {
    const p = makePlayer();
    const fireBallMaker = jest.fn();
    p.setFireBallCreator(fireBallMaker);
    p.getScores().get('AMMO').reduce(9999);
    p.fire();
    expect(fireBallMaker).not.toHaveBeenCalled();
  });

  test('fires HANDGUN type when not mounted', () => {
    const p = makePlayer();
    const fireBallMaker = jest.fn();
    p.setFireBallCreator(fireBallMaker);
    p.fire();
    expect(fireBallMaker.mock.calls[0][2]).toBe('HANDGUN');
  });
});

describe('CM.CloudPlayer — move()', () => {
  test('updates position when no tile retriever set', () => {
    const p = makePlayer(100, 100);
    p.move(5, 0);
    expect(p.position.x).toBe(105);
  });

  test('updates direction on non-zero move', () => {
    const p = makePlayer();
    p.move(3, 0);
    expect(p.direction.x).toBe(3);
  });

  test('switches to left sprite when moving left', () => {
    const p = makePlayer();
    p.move(-1, 0);
    expect(p.sprite).toBe(p.spriteleft);
  });

  test('switches to right sprite when moving right', () => {
    const p = makePlayer();
    p.sprite = p.spriteleft; // start on left
    p.move(1, 0);
    expect(p.sprite).toBe(p.spriteright);
  });

  test('tile retriever blocks movement on non-land', () => {
    const p = makePlayer(100, 100);
    p.setTileInfoRetrieve(() => ({ isLand: () => false }));
    p.move(5, 0);
    expect(p.position.x).toBe(100); // unchanged
  });
});

describe('CM.CloudPlayer — ascend/descend', () => {
  test('descend increases z', () => {
    const p = makePlayer();
    p.z = 2;
    p.descend(0.1);
    expect(p.z).toBeCloseTo(2.1);
  });

  test('descend clamps at GroundLevel', () => {
    const p = makePlayer();
    p.z = 2;
    p.descend(9999);
    expect(p.z).toBe(CM.GroundLevel);
  });

  test('ascend decreases z when mounted', () => {
    const p = makePlayer(0, 0);
    const blimp = new CM.Blimp(new CM.Point(0, 0), img());
    p.mount(blimp);
    const zBefore = p.z;
    p.ascend(0.1);
    expect(p.z).toBeLessThan(zBefore);
  });
});
