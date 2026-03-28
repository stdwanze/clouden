const { makeRenderer } = require('./helpers');

let renderer, ctx;

beforeEach(() => {
  ({ renderer, ctx } = makeRenderer());
});

describe('CM.Renderer — screen info', () => {
  test('getScreenWidth returns canvas width', () => {
    expect(renderer.getScreenWidth()).toBe(1280);
  });

  test('getScreenHeight returns canvas height', () => {
    expect(renderer.getScreenHeight()).toBe(800);
  });

  test('setZoom updates zoom factor', () => {
    renderer.setZoom(2);
    expect(renderer.zoom).toBe(2);
  });
});

describe('CM.Renderer — coordinate math', () => {
  test('translate(coord, base) returns coord + base', () => {
    expect(renderer.translate(10, 5)).toBe(15);
    expect(renderer.translate(0, 640)).toBe(640);
  });

  test('translateAndZoom without z uses this.zoom', () => {
    renderer.setZoom(2);
    // ((coord - base) * zoom) + base
    expect(renderer.translateAndZoom(10, 5)).toBe(15); // ((10-5)*2)+5
  });

  test('translateAndZoom with explicit z ignores this.zoom', () => {
    renderer.setZoom(99);
    expect(renderer.translateAndZoom(10, 5, 3)).toBe(20); // ((10-5)*3)+5
  });

  test('translateAndZoom at zoom=1 is identity', () => {
    renderer.setZoom(1);
    expect(renderer.translateAndZoom(42, 42)).toBe(42); // ((42-42)*1)+42
  });
});

describe('CM.Renderer — clear', () => {
  test('clear() calls ctx.clearRect with full canvas size', () => {
    renderer.clear();
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1280, 800);
  });
});

describe('CM.Renderer — drawRectangleStatic', () => {
  test('sets fillStyle and calls fillRect', () => {
    renderer.drawRectangleStatic(10, 20, 30, 40, '#ff0000');
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 30, 40);
    expect(ctx.fillStyle).toBe('#ff0000');
  });
});

describe('CM.Renderer — drawRectangle / drawRectangleZ', () => {
  test('drawRectangle calls fillRect', () => {
    renderer.drawRectangle(0, 0, 10, 10, '#00ff00');
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  test('drawRectangleZ sets fillStyle', () => {
    renderer.drawRectangleZ(0, 0, 10, 10, '#abcdef', 1);
    expect(ctx.fillStyle).toBe('#abcdef');
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});

describe('CM.Renderer — drawImage / drawImageZ / drawImageStatic', () => {
  const img = { width: 32, height: 32 };

  test('drawImage calls ctx.drawImage', () => {
    renderer.drawImage(img, 0, 0, 32, 32, 1);
    expect(ctx.drawImage).toHaveBeenCalledWith(img, expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
  });

  test('drawImageZ calls ctx.drawImage', () => {
    renderer.drawImageZ(img, 0, 0, 32, 32, 1, 1);
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  test('drawImageStatic calls ctx.drawImage', () => {
    renderer.drawImageStatic(img, 10, 20, 32, 32, 1);
    expect(ctx.drawImage).toHaveBeenCalledWith(img, 10, 20, 32, 32);
  });
});

describe('CM.Renderer — drawTile', () => {
  test('calls ctx.drawImage with rounded coordinates', () => {
    const img = { width: 32, height: 32 };
    renderer.drawTile(img, 0, 0, 32, 32);
    expect(ctx.drawImage).toHaveBeenCalled();
    // coordinates passed to ctx.drawImage should be integers (rounded)
    const args = ctx.drawImage.mock.calls[0];
    expect(Number.isInteger(args[1])).toBe(true);
    expect(Number.isInteger(args[2])).toBe(true);
  });

  test('toggles imageSmoothingEnabled off then on', () => {
    renderer.drawTile({ width: 32, height: 32 }, 0, 0, 32, 32);
    // After the call imageSmoothingEnabled should be restored to true
    expect(ctx.imageSmoothingEnabled).toBe(true);
  });
});

describe('CM.Renderer — drawTriangleStatic', () => {
  test('calls beginPath, moveTo, lineTo, closePath, fill', () => {
    renderer.drawTriangleStatic(
      new CM.Point(0, 0), new CM.Point(10, 0), new CM.Point(5, 10), '#ff0000'
    );
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalledTimes(2);
    expect(ctx.closePath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });
});

describe('CM.Renderer — fillText / fillTextStatic', () => {
  test('fillTextStatic calls ctx.fillText', () => {
    renderer.fillTextStatic('hello', 50, 100, 20);
    expect(ctx.fillText).toHaveBeenCalledWith('hello', 50, 100);
  });

  test('fillTextStatic uses default size 20 when omitted', () => {
    renderer.fillTextStatic('hi', 0, 0);
    expect(ctx.font).toBe('20px Ariel black');
  });

  test('fillText calls ctx.fillText', () => {
    renderer.fillText('world', 0, 0, 30);
    expect(ctx.fillText).toHaveBeenCalled();
  });
});

describe('CM.Renderer — lighter / restore', () => {
  test('lighter sets globalAlpha to 0.5 and saves original', () => {
    ctx.globalAlpha = 1;
    renderer.lighter();
    expect(ctx.globalAlpha).toBe(0.5);
  });

  test('restore calls ctx.restore()', () => {
    renderer.restore();
    expect(ctx.restore).toHaveBeenCalled();
  });
});

describe('CM.Renderer — drawWaterBackground', () => {
  test('calls ctx.drawImage at least once to tile the background', () => {
    const img = { width: 32, height: 32 };
    renderer.drawWaterBackground(img);
    expect(ctx.drawImage.mock.calls.length).toBeGreaterThan(0);
    expect(ctx.drawImage.mock.calls[0][0]).toBe(img);
  });
});
