CM = window.CM || {};

CM.Inventory = class Inventory {
    constructor(imagerepo) {
        this.slots = new Array(16).fill(null);
        this.open = false;
        this.imagerepo = imagerepo || null;
        this.selectedSlot = 0;
    }

    toggle() {
        this.open = !this.open;
        if (this.open === false) {
            this.selectedSlot = 0;
        }
    }

    moveSelection(dx, dy) {
        var cols = 4;
        var rows = 4;
        var col = this.selectedSlot % cols;
        var row = Math.floor(this.selectedSlot / cols);
        col = (col + dx + cols) % cols;
        row = (row + dy + rows) % rows;
        this.selectedSlot = row * cols + col;
    }

    getSelectedItem() {
        return this.slots[this.selectedSlot];
    }

    removeSelectedItem() {
        var slot = this.slots[this.selectedSlot];
        if (!slot) return false;
        slot.count--;
        if (slot.count <= 0) {
            this.slots[this.selectedSlot] = null;
        }
        return true;
    }

    isOpen() {
        return this.open;
    }

    addItemCount(type, count) {
        for (var n = 0; n < count; n++) this.addItem(type);
    }
    addItem(type) {
        for (var i = 0; i < this.slots.length; i++) {
            if (this.slots[i] && this.slots[i].type === type) {
                this.slots[i].count++;
                return true;
            }
        }
        for (var i = 0; i < this.slots.length; i++) {
            if (this.slots[i] === null) {
                this.slots[i] = { type: type, count: 1 };
                return true;
            }
        }
        return false;
    }

    draw(renderer) {
        if (!this.open) return;

        var w = renderer.getScreenWidth();
        var h = renderer.getScreenHeight();

        var SLOT  = 64;
        var GAP   = 10;
        var COLS  = 4;
        var ROWS  = 4;
        var PAD   = 24;
        var TITLE_H = 30;

        var gridW = COLS * SLOT + (COLS - 1) * GAP;
        var gridH = ROWS * SLOT + (ROWS - 1) * GAP;
        var startX = Math.floor((w - gridW) / 2);
        var startY = Math.floor((h - gridH) / 2) + Math.floor(TITLE_H / 2);

        // dim overlay
        renderer.drawRectangleStatic(0, 0, w, h, 'rgba(0,0,0,0.55)');

        // panel background
        renderer.drawRectangleStatic(
            startX - PAD,
            startY - PAD - TITLE_H,
            gridW + PAD * 2,
            gridH + PAD * 2 + TITLE_H,
            'rgba(18,20,28,0.94)'
        );

        // panel border
        renderer.drawRectangleStatic(startX - PAD - 2, startY - PAD - TITLE_H - 2, gridW + PAD * 2 + 4, 2, '#445566');
        renderer.drawRectangleStatic(startX - PAD - 2, startY + gridH + PAD, gridW + PAD * 2 + 4, 2, '#445566');
        renderer.drawRectangleStatic(startX - PAD - 2, startY - PAD - TITLE_H - 2, 2, gridH + PAD * 2 + TITLE_H + 4, '#445566');
        renderer.drawRectangleStatic(startX + gridW + PAD, startY - PAD - TITLE_H - 2, 2, gridH + PAD * 2 + TITLE_H + 4, '#445566');

        // title
        renderer.fillTextStaticColor('INVENTAR', startX, startY - PAD - 8, 16, '#aabbcc');

        // slots
        for (var i = 0; i < 16; i++) {
            var col = i % COLS;
            var row = Math.floor(i / COLS);
            var x = startX + col * (SLOT + GAP);
            var y = startY + row * (SLOT + GAP);

            // slot border
            var borderColor = (this.open && i === this.selectedSlot) ? '#ffd700' : '#3a4a5a';
            renderer.drawRectangleStatic(x - 1, y - 1, SLOT + 2, SLOT + 2, borderColor);
            // slot fill
            renderer.drawRectangleStatic(x, y, SLOT, SLOT, 'rgba(35,40,55,0.95)');

            if (this.slots[i] != null) {
                var item = this.slots[i];
                var img = this.imagerepo ? this.imagerepo.getImage('item_' + item.type.toLowerCase()) : null;
                if (img && img.width) {
                    var maxW = SLOT - 8;
                    var maxH = SLOT - 8;
                    var scale = Math.min(maxW / img.width, maxH / img.height);
                    var drawW = img.width * scale;
                    var drawH = img.height * scale;
                    renderer.drawImageStatic(img, x + Math.floor((SLOT - drawW) / 2), y + Math.floor((SLOT - drawH) / 2), img.width, img.height, scale);
                } else {
                    var labelColor = item.type === 'STONE' ? '#aaaaaa' : '#a0622a';
                    renderer.fillTextStaticColor(item.type, x + 4, y + 22, 11, labelColor);
                }
                if (item.count > 1) {
                    renderer.fillTextStaticColor('' + item.count, x + SLOT - 14, y + SLOT - 5, 11, '#dddddd');
                }
            }
        }

        // hint
        renderer.fillTextStaticColor('[I] schliessen', startX, startY + gridH + PAD + 16, 12, '#556677');
    }
}
