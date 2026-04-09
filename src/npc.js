CM = window.CM || {};

CM.NPC = class NPC extends CM.MoveableObject {
    constructor(position) {
        super(position, 28, 23, CM.GroundLevel);
        this.isNPC = true;
        this.questIndex = 0;
        this.questAccepted = false;
        this.quests = [
            {
                resource: 'WOOD', amount: 15,
                text: 'Bringe mir 15 Holz!',
                rewardText: '+50 M\u00fcnzen',
                reward: { coins: 50 },
            },
            {
                check: 'CRAFTING_STATION',
                text: 'Baue eine Werkbank in deiner Blockh\u00fctte! (H \u2192 Ausbauen)',
                rewardText: '+5 Leben + 10 Pfeile',
                reward: { health: 5, ammo: 10 },
            },
            {
                resource: 'COMPASS', amount: 1,
                text: 'Craft einen Kompass an der Werkbank! (1 Stein + 3 Kristalle)',
                rewardText: '+30 M\u00fcnzen',
                reward: { coins: 30 },
            },
            {
                check: 'SKYMAP',
                text: 'Finde die Himmelskarte in einer H\u00f6hle!',
                rewardText: '+50 M\u00fcnzen',
                reward: { coins: 50 },
            },
            {
                resource: 'EGG', amount: 1,
                text: 'Bring mir einen Himmelsstein von einer Floating Island!',
                rewardText: 'Blimp-Upgrade: +30 Fuel-Kapazit\u00e4t!',
                reward: { blimpUpgrade: { fuelMax: 30 } },
            },
        ];
    }

    getQuest() {
        if (this.questIndex >= this.quests.length) return null;
        return this.quests[this.questIndex];
    }

    draw(renderer) {
        var x = this.position.x;
        var y = this.position.y;
        var z = renderer.zoom;

        // Mast
        renderer.drawRectangleZ(x + 13, y,      2, 18, '#5a3010', z);
        // Yard arm
        renderer.drawRectangleZ(x +  6, y + 1, 16,  1, '#5a3010', z);
        // Sail
        renderer.drawRectangleZ(x +  7, y + 2,  9, 10, '#f5f0e0', z);
        // Flag
        renderer.drawRectangleZ(x + 15, y - 3,  5,  3, '#cc2222', z);
        // Stern cabin
        renderer.drawRectangleZ(x + 19, y + 11, 7,  5, '#7a4828', z);
        // Cabin window
        renderer.drawRectangleZ(x + 21, y + 12, 2,  2, '#d4a04a', z);
        // Deck
        renderer.drawRectangleZ(x,      y + 15, 28,  2, '#8a5830', z);
        // Hull
        renderer.drawRectangleZ(x +  2, y + 17, 24,  4, '#6b3a1e', z);
        // Keel
        renderer.drawRectangleZ(x +  4, y + 21, 20,  2, '#4a2810', z);

        // Quest marker "!" above mast when quest available
        if (!this.questAccepted && this.getQuest()) {
            renderer.drawRectangleZ(x + 13, y - 13, 2, 5, '#ffdd00', z);
            renderer.drawRectangleZ(x + 13, y -  7, 2, 2, '#ffdd00', z);
        }
    }
}
