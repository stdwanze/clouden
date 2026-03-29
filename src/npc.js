CM = window.CM || {};

CM.NPC = class NPC extends CM.MoveableObject {
    constructor(position) {
        super(position, 28, 23, CM.GroundLevel);
        this.isNPC = true;
        this.questIndex = 0;
        this.questAccepted = false;
        this.quests = [
            { resource: 'WOOD',      amount: 30, text: 'Sammle mir 30 Holz!',            rewardText: '+50 M\u00fcnzen',              reward: { coins: 50 } },
            { resource: 'STONE',     amount: 10, text: 'Bringe mir 10 Stein!',           rewardText: '+30 M\u00fcnzen + 5 Pfeile',   reward: { coins: 30, ammo: 5 } },
            { resource: 'REED',      amount:  5, text: 'Bringe mir 5 Schilf!',           rewardText: '+5 Leben',                     reward: { health: 5 } },
            { resource: 'BERRY_RED', amount:  3, text: 'Bringe mir 3 rote Beeren!',      rewardText: '+10 Pfeile',                   reward: { ammo: 10 } },
            { resource: 'WOOD',      amount: 50, text: 'Ich brauche 50 Holz f\u00fcr den Bau!', rewardText: '+100 M\u00fcnzen',       reward: { coins: 100 } },
        ];
    }

    getQuest() {
        if (this.questIndex >= this.quests.length) return null;
        return this.quests[this.questIndex];
    }

    draw(renderer) {
        var x = this.position.x;
        var y = this.position.y;
        var z = this.z;

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
