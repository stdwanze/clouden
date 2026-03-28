describe('CM.Point', () => {
  test('constructor stores x and y', () => {
    const p = new CM.Point(3, 7);
    expect(p.x).toBe(3);
    expect(p.y).toBe(7);
  });

  test('move mutates coordinates and returns this', () => {
    const p = new CM.Point(1, 2);
    const ret = p.move(4, -1);
    expect(p.x).toBe(5);
    expect(p.y).toBe(1);
    expect(ret).toBe(p);
  });

  test('move is chainable', () => {
    const p = new CM.Point(0, 0).move(3, 3).move(-1, -1);
    expect(p.x).toBe(2);
    expect(p.y).toBe(2);
  });

  test('clone returns an independent copy', () => {
    const a = new CM.Point(10, 20);
    const b = a.clone();
    expect(b.x).toBe(10);
    expect(b.y).toBe(20);
    b.move(99, 99);
    expect(a.x).toBe(10); // original unchanged
  });
});

describe('CM.AABB', () => {
  const box = () => new CM.AABB(new CM.Point(10, 10), new CM.Point(20, 20));

  test('contains returns true for point inside', () => {
    expect(box().contains(new CM.Point(15, 15))).toBe(true);
  });

  test('contains returns true on top-left corner (inclusive)', () => {
    expect(box().contains(new CM.Point(10, 10))).toBe(true);
  });

  test('contains returns false on right boundary (exclusive)', () => {
    expect(box().contains(new CM.Point(30, 15))).toBe(false);
  });

  test('contains returns false on bottom boundary (exclusive)', () => {
    expect(box().contains(new CM.Point(15, 30))).toBe(false);
  });

  test('contains returns false for point outside', () => {
    expect(box().contains(new CM.Point(0, 0))).toBe(false);
  });
});

describe('CM.InputHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new CM.InputHandler();
  });

  test('calcCurrentlyPressed returns empty array initially', () => {
    expect(handler.calcCurrentlyPressed()).toEqual([]);
  });

  test('keydown marks key as pressed', () => {
    handler.keydown({ keyCode: 37 });
    const pressed = handler.calcCurrentlyPressed();
    expect(pressed.length).toBe(1);
    expect(pressed[0][0]).toBe('37');
    expect(pressed[0][1]).toBe(true);
  });

  test('keyup marks key as not pressed', () => {
    handler.keydown({ keyCode: 37 });
    handler.keyup({ keyCode: 37 });
    expect(handler.calcCurrentlyPressed()).toEqual([]);
  });

  test('multiple keys can be tracked simultaneously', () => {
    handler.keydown({ keyCode: 37 });
    handler.keydown({ keyCode: 39 });
    expect(handler.calcCurrentlyPressed().length).toBe(2);
  });

  test('on() registers keyup listener and fires it on keyup', () => {
    const fn = jest.fn();
    handler.on('keyup', fn);
    handler.keydown({ keyCode: 38 });
    handler.keyup({ keyCode: 38 });
    expect(fn).toHaveBeenCalledWith(null, expect.any(Array));
  });

  test('on() registers keydown listener and fires it on keydown', () => {
    const fn = jest.fn();
    handler.on('keydown', fn);
    handler.keydown({ keyCode: 65 });
    expect(fn).toHaveBeenCalledWith(65, expect.any(Array));
  });

  test('on() registers arrowKeys listener and fires for arrow keycodes', () => {
    const fn = jest.fn();
    handler.on('arrowKeys', fn);
    handler.keydown({ keyCode: 38 }); // up arrow
    expect(fn).toHaveBeenCalled();
  });

  test('arrowKeys listener does not fire for non-arrow keys', () => {
    const fn = jest.fn();
    handler.on('arrowKeys', fn);
    handler.keydown({ keyCode: 65 }); // 'A'
    expect(fn).not.toHaveBeenCalled();
  });

  test('on() registers letterKeys listener and fires for letter keycodes', () => {
    const fn = jest.fn();
    handler.on('letterKeys', fn);
    handler.keydown({ keyCode: 67 }); // 'C'
    expect(fn).toHaveBeenCalled();
  });

  test('letterKeys listener does not fire for arrow key when no letter is held', () => {
    const fn = jest.fn();
    handler.on('letterKeys', fn);
    handler.keydown({ keyCode: 37 }); // left arrow, nothing else held
    expect(fn).not.toHaveBeenCalled();
  });

  test('letterKeys listener fires for held letter when a non-letter key is pressed', () => {
    const fn = jest.fn();
    handler.on('letterKeys', fn);
    handler.keydown({ keyCode: 67 }); // press C
    fn.mockClear();
    handler.keydown({ keyCode: 37 }); // press left arrow while C is held
    expect(fn).toHaveBeenCalledWith(67, expect.any(Array));
  });

  test('letterKeys listener does not double-fire the new letter when pressed alongside a held letter', () => {
    const fn = jest.fn();
    handler.on('letterKeys', fn);
    handler.keydown({ keyCode: 67 }); // press C
    fn.mockClear();
    handler.keydown({ keyCode: 65 }); // press A while C is held
    // A fires once (new key), C fires once (held letter re-notified — but A is a letter so else branch not taken)
    // Actually: A is a letter (65-90), so it goes through the `if` branch, not `else`
    // C should NOT be re-fired here — only the `if` branch fires for A
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(65, expect.any(Array));
  });

  test('inrange returns true for boundary values', () => {
    expect(handler.inrange(37, 37, 40)).toBe(true);
    expect(handler.inrange(40, 37, 40)).toBe(true);
  });

  test('inrange returns false outside range', () => {
    expect(handler.inrange(36, 37, 40)).toBe(false);
    expect(handler.inrange(41, 37, 40)).toBe(false);
  });
});
