const { makeRenderer } = require('./helpers');

describe('CM.Inventory', () => {
  let inv;

  beforeEach(() => {
    inv = new CM.Inventory();
  });

  describe('initial state', () => {
    test('starts closed', () => {
      expect(inv.isOpen()).toBe(false);
    });

    test('has 16 slots', () => {
      expect(inv.slots.length).toBe(16);
    });

    test('all slots start empty (null)', () => {
      expect(inv.slots.every(s => s === null)).toBe(true);
    });
  });

  describe('toggle()', () => {
    test('opens when closed', () => {
      inv.toggle();
      expect(inv.isOpen()).toBe(true);
    });

    test('closes when open', () => {
      inv.toggle();
      inv.toggle();
      expect(inv.isOpen()).toBe(false);
    });

    test('repeated toggles alternate state', () => {
      for (let i = 1; i <= 6; i++) {
        inv.toggle();
        expect(inv.isOpen()).toBe(i % 2 === 1);
      }
    });
  });

  describe('draw()', () => {
    let renderer, ctx;

    beforeEach(() => {
      ({ renderer, ctx } = makeRenderer());
    });

    test('does nothing when closed', () => {
      inv.draw(renderer);
      expect(ctx.fillRect).not.toHaveBeenCalled();
      expect(ctx.fillText).not.toHaveBeenCalled();
    });

    test('draws overlay when open', () => {
      inv.toggle();
      inv.draw(renderer);
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    test('draws at least 16 slot rects when open', () => {
      inv.toggle();
      inv.draw(renderer);
      // each slot = 2 fillRect calls (border + fill), plus overlay + panel + 4 border lines
      expect(ctx.fillRect.mock.calls.length).toBeGreaterThanOrEqual(16);
    });

    test('draws text (title + hint) when open', () => {
      inv.toggle();
      inv.draw(renderer);
      expect(ctx.fillText).toHaveBeenCalledTimes(2); // title + hint
    });

    test('title text is "INVENTAR"', () => {
      inv.toggle();
      inv.draw(renderer);
      const texts = ctx.fillText.mock.calls.map(c => c[0]);
      expect(texts).toContain('INVENTAR');
    });

    test('hint text contains "schliessen"', () => {
      inv.toggle();
      inv.draw(renderer);
      const texts = ctx.fillText.mock.calls.map(c => c[0]);
      expect(texts.some(t => t.includes('schliessen'))).toBe(true);
    });
  });
});

describe('CM.Renderer fillTextStaticColor()', () => {
  let renderer, ctx;

  beforeEach(() => {
    ({ renderer, ctx } = makeRenderer());
  });

  test('calls fillText with the given text', () => {
    renderer.fillTextStaticColor('hello', 10, 20, 14, '#ffffff');
    expect(ctx.fillText).toHaveBeenCalledWith('hello', 10, 20);
  });

  test('sets fillStyle to the given color', () => {
    renderer.fillTextStaticColor('x', 0, 0, 12, '#aabbcc');
    expect(ctx.fillStyle).toBe('#aabbcc');
  });

  test('defaults to #24272b when no color given', () => {
    renderer.fillTextStaticColor('x', 0, 0, 12);
    expect(ctx.fillStyle).toBe('#24272b');
  });

  test('defaults font size to 20 when undefined', () => {
    renderer.fillTextStaticColor('x', 0, 0, undefined, '#fff');
    expect(ctx.font).toContain('20');
  });
});
