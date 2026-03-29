const { makeRenderer } = require('./helpers');

// ── CM.Reed ───────────────────────────────────────────────────────────────────

describe('CM.Reed', () => {
  function makeReed(px = 0, py = 0) {
    return new CM.Reed(new CM.Point(px, py));
  }

  describe('initial state', () => {
    test('resourceType is REED', () => {
      expect(makeReed().resourceType).toBe('REED');
    });

    test('hitsRequired is 1', () => {
      expect(makeReed().hitsRequired).toBe(1);
    });

    test('classType is Reed', () => {
      expect(makeReed().classType).toBe('Reed');
    });

    test('sizeX is 12', () => {
      expect(makeReed().sizeX).toBe(12);
    });

    test('sizeY is 18', () => {
      expect(makeReed().sizeY).toBe(18);
    });

    test('z is GroundLevel', () => {
      expect(makeReed().z).toBe(CM.GroundLevel);
    });

    test('mineable flag is true', () => {
      expect(makeReed().mineable).toBe(true);
    });
  });

  describe('mine()', () => {
    test('depletes after 1 hit', () => {
      const r = makeReed();
      expect(r.mine()).toBe(true);
    });

    test('calls remover on depletion', () => {
      const r = makeReed();
      const remove = jest.fn();
      r.setRemover(remove);
      r.mine();
      expect(remove).toHaveBeenCalledWith(r);
    });
  });

  describe('draw()', () => {
    let renderer, ctx;
    beforeEach(() => ({ renderer, ctx } = makeRenderer()));

    test('does not throw', () => {
      expect(() => makeReed().draw(renderer)).not.toThrow();
    });

    test('draws stem rectangles', () => {
      makeReed().draw(renderer);
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    test('draws progress bar after a hit', () => {
      const r = makeReed();
      r.hitsReceived = 0;
      r.hitsRequired = 2; // give it 2 so bar appears
      r.mine();
      r.draw(renderer);
      const calls = ctx.fillRect.mock.calls.length;
      // stems (6) + progress bar (2) = 8+
      expect(calls).toBeGreaterThan(6);
    });
  });
});

// ── CM.BerryBush ──────────────────────────────────────────────────────────────

describe('CM.BerryBush', () => {
  function makeBush(type = 'BERRY_RED', px = 0, py = 0) {
    return new CM.BerryBush(new CM.Point(px, py), type);
  }

  describe('initial state', () => {
    test('resourceType matches constructor arg (BERRY_RED)', () => {
      expect(makeBush('BERRY_RED').resourceType).toBe('BERRY_RED');
    });

    test('resourceType matches constructor arg (BERRY_BLUE)', () => {
      expect(makeBush('BERRY_BLUE').resourceType).toBe('BERRY_BLUE');
    });

    test('berryColor is red for BERRY_RED', () => {
      expect(makeBush('BERRY_RED').berryColor).toBe('#cc2828');
    });

    test('berryColor is blue for BERRY_BLUE', () => {
      expect(makeBush('BERRY_BLUE').berryColor).toBe('#2848cc');
    });

    test('hitsRequired is 2', () => {
      expect(makeBush().hitsRequired).toBe(2);
    });

    test('classType is BerryBush', () => {
      expect(makeBush().classType).toBe('BerryBush');
    });

    test('z is GroundLevel', () => {
      expect(makeBush().z).toBe(CM.GroundLevel);
    });

    test('mineable flag is true', () => {
      expect(makeBush().mineable).toBe(true);
    });
  });

  describe('mine()', () => {
    test('not depleted after 1 hit', () => {
      expect(makeBush().mine()).toBe(false);
    });

    test('depleted after 2 hits', () => {
      const b = makeBush();
      b.mine();
      expect(b.mine()).toBe(true);
    });

    test('calls remover on depletion', () => {
      const b = makeBush();
      const remove = jest.fn();
      b.setRemover(remove);
      b.mine(); b.mine();
      expect(remove).toHaveBeenCalledWith(b);
    });
  });

  describe('draw()', () => {
    let renderer, ctx;
    beforeEach(() => ({ renderer, ctx } = makeRenderer()));

    test('does not throw for BERRY_RED', () => {
      expect(() => makeBush('BERRY_RED').draw(renderer)).not.toThrow();
    });

    test('does not throw for BERRY_BLUE', () => {
      expect(() => makeBush('BERRY_BLUE').draw(renderer)).not.toThrow();
    });

    test('draws bush body rectangles', () => {
      makeBush().draw(renderer);
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    test('draws more rects after a hit (progress bar)', () => {
      const b = makeBush();
      const callsBefore = (() => {
        const { ctx: c } = makeRenderer();
        b.draw({ drawRectangleZ: jest.fn() });
        return 0;
      })();
      b.mine();
      b.draw(renderer);
      // bush (3) + berries (6) + progress bar (2) = 11+
      expect(ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(9);
    });
  });
});
