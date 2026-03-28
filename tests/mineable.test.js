const { makeRenderer } = require('./helpers');

function makeMineable(type = 'WOOD', px = 0, py = 0) {
    return new CM.Mineable(new CM.Point(px, py), type);
}

describe('CM.Mineable', () => {
    describe('initial state', () => {
        test('WOOD requires 3 hits', () => {
            expect(makeMineable('WOOD').hitsRequired).toBe(3);
        });

        test('STONE requires 5 hits', () => {
            expect(makeMineable('STONE').hitsRequired).toBe(5);
        });

        test('starts with 0 hits received', () => {
            expect(makeMineable().hitsReceived).toBe(0);
        });

        test('mineable flag is true', () => {
            expect(makeMineable().mineable).toBe(true);
        });

        test('hitFlash starts at 0', () => {
            expect(makeMineable().hitFlash).toBe(0);
        });

        test('z is GroundLevel', () => {
            expect(makeMineable().z).toBe(CM.GroundLevel);
        });
    });

    describe('mine()', () => {
        test('increments hitsReceived', () => {
            const m = makeMineable();
            m.mine();
            expect(m.hitsReceived).toBe(1);
        });

        test('sets hitFlash on each hit', () => {
            const m = makeMineable();
            m.mine();
            expect(m.hitFlash).toBe(8);
        });

        test('returns false before last hit', () => {
            const m = makeMineable('WOOD'); // needs 3 hits
            expect(m.mine()).toBe(false); // 1st
            expect(m.mine()).toBe(false); // 2nd
        });

        test('returns true when already depleted (guard)', () => {
            const m = makeMineable('WOOD');
            m.mine(); m.mine(); m.mine(); // deplete
            expect(m.mine()).toBe(true); // already done, no further effect
            expect(m.hitsReceived).toBe(3); // not incremented further
        });

        test('returns true on last hit (WOOD after 3)', () => {
            const m = makeMineable('WOOD');
            m.mine(); m.mine();
            expect(m.mine()).toBe(true);
        });

        test('returns true on last hit (STONE after 5)', () => {
            const m = makeMineable('STONE');
            for (let i = 0; i < 4; i++) m.mine();
            expect(m.mine()).toBe(true);
        });

        test('calls remove callback when depleted', () => {
            const m = makeMineable('WOOD');
            const remove = jest.fn();
            m.setRemover(remove);
            m.mine(); m.mine(); m.mine();
            expect(remove).toHaveBeenCalledWith(m);
        });

        test('does not call remove before depletion', () => {
            const m = makeMineable('WOOD');
            const remove = jest.fn();
            m.setRemover(remove);
            m.mine();
            expect(remove).not.toHaveBeenCalled();
        });

        test('does not throw when no remover set', () => {
            const m = makeMineable('WOOD');
            m.mine(); m.mine();
            expect(() => m.mine()).not.toThrow();
        });
    });

    describe('tick()', () => {
        test('decrements hitFlash each frame', () => {
            const m = makeMineable();
            m.mine(); // sets hitFlash = 8
            m.tick();
            expect(m.hitFlash).toBe(7);
        });

        test('hitFlash does not go below 0', () => {
            const m = makeMineable();
            m.tick();
            expect(m.hitFlash).toBe(0);
        });
    });

    describe('draw()', () => {
        let renderer, ctx;
        beforeEach(() => ({ renderer, ctx } = makeRenderer()));

        test('draws a rectangle for WOOD (no throw)', () => {
            expect(() => makeMineable('WOOD').draw(renderer)).not.toThrow();
            expect(ctx.fillRect).toHaveBeenCalled();
        });

        test('draws a rectangle for STONE (no throw)', () => {
            expect(() => makeMineable('STONE').draw(renderer)).not.toThrow();
            expect(ctx.fillRect).toHaveBeenCalled();
        });

        test('draws no progress bar when not yet hit', () => {
            makeMineable().draw(renderer);
            expect(ctx.fillRect).toHaveBeenCalledTimes(1);
        });

        test('draws progress bar after first hit', () => {
            const m = makeMineable();
            m.mine();
            m.draw(renderer);
            // base rect + hit flash + bar background + bar fill = 4
            expect(ctx.fillRect).toHaveBeenCalledTimes(4);
        });
    });
});

describe('CM.Inventory addItem()', () => {
    let inv;
    beforeEach(() => { inv = new CM.Inventory(); });

    test('adds item to first empty slot', () => {
        inv.addItem('WOOD');
        expect(inv.slots[0]).toEqual({ type: 'WOOD', count: 1 });
    });

    test('stacks same type in existing slot', () => {
        inv.addItem('WOOD');
        inv.addItem('WOOD');
        expect(inv.slots[0].count).toBe(2);
        expect(inv.slots[1]).toBeNull();
    });

    test('different types go into separate slots', () => {
        inv.addItem('WOOD');
        inv.addItem('STONE');
        expect(inv.slots[0].type).toBe('WOOD');
        expect(inv.slots[1].type).toBe('STONE');
    });

    test('returns true when item added successfully', () => {
        expect(inv.addItem('WOOD')).toBe(true);
    });

    test('returns false when inventory is full', () => {
        for (let i = 0; i < 16; i++) inv.slots[i] = { type: 'TYPE' + i, count: 1 };
        expect(inv.addItem('STONE')).toBe(false);
    });

    test('stacks into first matching slot, not second', () => {
        inv.slots[0] = { type: 'STONE', count: 2 };
        inv.slots[1] = { type: 'STONE', count: 1 };
        inv.addItem('STONE');
        expect(inv.slots[0].count).toBe(3);
        expect(inv.slots[1].count).toBe(1);
    });
});
