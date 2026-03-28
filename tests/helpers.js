// Shared test helpers

/**
 * Creates a CM.Renderer backed by a fresh jest.fn() canvas context.
 * Returns { renderer, ctx } so tests can assert on ctx.method calls.
 */
function makeRenderer() {
  const ctx = {
    clearRect:  jest.fn(),
    fillRect:   jest.fn(),
    drawImage:  jest.fn(),
    fillText:   jest.fn(),
    restore:    jest.fn(),
    save:       jest.fn(),
    beginPath:  jest.fn(),
    moveTo:     jest.fn(),
    lineTo:     jest.fn(),
    closePath:  jest.fn(),
    fill:       jest.fn(),
    fillStyle:  '',
    font:       '',
    globalAlpha: 1,
    imageSmoothingEnabled: true,
  };
  const canvas = { getContext: () => ctx, width: 1280, height: 800 };
  global.$ = () => ({ 0: canvas });
  const renderer = new CM.Renderer('canvas');
  renderer.updatePos(new CM.Point(0, 0));
  return { renderer, ctx };
}

/**
 * Minimal tile creator — returns plain JS objects instead of CM.TileSprite
 * to avoid CM.Sprite overhead in world-related tests.
 */
function simpleTile(i, k, loc, size) {
  return {
    location: new CM.Point(loc.x + i * size, loc.y + k * size),
    size: size,
    isLand: () => true,
    draw:      () => {},
    addBorder: () => {},
    addDecals: () => {},
  };
}

/**
 * Minimal mock of CM.World — only the methods used by factory functions.
 */
function makeWorldMock() {
  const mockTile = { location: new CM.Point(100, 100), isLand: () => true };
  const mockChunk = {
    locationbase: new CM.Point(0, 0),
    tilesize: 32,
    widthInTiles: 30,
    getTiles: jest.fn().mockReturnValue([mockTile]),
    getTile:  jest.fn().mockReturnValue(mockTile),
  };
  return {
    addObject:        jest.fn(),
    removeObject:     jest.fn(),
    getHitables:      jest.fn().mockReturnValue([]),
    getHitablesByKey: jest.fn().mockReturnValue(undefined),
    addHitable:       jest.fn(),
    getChunkByIndeces:jest.fn().mockReturnValue(mockChunk),
    getChunk:         jest.fn().mockReturnValue(mockChunk),
    getSizeX:         jest.fn().mockReturnValue(3000),
  };
}

/**
 * Mock ImageRepo — returns a plain image object for any key.
 */
function makeRepoMock() {
  const img = { width: 32, height: 32, src: '' };
  return { getImage: jest.fn().mockReturnValue(img) };
}

module.exports = { makeRenderer, simpleTile, makeWorldMock, makeRepoMock };
