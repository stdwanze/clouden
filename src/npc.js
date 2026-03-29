CM = window.CM || {};

CM.NPC = class NPC extends CM.MoveableObject {
    constructor(position) {
        super(position, 12, 20, CM.GroundLevel);
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

        // Hat top
        renderer.drawRectangleZ(x + 2, y - 3, 8,  3, '#5a3010', z);
        // Hat brim
        renderer.drawRectangleZ(x,     y,      12, 2, '#5a3010', z);
        // Head
        renderer.drawRectangleZ(x + 2, y + 2,  8,  6, '#f0c090', z);
        // Eyes
        renderer.drawRectangleZ(x + 4, y + 4,  1,  1, '#333333', z);
        renderer.drawRectangleZ(x + 7, y + 4,  1,  1, '#333333', z);
        // Body
        renderer.drawRectangleZ(x + 2, y + 8,  8,  7, '#c8883a', z);
        // Arms
        renderer.drawRectangleZ(x,     y + 9,  2,  5, '#c8883a', z);
        renderer.drawRectangleZ(x + 10,y + 9,  2,  5, '#c8883a', z);
        // Legs
        renderer.drawRectangleZ(x + 3, y + 15, 3,  5, '#5a3820', z);
        renderer.drawRectangleZ(x + 6, y + 15, 3,  5, '#5a3820', z);

        // Quest marker "!" above hat when quest available
        if (!this.questAccepted && this.getQuest()) {
            renderer.drawRectangleZ(x + 5, y - 14, 2, 5, '#ffdd00', z);
            renderer.drawRectangleZ(x + 5, y -  8, 2, 2, '#ffdd00', z);
        }
    }
}
