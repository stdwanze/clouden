// NPC quest chain tests

describe('CM.NPC — construction', () => {
    function makeNPC() {
        return new CM.NPC(new CM.Point(0, 0));
    }

    test('isNPC is true', () => {
        expect(makeNPC().isNPC).toBe(true);
    });

    test('questIndex starts at 0', () => {
        expect(makeNPC().questIndex).toBe(0);
    });

    test('questAccepted starts false', () => {
        expect(makeNPC().questAccepted).toBe(false);
    });

    test('has exactly 5 quests', () => {
        expect(makeNPC().quests.length).toBe(5);
    });
});

describe('CM.NPC — getQuest()', () => {
    function makeNPC() {
        return new CM.NPC(new CM.Point(0, 0));
    }

    test('returns quest 0 initially', () => {
        const npc = makeNPC();
        expect(npc.getQuest()).toBe(npc.quests[0]);
    });

    test('returns null when all quests are done', () => {
        const npc = makeNPC();
        npc.questIndex = npc.quests.length;
        expect(npc.getQuest()).toBeNull();
    });

    test('returns correct quest for each index', () => {
        const npc = makeNPC();
        for (let i = 0; i < npc.quests.length; i++) {
            npc.questIndex = i;
            expect(npc.getQuest()).toBe(npc.quests[i]);
        }
    });
});

describe('CM.NPC — quest chain structure', () => {
    let npc;
    beforeEach(() => { npc = new CM.NPC(new CM.Point(0, 0)); });

    test('quest 0: resource WOOD × 15', () => {
        const q = npc.quests[0];
        expect(q.resource).toBe('WOOD');
        expect(q.amount).toBe(15);
        expect(q.reward.coins).toBeGreaterThan(0);
    });

    test('quest 1: check CRAFTING_STATION (no resource field)', () => {
        const q = npc.quests[1];
        expect(q.check).toBe('CRAFTING_STATION');
        expect(q.resource).toBeUndefined();
    });

    test('quest 1: reward includes health and ammo', () => {
        const q = npc.quests[1];
        expect(q.reward.health).toBeGreaterThan(0);
        expect(q.reward.ammo).toBeGreaterThan(0);
    });

    test('quest 2: resource COMPASS × 1', () => {
        const q = npc.quests[2];
        expect(q.resource).toBe('COMPASS');
        expect(q.amount).toBe(1);
    });

    test('quest 3: check SKYMAP (no resource field)', () => {
        const q = npc.quests[3];
        expect(q.check).toBe('SKYMAP');
        expect(q.resource).toBeUndefined();
    });

    test('quest 4: resource EGG × 1 (Himmelsstein)', () => {
        const q = npc.quests[4];
        expect(q.resource).toBe('EGG');
        expect(q.amount).toBe(1);
    });

    test('quest 4: reward contains blimpUpgrade with fuelMax', () => {
        const q = npc.quests[4];
        expect(q.reward.blimpUpgrade).toBeDefined();
        expect(q.reward.blimpUpgrade.fuelMax).toBeGreaterThan(0);
    });

    test('all quests have text and rewardText', () => {
        npc.quests.forEach(q => {
            expect(typeof q.text).toBe('string');
            expect(q.text.length).toBeGreaterThan(0);
            expect(typeof q.rewardText).toBe('string');
            expect(q.rewardText.length).toBeGreaterThan(0);
        });
    });

    test('resource quests have amount > 0', () => {
        npc.quests.filter(q => q.resource).forEach(q => {
            expect(q.amount).toBeGreaterThan(0);
        });
    });

    test('check quests have check string', () => {
        npc.quests.filter(q => q.check).forEach(q => {
            expect(typeof q.check).toBe('string');
        });
    });
});

describe('CM.NPC — draw()', () => {
    const { makeRenderer } = require('./helpers');

    test('does not throw', () => {
        const npc = new CM.NPC(new CM.Point(0, 0));
        const { renderer } = makeRenderer();
        expect(() => npc.draw(renderer)).not.toThrow();
    });

    test('draws multiple rectangles', () => {
        const npc = new CM.NPC(new CM.Point(0, 0));
        const { renderer, ctx } = makeRenderer();
        npc.draw(renderer);
        expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(5);
    });

    test('draws quest marker (!) when quest pending and not accepted', () => {
        const npc = new CM.NPC(new CM.Point(0, 0));
        npc.questAccepted = false;
        const { renderer, ctx } = makeRenderer();
        const callsBefore = 0;
        npc.draw(renderer);
        // marker adds 2 extra rects
        expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(callsBefore + 7);
    });

    test('no quest marker when quest accepted', () => {
        const npc = new CM.NPC(new CM.Point(0, 0));
        npc.questAccepted = true;
        const { renderer, ctx } = makeRenderer();
        npc.draw(renderer);
        const withAccepted = ctx.fillRect.mock.calls.length;

        ctx.fillRect.mockClear();
        npc.questAccepted = false;
        npc.draw(renderer);
        const withPending = ctx.fillRect.mock.calls.length;

        expect(withPending).toBeGreaterThan(withAccepted);
    });
});
