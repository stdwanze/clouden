describe('CM.Score', () => {
  test('starts at max by default', () => {
    const s = new CM.Score(0, 10, 1, 'TEST');
    expect(s.getScore()).toBe(10);
  });

  test('uses custom curr when provided', () => {
    const s = new CM.Score(0, 10, 1, 'TEST', 3);
    expect(s.getScore()).toBe(3);
  });

  test('reduce decreases by step', () => {
    const s = new CM.Score(0, 10, 1, 'TEST');
    s.reduce();
    expect(s.getScore()).toBe(9);
  });

  test('reduce by explicit value', () => {
    const s = new CM.Score(0, 10, 1, 'TEST');
    s.reduce(4);
    expect(s.getScore()).toBe(6);
  });

  test('reduce clamps at min', () => {
    const s = new CM.Score(0, 10, 1, 'TEST');
    s.reduce(999);
    expect(s.getScore()).toBe(0);
  });

  test('up increases by step', () => {
    const s = new CM.Score(0, 10, 1, 'TEST', 5);
    s.up();
    expect(s.getScore()).toBe(6);
  });

  test('up by explicit value', () => {
    const s = new CM.Score(0, 10, 1, 'TEST', 0);
    s.up(7);
    expect(s.getScore()).toBe(7);
  });

  test('up clamps at max', () => {
    const s = new CM.Score(0, 10, 1, 'TEST');
    s.up(999);
    expect(s.getScore()).toBe(10);
  });

  test('getName returns typeName', () => {
    const s = new CM.Score(0, 10, 1, 'MYTYPE');
    expect(s.getName()).toBe('MYTYPE');
  });

  test('getMin and getMax', () => {
    const s = new CM.Score(2, 8, 1, 'X');
    expect(s.getMin()).toBe(2);
    expect(s.getMax()).toBe(8);
  });
});

describe('CM.Health', () => {
  test('name is HEALTH, starts full, min is 0', () => {
    const h = new CM.Health(10);
    expect(h.getName()).toBe('HEALTH');
    expect(h.getScore()).toBe(10);
    expect(h.getMin()).toBe(0);
  });
});

describe('CM.Ammo', () => {
  test('name is AMMO', () => {
    expect(new CM.Ammo(10).getName()).toBe('AMMO');
  });
});

describe('CM.Fuel', () => {
  test('name is FUEL', () => {
    expect(new CM.Fuel(30).getName()).toBe('FUEL');
  });
});

describe('CM.Coins', () => {
  test('name is COINS, starts at 0, max is 200', () => {
    const c = new CM.Coins();
    expect(c.getName()).toBe('COINS');
    expect(c.getScore()).toBe(0);
    expect(c.getMax()).toBe(200);
  });
});

describe('CM.ScoreSet', () => {
  test('add and get by name', () => {
    const set = new CM.ScoreSet();
    const h = new CM.Health(5);
    set.add(h);
    expect(set.get('HEALTH')).toBe(h);
  });

  test('getAll returns all added scores', () => {
    const set = new CM.ScoreSet();
    set.add(new CM.Health(10));
    set.add(new CM.Ammo(10));
    const all = set.getAll();
    expect(all.length).toBe(2);
    const names = all.map(s => s.getName());
    expect(names).toContain('HEALTH');
    expect(names).toContain('AMMO');
  });

  test('get returns undefined for unknown key', () => {
    expect(new CM.ScoreSet().get('MISSING')).toBeUndefined();
  });
});

describe('CM.Hitable', () => {
  test('starts not hitted', () => {
    const h = new CM.Hitable();
    expect(h.hitted).toBe(false);
  });

  test('hit() sets hitted to true', () => {
    const h = new CM.Hitable();
    h.hit();
    expect(h.hitted).toBe(true);
  });

  test('draw() calls drawRectangle and resets hitted', () => {
    const h = new CM.Hitable();
    h.hit();
    const obj = { getMidPoint: () => new CM.Point(10, 10) };
    const renderer = { drawRectangle: jest.fn() };
    h.draw(obj, renderer);
    expect(renderer.drawRectangle).toHaveBeenCalled();
    expect(h.hitted).toBe(false);
  });

  test('draw() is no-op when not hitted', () => {
    const h = new CM.Hitable();
    const renderer = { drawRectangle: jest.fn() };
    h.draw({ getMidPoint: () => new CM.Point(0, 0) }, renderer);
    expect(renderer.drawRectangle).not.toHaveBeenCalled();
  });

  test('hitcount increments on each draw while hitted', () => {
    const h = new CM.Hitable();
    h.hit();
    h.draw({ getMidPoint: () => new CM.Point(0, 0) }, { drawRectangle: () => {} });
    expect(h.hitcount).toBe(1);
    h.hit();
    h.draw({ getMidPoint: () => new CM.Point(0, 0) }, { drawRectangle: () => {} });
    expect(h.hitcount).toBe(2);
  });
});

describe('CM.distance', () => {
  test('zero for same point', () => {
    const p = new CM.Point(5, 5);
    expect(CM.distance(p, p)).toBe(0);
  });

  test('3-4-5 right triangle', () => {
    const a = new CM.Point(0, 0);
    const b = new CM.Point(3, 4);
    expect(CM.distance(a, b)).toBeCloseTo(5);
  });

  test('is symmetric', () => {
    const a = new CM.Point(1, 2);
    const b = new CM.Point(4, 6);
    expect(CM.distance(a, b)).toBeCloseTo(CM.distance(b, a));
  });
});

describe('CM.getVector', () => {
  test('returns a CM.Point', () => {
    const v = CM.getVector(new CM.Point(0, 0), new CM.Point(10, 0), 1);
    expect(v).toBeInstanceOf(CM.Point);
  });

  test('points from start toward end (positive x direction)', () => {
    const v = CM.getVector(new CM.Point(0, 0), new CM.Point(10, 0), 1);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y).toBeCloseTo(0);
  });

  test('scale=1 produces unit vector', () => {
    const v = CM.getVector(new CM.Point(0, 0), new CM.Point(3, 4), 1);
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    expect(len).toBeCloseTo(1);
  });

  test('scale=2 halves the vector length', () => {
    const v1 = CM.getVector(new CM.Point(0, 0), new CM.Point(3, 4), 1);
    const v2 = CM.getVector(new CM.Point(0, 0), new CM.Point(3, 4), 2);
    expect(v2.x).toBeCloseTo(v1.x / 2);
    expect(v2.y).toBeCloseTo(v1.y / 2);
  });
});
