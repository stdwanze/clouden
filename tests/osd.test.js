const { makeRenderer } = require('./helpers');

describe('CM.OSD', () => {
  let renderer, ctx, repo, osd;

  beforeEach(() => {
    ({ renderer, ctx } = makeRenderer());
    repo = { getImage: jest.fn().mockReturnValue({ width: 20, height: 20, src: '' }) };
    osd = new CM.OSD(renderer, repo);
  });

  describe('loadImage()', () => {
    test('calls imagerepo.getImage with lowercased name + "-osd"', () => {
      osd.loadImage('HEALTH');
      expect(repo.getImage).toHaveBeenCalledWith('health-osd');
    });

    test('returns the image from the repo', () => {
      const img = osd.loadImage('COINS');
      expect(img).toBeDefined();
    });

    test('caches the result — repo.getImage called only once on repeated calls', () => {
      osd.loadImage('AMMO');
      osd.loadImage('AMMO');
      expect(repo.getImage).toHaveBeenCalledTimes(1);
    });

    test('returns null when repo returns falsy', () => {
      repo.getImage.mockReturnValue(null);
      expect(osd.loadImage('MISSING')).toBeNull();
    });
  });

  describe('displayScores()', () => {
    test('draws two rectangles per score (red background + green fill)', () => {
      osd.displayScores([new CM.Health(10)], 'BOTTOM-LEFT');
      expect(ctx.fillRect).toHaveBeenCalledTimes(2);
    });

    test('draws rectangles for each score in the array', () => {
      osd.displayScores([new CM.Health(10), new CM.Ammo(10)], 'BOTTOM-LEFT');
      expect(ctx.fillRect).toHaveBeenCalledTimes(4);
    });

    test('BOTTOM-LEFT: first score x starts at 0', () => {
      osd.displayScores([new CM.Health(10)], 'BOTTOM-LEFT');
      const firstCall = ctx.fillRect.mock.calls[0];
      expect(firstCall[0]).toBe(0); // size*0*2 = 0
    });

    test('BOTTOM-RIGHT: first score x is near right edge of screen', () => {
      osd.displayScores([new CM.Health(10)], 'BOTTOM-RIGHT');
      const firstCall = ctx.fillRect.mock.calls[0];
      expect(firstCall[0]).toBeGreaterThan(1000); // close to 1280
    });

    test('also draws OSD icon image when repo provides one', () => {
      osd.displayScores([new CM.Health(10)], 'BOTTOM-LEFT');
      expect(ctx.drawImage).toHaveBeenCalled();
    });

    test('skips icon draw when repo returns null for that score', () => {
      repo.getImage.mockReturnValue(null);
      osd.displayScores([new CM.Health(10)], 'BOTTOM-LEFT');
      expect(ctx.drawImage).not.toHaveBeenCalled();
    });
  });
});

describe('CM.OnScreenDocu', () => {
  let renderer, ctx, repo, doc;

  beforeEach(() => {
    ({ renderer, ctx } = makeRenderer());
    repo = { getImage: jest.fn().mockReturnValue({ width: 24, height: 24, src: '' }) };
    doc = new CM.OnScreenDocu(new CM.Point(-150, -100), repo);
  });

  test('starts hidden (visible = false)', () => {
    expect(doc.visible).toBe(false);
  });

  test('toggle() makes it visible', () => {
    doc.toggle();
    expect(doc.visible).toBe(true);
  });

  test('toggle() again hides it', () => {
    doc.toggle();
    doc.toggle();
    expect(doc.visible).toBe(false);
  });

  test('draw() is a no-op when not visible', () => {
    doc.draw(renderer);
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  test('draw() renders panel when visible', () => {
    doc.toggle();
    doc.draw(renderer);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  test('draw() renders text lines when visible', () => {
    doc.toggle();
    doc.draw(renderer);
    expect(ctx.fillText).toHaveBeenCalled();
  });

  test('draw() renders collectable icons when visible', () => {
    doc.toggle();
    doc.draw(renderer);
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  test('draw() renders mining section text when visible', () => {
    doc.toggle();
    doc.draw(renderer);
    const texts = ctx.fillText.mock.calls.map(c => c[0]);
    expect(texts.some(t => t.includes('e-key'))).toBe(true);
    expect(texts.some(t => /wood/i.test(t))).toBe(true);
    expect(texts.some(t => /stone/i.test(t))).toBe(true);
  });

  test('draw() renders inventory hint when visible', () => {
    doc.toggle();
    doc.draw(renderer);
    const texts = ctx.fillText.mock.calls.map(c => c[0]);
    expect(texts.some(t => t.includes('i-key'))).toBe(true);
  });
});
