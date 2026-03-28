CM = window.CM || {};


CM.CloudEngine=    class CloudEngine{
        constructor( renderer,world,imagerepo, pos)
        {
            this.startPos = pos;
            this.world = world;
            this.imagerepo = imagerepo;
            this.inputHandler = new CM.InputHandler();
            this.renderer = renderer;
            this.player = null ;
            this.keys = {};
            this.speed = 1;
            this.osd = new CM.OSD(this.renderer,this.imagerepo);
            this.over = false;
            this.paused = false;
            this.inventory = new CM.Inventory(this.imagerepo);
            this.notification = '';
            this.notificationFrames = 0;
            this.minimap = new CM.Minimap();
            this.nearbyHut = null;
            this.hutDevelopOpen = false;
            this.hutCraftOpen = false;
        }

        run(){
            this.renderer.setZoom(this.player.height);
            this.tickndraw();

        }
        tickndraw(){
            var self = this;

            if(!this.paused){
                if(!this.over){
                    // update renderer
                    this.renderer.setZoom(this.player.z);
                    this.renderer.clear();
                    this.renderer.updatePos(this.player.position);
                    this.renderer.drawWaterBackground(this.imagerepo.getImage("tile_water"));


                    // handle movement every frame for smooth input
                    this.handleMove(null, this.inputHandler.calcCurrentlyPressed());
                    var heldKeys = this.inputHandler.currentKeys;
                    if (heldKeys[65]) this.player.ascend(0.01);
                    if (heldKeys[83]) this.player.descend(0.01);

                    // interacte player with world
                    this.tryCollect();

                    // draw world
                    this.world.getScene(this.player.position).forEach(element => {
                        this.renderer.draw(element);
                    });


                    // draw movableobjects
                    this.world.getObjects().forEach(element =>
                    {
                        element.tick(this.player);
                        if(this.player.z >= element.z+0.3)
                        {
                            this.renderer.lighter()
                        }
                        this.renderer.draw(element);
                        this.renderer.restore();
                    });

                    //draw Player
                    this.player.tick();
                    this.renderer.draw(this.player);

                    // hit flash overlay
                    if(this.player.hitFlashFrames > 0) {
                        var alpha = (this.player.hitFlashFrames / 20) * 0.25;
                        this.renderer.drawRectangleStatic(0, 0, this.renderer.getScreenWidth(), this.renderer.getScreenHeight(), 'rgba(220,0,0,' + alpha + ')');
                    }




                    var playerScores = this.player.getScores().getAll();
                    var dmg = 4 + this.player.bowLevel;
                    this.osd.displayScores(playerScores, "BOTTOM-LEFT", 0, "Spieler", { 'AMMO': '' + dmg });

                    if(this.player.isMounted()){
                        var vScores = this.player.getMountScores().getAll();
                        this.osd.displayScores(vScores, "BOTTOM-LEFT", 100, "Blimp");
                        CM.Sound.fuelWarning(this.player.getMountScores().get("FUEL"));
                    }
                }
                else
                {
                    this.renderer.fillText("GAME OVER",this.player.position.x,this.player.position.y, 50);
                }
            }

            this.inventory.draw(this.renderer);
            this.osdocu.draw(this.renderer);
            if (this.notificationFrames > 0) {
                var alpha = Math.min(1, this.notificationFrames / 20);
                var ctx = this.renderer.ctxt;
                ctx.font = '16px Ariel black';
                var tw = ctx.measureText(this.notification).width;
                var pad = 16;
                var bw = tw + pad * 2;
                var nx = Math.floor(this.renderer.getScreenWidth() / 2) - Math.floor(bw / 2);
                var ny = 40;
                this.renderer.drawRectangleStatic(nx - pad, ny - 20, bw, 32, 'rgba(0,0,0,' + (alpha * 0.6) + ')');
                this.renderer.fillTextStaticColor(this.notification, nx, ny, 16, 'rgba(200,240,200,' + alpha + ')');
                this.notificationFrames--;
            }
            this.nearbyHut = null;
            var self2 = this;
            this.world.getObjects().forEach(function(obj) {
                if (obj.isSafePoint && CM.distance(self2.player.position, obj.position) < 60) {
                    self2.nearbyHut = obj;
                }
            });
            if (!this.nearbyHut) { this.hutDevelopOpen = false; this.hutCraftOpen = false; }
            if (this.nearbyHut) this.drawHutOverlay(this.nearbyHut);
            this.minimap.draw(this.renderer, this.player, this.world);

            requestAnimFrame( function() {
                self.tickndraw();
            });
        }
        moveDown(){
           this.player.move(0,1*this.speed);
        }
        moveUp(){
            this.player.move(0,-1* this.speed);
        }
        moveLeft(){
            this.player.move(1*this.speed,0);
        }
        moveRight(){
            this.player.move(-1*this.speed,0);
        }
        tryMount(){
            var object = this.world.getNearestObject(this.player.getMidPoint(),"interactable");
            var mounted = this.player.mount(object);
          

        }
        tryMine(){
            var obj = this.world.getNearestObject(this.player.position, "mineable");
            if (!obj) return;
            if (CM.distance(this.player.getMidPoint(), obj.getMidPoint()) > 30) return;
            var type = obj.resourceType;
            var depleted = obj.mine();
            if (depleted) this.inventory.addItem(type);
        }
        tryCollect(){
            var obj =this.world.getNearestObject(this.player.position,"collectable");
            if(obj == null) return;
            var collected = this.player.collect(obj);
            if(collected) { this.world.removeObject(obj); CM.Sound.play('collect'); }
        }
        handleInteractions(k){

           switch(""+k)
            {
                case "66" : {
                    if (this.player.isMounted()) { this.player.dismount(); CM.Sound.play('dismount'); CM.Sound.stop('blimp_hum'); }
                    else { this.tryMount(); CM.Sound.play('mount'); CM.Sound.play('blimp_hum'); }
                    break;
                }
                case "67" : this.player.fire(); break;
                case "69" : this.tryMine(); break;
                case "73" : this.inventory.toggle(); this.paused = this.inventory.isOpen(); break;
                case "76" : this.tryBuildBlockhut(); break;
                case "77" : CM.Sound.toggleMute(); break;
                case "72" : this.tryHutHeal(); break;
                case "75" :
                    if (this.nearbyHut && this.nearbyHut.hasCraftingStation) this.hutCraftOpen = !this.hutCraftOpen;
                    break;
                case "68" : this.tryHutDevelop(); break;
                case "49" :
                    if (this.hutCraftOpen) this.tryBowUpgrade();
                    else if (this.hutDevelopOpen) this.tryBuildBed();
                    break;
                case "50" :
                    if (this.hutCraftOpen) this.tryCraftArrows();
                    else if (this.hutDevelopOpen) this.tryBuildCraftingStation();
                    break;
                case "27" :
                    if (this.hutCraftOpen) this.hutCraftOpen = false;
                    else this.hutDevelopOpen = false;
                    break;

            }
        }
        handleMove(k,currentlyPressed)
        {
            var moving = false;
            currentlyPressed.forEach(_=>{
                switch(""+_[0])
                {
                    case "37" : this.moveRight(); moving = true; break;
                    case "38" : this.moveUp();    moving = true; break;
                    case "39" : this.moveLeft();  moving = true; break;
                    case "40" : this.moveDown();  moving = true; break;
                }
            });
            if (moving && !this.player.isMounted()) CM.Sound.footstep();
            else if (!moving) CM.Sound.resetFootstep();
        }
        handleStop(k, currentlyPressed)
        {
            if(currentlyPressed.filter(_ => _ == true).length == 0)
            {
                this.player.stop();
            }
        }
        tryBuildBlockhut() {
            var slots = this.inventory.slots;
            var wi = -1, si = -1;
            for (var i = 0; i < slots.length; i++) {
                if (slots[i] && slots[i].type === 'WOOD'  && wi < 0) wi = i;
                if (slots[i] && slots[i].type === 'STONE' && si < 0) si = i;
            }
            if (wi < 0 || slots[wi].count < 6 || si < 0 || slots[si].count < 3) {
                var missing = [];
                if (wi < 0 || slots[wi].count < 6)  missing.push('6 Holz');
                if (si < 0 || slots[si].count < 3) missing.push('3 Stein');
                this.notify('Ben\u00f6tigt: ' + missing.join(' + '), 180);
                return;
            }
            slots[wi].count -= 6;
            if (slots[wi].count === 0) slots[wi] = null;
            slots[si].count -= 3;
            if (slots[si].count === 0) slots[si] = null;

            this.world.addObject(new CM.Blockhut(this.player.position.clone()));
            CM.SaveLoad.save(this);
            if (window.updateSaveIndicator) window.updateSaveIndicator();
            this.notify('Blockh\u00fctte gebaut!');
        }
        notify(text, frames) {
            this.notification = text;
            this.notificationFrames = frames || 120;
        }
        tryHutHeal() {
            if (!this.nearbyHut || !this.nearbyHut.hasBed) return;
            this.player.getScores().get("HEALTH").score = 10;
            this.notify('Ausgeruht! HP wiederhergestellt.', 120);
            CM.SaveLoad.save(this);
        }
        tryHutDevelop() {
            if (!this.nearbyHut) return;
            this.hutDevelopOpen = !this.hutDevelopOpen;
        }
        tryBowUpgrade() {
            if (!this.nearbyHut || !this.nearbyHut.hasCraftingStation) return;
            var slots = this.inventory.slots;
            var wi = slots.findIndex(function(s) { return s && s.type === 'WOOD'; });
            var si = slots.findIndex(function(s) { return s && s.type === 'STONE'; });
            var woodHave  = wi >= 0 ? slots[wi].count : 0;
            var stoneHave = si >= 0 ? slots[si].count : 0;
            if (woodHave < 2 || stoneHave < 3) {
                var missing = [];
                if (woodHave  < 2) missing.push('2 Holz (vorhanden: '  + woodHave  + ')');
                if (stoneHave < 3) missing.push('3 Stein (vorhanden: ' + stoneHave + ')');
                this.notify('Ben\u00f6tigt: ' + missing.join(' + '), 180);
                return;
            }
            slots[wi].count -= 2; if (slots[wi].count === 0) slots[wi] = null;
            slots[si].count -= 3; if (slots[si].count === 0) slots[si] = null;
            this.player.bowLevel++;
            CM.SaveLoad.save(this);
            this.notify('Bogen aufger\u00fcstet! Schaden: ' + (4 + this.player.bowLevel), 150);
        }
        tryCraftArrows() {
            if (!this.nearbyHut || !this.nearbyHut.hasCraftingStation) return;
            var ammo = this.player.getScores().get('AMMO');
            if (ammo.getScore() >= ammo.getMax()) {
                this.notify('Pfeile bereits voll (' + ammo.getMax() + '/' + ammo.getMax() + ')', 120);
                return;
            }
            var slots = this.inventory.slots;
            var wi = slots.findIndex(function(s) { return s && s.type === 'WOOD'; });
            var woodHave = wi >= 0 ? slots[wi].count : 0;
            if (woodHave < 2) {
                this.notify('Ben\u00f6tigt: 2 Holz (vorhanden: ' + woodHave + ')', 180);
                return;
            }
            slots[wi].count -= 2;
            if (slots[wi].count === 0) slots[wi] = null;
            ammo.up(3);
            this.notify('+3 Pfeile hergestellt (' + ammo.getScore() + '/' + ammo.getMax() + ')', 120);
        }
        tryBuildBed() {
            if (!this.nearbyHut || this.nearbyHut.hasBed) return;
            var slots = this.inventory.slots;
            var wi = slots.findIndex(function(s) { return s && s.type === 'WOOD'; });
            var woodHave = wi >= 0 ? slots[wi].count : 0;
            if (woodHave < 4) {
                this.notify('Ben\u00f6tigt: 4 Holz (vorhanden: ' + woodHave + ')', 180);
                return;
            }
            slots[wi].count -= 4;
            if (slots[wi].count === 0) slots[wi] = null;
            this.nearbyHut.hasBed = true;
            this.hutDevelopOpen = false;
            CM.SaveLoad.save(this);
            this.notify('Bett gebaut!', 120);
        }
        tryBuildCraftingStation() {
            if (!this.nearbyHut || this.nearbyHut.hasCraftingStation) return;
            var slots = this.inventory.slots;
            var wi = slots.findIndex(function(s) { return s && s.type === 'WOOD'; });
            var si = slots.findIndex(function(s) { return s && s.type === 'STONE'; });
            var woodHave  = wi >= 0 ? slots[wi].count : 0;
            var stoneHave = si >= 0 ? slots[si].count : 0;
            if (woodHave < 3 || stoneHave < 5) {
                var missing = [];
                if (woodHave  < 3) missing.push('3 Holz (vorhanden: '  + woodHave  + ')');
                if (stoneHave < 5) missing.push('5 Stein (vorhanden: ' + stoneHave + ')');
                this.notify('Ben\u00f6tigt: ' + missing.join(' + '), 180);
                return;
            }
            slots[wi].count -= 3; if (slots[wi].count === 0) slots[wi] = null;
            slots[si].count -= 5; if (slots[si].count === 0) slots[si] = null;
            this.nearbyHut.hasCraftingStation = true;
            this.hutDevelopOpen = false;
            CM.SaveLoad.save(this);
            this.notify('Crafting Station gebaut!', 120);
        }
        drawHutOverlay(hut) {
            var ctx = this.renderer.ctxt;
            var sw = this.renderer.getScreenWidth();
            var sh = this.renderer.getScreenHeight();
            var pad = 18;

            ctx.save();

            // collect lines to measure
            var titleFont = 'bold 13px monospace';
            var lineFont  = '12px monospace';
            var lines = [];
            var title = 'Blockh\u00fctte';
            if (this.hutCraftOpen) {
                title = 'Crafting Station';
                var lvl = this.player.bowLevel;
                lines.push({ font: lineFont, text: '[1] Bogen aufrüsten (+1)  Lvl ' + lvl + '\u2192' + (lvl+1) + '  (2 Holz + 3 Stein)', color: '#ccc' });
                lines.push({ font: lineFont, text: '[2] Pfeile herstellen  +3 Ammo  (2 Holz)', color: '#ccc' });
                lines.push({ font: lineFont, text: '[ESC] Schlie\u00dfen', color: '#aaa' });
            } else if (this.hutDevelopOpen) {
                lines.push({ font: lineFont, text: '[ESC] Schlie\u00dfen', color: '#aaa' });
                lines.push({ font: lineFont, text: hut.hasBed ? '[1] Bett (gebaut)' : '[1] Bett bauen  (4 Holz)', color: hut.hasBed ? '#555' : '#ccc' });
                lines.push({ font: lineFont, text: hut.hasCraftingStation ? '[2] Crafting Station (gebaut)' : '[2] Crafting Station  (3 Holz + 5 Stein)', color: hut.hasCraftingStation ? '#555' : '#ccc' });
            } else {
                lines.push({ font: lineFont, text: hut.hasBed ? '[H] Heilen' : '[H] Heilen  (kein Bett)', color: hut.hasBed ? '#cfc' : '#555' });
                if (hut.hasCraftingStation) lines.push({ font: lineFont, text: '[K] Craften', color: '#cfc' });
                lines.push({ font: lineFont, text: '[D] Entwickeln', color: '#ccc' });
            }

            ctx.font = titleFont;
            var maxW = ctx.measureText(title).width;
            lines.forEach(function(l) { ctx.font = l.font; maxW = Math.max(maxW, ctx.measureText(l.text).width); });

            var W = maxW + pad * 2;
            var H = 22 + lines.length * 22 + pad;
            var ox = Math.floor((sw - W) / 2);
            var oy = sh - H - 20;

            ctx.fillStyle = 'rgba(20,20,30,0.82)';
            this.roundRect(ctx, ox, oy, W, H, 8);
            ctx.fill();
            ctx.strokeStyle = 'rgba(180,160,100,0.7)';
            ctx.lineWidth = 1.5;
            this.roundRect(ctx, ox, oy, W, H, 8);
            ctx.stroke();

            var tx = ox + pad;
            var ty = oy + 22;
            ctx.font = titleFont;
            ctx.fillStyle = '#d4b87a';
            ctx.fillText(title, tx, ty);
            ty += 22;

            lines.forEach(function(l) {
                ctx.font = l.font;
                ctx.fillStyle = l.color;
                ctx.fillText(l.text, tx, ty);
                ty += 22;
            });

            ctx.restore();
        }
        roundRect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }
        gameOver(){
            this.over = true;
        }
        init(){

                this.world.setChunksCachedCallback(CM.ADDENEMYMAKER(this.world,this.imagerepo));

                this.player = new CM.CloudPlayer(this.startPos,this.imagerepo.getImage("playerAni"),this.imagerepo.getImage("playerAniLeft"));
                this.player.setTileInfoRetrieve(CM.TILEACCESS(this.world));
                this.player.setFireBallCreator(CM.FireBallCreator(this.world,this.imagerepo));
                this.world.applyForTile(CM.COLLECTABLEMAKER(this.world, this.imagerepo));
                this.world.applyForTile(CM.MINEABLEMAKER(this.world, this.imagerepo));
                this.world.addObject( new CM.Collectable(this.startPos.clone().move(20,20),this.imagerepo.getImage("coin_10"),"COINS",10,0.2));
                this.world.addObject( new CM.Blimp(this.startPos,this.imagerepo.getImage("blimp")));
                
                var dragon = new CM.Dragon(new CM.Point( 150,150),this.imagerepo.getImage("dragon_small"));
                dragon.setFireBallCreator(CM.FireBallCreator(this.world,this.imagerepo));
                dragon.setRemover(this.world.removeObject.bind(this.world));
                this.world.addObject(dragon);

                this.world.addHitable("player", this.player);
                this.world.addHitable("dragon1", dragon);
                

                
                CM.VEHICLEDEATHMAKER(this,this.world,this.player);

                window.requestAnimFrame = (function(callback) {
                    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
                    function(callback) {
                        window.setTimeout(callback, 1000 / 30);
                    };
                })();
                this.inputHandler.on("letterKeys",this.handleInteractions.bind(this));
                this.inputHandler.on("keyup", this.handleStop.bind(this));
                var self3 = this;
                this.inputHandler.on("keydown", function(k) {
                    if (k === 27 || (k >= 49 && k <= 57)) self3.handleInteractions(k);
                });
                this.osdocu = new CM.OnScreenDocu(new CM.Point(-150,-100), this.imagerepo);
                document.getElementById('helpBtn').addEventListener('click', () => this.osdocu.toggle());

                if (CM.SaveLoad.load(this)) this.notify('Spielstand geladen');


        }
    }


