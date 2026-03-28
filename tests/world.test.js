const img = () => ({ width: 32, height: 32 });

// Minimal tile creator — returns plain objects, avoiding CM.Sprite overhead
function simpleTile(i, k, loc, size) {
  return {
    location: new CM.Point(loc.x + i * size, loc.y + k * size),
    size: size,
    isLand: () => true,
    draw: () => {},
    addBorder: () => {},
    addDecals: () => {},
  };
}

function makeWorld(sx = 2, sy = 2) {
  return new CM.World(sx, sy, simpleTile);
}

describe('CM.TileInfo', () => {
  test('stores isLand and border flags', () => {
    const t = new CM.TileInfo(true, false, true, false, true, false, false, '#fff');
    expect(t.isLand).toBe(true);
    expect(t.borderLeft).toBe(true);
    expect(t.borderTop).toBe(false);
  });
});

describe('CM.World — dimensions', () => {
  test('getSizeX = chunks * tilesPerChunk * tileSize', () => {
    const w = makeWorld(3, 2);
    expect(w.getSizeX()).toBe(3 * 30 * 32);
  });

  test('getSizeY = chunks * tilesPerChunk * tileSize', () => {
    const w = makeWorld(3, 2);
    expect(w.getSizeY()).toBe(2 * 30 * 32);
  });
});

describe('CM.World — chunk lookup', () => {
  test('getChunkByIndeces returns null for out-of-bounds', () => {
    const w = makeWorld(2, 2);
    expect(w.getChunkByIndeces(-1, 0)).toBeNull();
    expect(w.getChunkByIndeces(0, -1)).toBeNull();
    expect(w.getChunkByIndeces(99, 0)).toBeNull();
  });

  test('getChunkCoordinates converts pixel position to chunk indices', () => {
    const w = makeWorld(3, 3);
    const CHUNK_PX = 30 * 32; // 960
    const coords = w.getChunkCoordinates(new CM.Point(CHUNK_PX * 1.5, CHUNK_PX * 0.5));
    expect(coords.x).toBe(1);
    expect(coords.y).toBe(0);
  });
});

describe('CM.World — object management', () => {
  test('addObject and getObjects', () => {
    const w = makeWorld();
    const obj = { z: 1, collectable: false };
    w.addObject(obj);
    expect(w.getObjects()).toContain(obj);
  });

  test('removeObject removes the object', () => {
    const w = makeWorld();
    const obj = { z: 1 };
    w.addObject(obj);
    w.removeObject(obj);
    expect(w.getObjects()).not.toContain(obj);
  });

  test('getObjects returns objects sorted by z descending', () => {
    const w = makeWorld();
    const lo = { z: 0.5 };
    const hi = { z: 2.0 };
    const mid = { z: 1.0 };
    w.addObject(lo);
    w.addObject(hi);
    w.addObject(mid);
    const sorted = w.getObjects();
    expect(sorted[0]).toBe(hi);
    expect(sorted[1]).toBe(mid);
    expect(sorted[2]).toBe(lo);
  });
});

describe('CM.World — hitables', () => {
  test('addHitable and getHitables', () => {
    const w = makeWorld();
    const h = { id: 1 };
    w.addHitable('enemy1', h);
    expect(w.getHitables()).toContain(h);
  });

  test('getHitablesByKey returns correct entry', () => {
    const w = makeWorld();
    const h = { id: 42 };
    w.addHitable('mykey', h);
    expect(w.getHitablesByKey('mykey')).toBe(h);
  });

  test('getHitablesByKey returns undefined for missing key', () => {
    expect(makeWorld().getHitablesByKey('nope')).toBeUndefined();
  });
});

describe('CM.World — getNearestObject', () => {
  test('returns null when no objects', () => {
    expect(makeWorld().getNearestObject(new CM.Point(0, 0), 'collectable')).toBeNull();
  });

  test('returns nearest object of matching type', () => {
    const w = makeWorld();
    const near = {
      collectable: true,
      position: new CM.Point(10, 0),
      getMidPoint: () => new CM.Point(10, 0),
    };
    const far = {
      collectable: true,
      position: new CM.Point(500, 0),
      getMidPoint: () => new CM.Point(500, 0),
    };
    w.addObject(near);
    w.addObject(far);
    expect(w.getNearestObject(new CM.Point(0, 0), 'collectable')).toBe(near);
  });

  test('ignores objects without the given type property', () => {
    const w = makeWorld();
    const nonCollectable = {
      position: new CM.Point(5, 0),
      getMidPoint: () => new CM.Point(5, 0),
    };
    w.addObject(nonCollectable);
    expect(w.getNearestObject(new CM.Point(0, 0), 'collectable')).toBeNull();
  });
});
