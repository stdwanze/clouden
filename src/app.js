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
            this.hutMenuOpen = false;
            this.hutMenuLevel = 'main';
            this.hutMenuIndex = 0;
            this.respawnDialog = false;
            this.respawnAction = null;
            this.nearbyNPC = null;
            this.buildMenuOpen = false;
            this.buildMenuIndex = 0;
            this.bridgePlacementMode = false;
            this.storm = new CM.StormManager();

            this.torchActive = false;
            this.torchTimer = 0; // frames
            this.inCave = false;
            this.caveTransitionFrames = 0;
            this.caveWorld = null;
        }

        run(){
            this.renderer.setZoom(this.player.height);
            this.tickndraw();

        }
        tickndraw(){
            var self = this;

            // poll gamepad every frame, even when paused (so menus can be closed)
            this.inputHandler.pollGamepad();

            if(!this.paused){
                if(!this.over){
                    // --- tick phase (all movement before any drawing) ---

                    // handle movement every frame for smooth input
                    this.handleMove(null, this.inputHandler.calcCurrentlyPressed());
                    this.checkCaveTransition();
                    var heldKeys = this.inputHandler.currentKeys;
                    if (!this.buildMenuOpen) {
                        var _blimpV = this.player.isMounted() ? this.player.vehicle : null;
                        var _islandBlocked = function(newZ) {
                            return _blimpV && _blimpV.islandRetriever &&
                                Math.abs(newZ - CM.FloatLevel) <= 0.015 &&
                                _blimpV.islandRetriever().some(function(isl) {
                                    return isl.containsRect(_blimpV.position.x, _blimpV.position.y, _blimpV.sizeX, _blimpV.sizeY);
                                });
                        };
                        if (this.player.isMounted()) {
                            if (heldKeys[65] && !_islandBlocked(this.player.z - 0.01)) this.player.ascend(0.01);
                            if (heldKeys[83] && !_islandBlocked(this.player.z + 0.01)) this.player.descend(0.01);
                        }
                    }

                    // interacte player mit Welt
                    this.tryCollect();
                    this.tryRefuelBlimp();
                    this.checkAutoHeal();

                    // Fackel-Timer
                    if (this.torchActive) {
                        this.torchTimer--;
                        if (this.torchTimer <= 0) {
                            this.torchActive = false;
                            this.notify('Fackel ist erloschen.', 120);
                        }
                    }

                    // tick all objects (wind/AI may move player)
                    var k = this.inputHandler.currentKeys;
                    var playerMoving = !!(k[37] || k[38] || k[39] || k[40]);
                    if (this.inCave) {
                        this.caveWorld.getObjects().forEach(element => {
                            if (element.isCaveCrab) {
                                element.tick(this.player, playerMoving, this.torchActive);
                            } else {
                                element.tick(this.player, playerMoving);
                            }
                        });
                    } else {
                        this.world.getObjects().forEach(element => {
                            element.tick(this.player, playerMoving);
                        });
                    }
                    this.player.tick();

                    // storm tick + ground-strike spawning (nicht in der Höhle)
                    this.storm.tick();
                    if (!this.inCave && this.storm.hasPendingStrike()) {
                        var sx = this.player.position.x + (Math.random() - 0.5) * 500;
                        var sy = this.player.position.y + (Math.random() - 0.5) * 500;
                        this.storm.addStrike(sx, sy);
                        if (this.player.isMounted()) {
                            var _sdx = sx - this.player.position.x;
                            var _sdy = sy - this.player.position.y;
                            if (Math.sqrt(_sdx*_sdx + _sdy*_sdy) < 100) {
                                this.player.hit(2);
                                this.notify('Vom Blitz getroffen!', 60);
                            }
                        }
                    }

                    // --- draw phase: update viewport AFTER all movement ---
                    var _blimpForIsland = this.player.isMounted() ? this.player.vehicle : null;
                    var _onIsland = (_blimpForIsland && _blimpForIsland.isOnIsland && _blimpForIsland.isOnIsland()) ||
                        (!this.player.isMounted() && this.player.islandRetriever &&
                         Math.abs(this.player.z - CM.FloatLevel) <= 0.25 &&
                         this.player.islandRetriever().some(function(isl) {
                             return isl.containsRect(self.player.position.x, self.player.position.y, 1, 1);
                         }));
                    this.renderer.playerOnIsland = _onIsland;
                    if (_onIsland) {
                        var _cur = isFinite(this.renderer.zoom) ? this.renderer.zoom : CM.FloatLevel;
                        this.renderer.setZoom(_cur + (CM.GroundLevel - _cur) * 0.08);
                    } else {
                        this.renderer.setZoom(this.player.z);
                    }
                    this.renderer.clear();
                    this.renderer.updatePos(this.player.position);

                    if (this.inCave) {
                        this.renderer.drawRectangleStatic(0, 0,
                            this.renderer.getScreenWidth(), this.renderer.getScreenHeight(), '#1a1210');
                        this.caveWorld.getScene(this.player.position).forEach(element => {
                            this.renderer.draw(element);
                        });
                        this.caveWorld.getObjects().forEach(element => {
                            if (this.player.z >= element.z + 0.3 && !element.handlesOwnAlpha) {
                                this.renderer.lighter();
                            }
                            this.renderer.draw(element);
                            this.renderer.restore();
                        });
                    } else {
                        this.renderer.drawWaterBackground(this.imagerepo.getImage("tile_water"));
                        // draw world
                        this.world.getScene(this.player.position).forEach(element => {
                            this.renderer.draw(element);
                        });
                        // draw movableobjects
                        this.world.getObjects().forEach(element =>
                        {
                            if(this.player.z >= element.z+0.3 && !element.handlesOwnAlpha)
                            {
                                this.renderer.lighter()
                            }
                            this.renderer.draw(element);
                            this.renderer.restore();
                        });
                    }

                    //draw Player
                    this.renderer.draw(this.player);

                    // storm visual effects (nicht in der Höhle)
                    if (!this.inCave && this.storm.isActive()) {
                        var _sw = this.renderer.getScreenWidth();
                        var _sh = this.renderer.getScreenHeight();
                        // darken + grey-tint the scene
                        this.renderer.drawRectangleStatic(0, 0, _sw, _sh, 'rgba(10,10,40,0.32)');
                        // ground lightning bolts
                        var _r = this.renderer;
                        var _pp = this.player.position;
                        this.storm.activeStrikes.forEach(function(s) {
                            var _a  = s.frames / s.totalFrames;
                            var _bx = (_pp.x - _r.canvas.width  / 2);
                            var _by = (_pp.y - _r.canvas.height / 2);
                            var _ex = (s.x - _bx - _r.canvas.width  / 2) * _r.zoom + _r.canvas.width  / 2;
                            var _ey = (s.y - _by - _r.canvas.height / 2) * _r.zoom + _r.canvas.height / 2;
                            CM.drawLightningBolt(_r.ctxt, _ex, _ey - 180 * _r.zoom, _ex, _ey, s.bolt, _a);
                        });
                        // screen-wide flash
                        var _fa = this.storm.getFlashAlpha();
                        if (_fa > 0)
                            this.renderer.drawRectangleStatic(0, 0, _sw, _sh, 'rgba(200,220,255,' + _fa + ')');
                    }

                    // Bridge preview
                    var _showBridgePreview = this.bridgePlacementMode ||
                        (this.buildMenuOpen && this.getBuildItems()[this.buildMenuIndex].id === 'bridge');
                    if (_showBridgePreview) {
                        var _previewTile = this._getBridgeWaterTile();
                        if (_previewTile) {
                            var _vertical = Math.abs(this.player.direction.y) > Math.abs(this.player.direction.x);
                            this.renderer.ctxt.globalAlpha = 0.4;
                            new CM.Bridge(new CM.Point(_previewTile.location.x, _previewTile.location.y), _vertical).draw(this.renderer);
                            this.renderer.ctxt.globalAlpha = 1.0;
                        }
                    }

                    // Cave darkness overlay
                    if (this.inCave) {
                        var _cw = this.renderer.getScreenWidth() / 2;
                        var _ch = this.renderer.getScreenHeight() / 2;
                        // Collect lamp screen positions
                        var _lampPositions = [];
                        this.caveWorld.getObjects().forEach(function(obj) {
                            if (!obj.isLamp) return;
                            var _lsx = this.renderer.translateAndZoom(obj.getMidPoint().x - this.renderer.viewport.x, _cw);
                            var _lsy = this.renderer.translateAndZoom(obj.getMidPoint().y - this.renderer.viewport.y, _ch);
                            _lampPositions.push({ x: _lsx, y: _lsy, innerR: obj.lightInnerR, outerR: obj.lightOuterR });
                        }.bind(this));
                        this.renderer.drawCaveDarkness(_cw, _ch, this.torchActive, _lampPositions);
                    }

                    // hit flash overlay
                    if(this.player.hitFlashFrames > 0) {
                        var alpha = (this.player.hitFlashFrames / 20) * 0.25;
                        this.renderer.drawRectangleStatic(0, 0, this.renderer.getScreenWidth(), this.renderer.getScreenHeight(), 'rgba(220,0,0,' + alpha + ')');
                    }




                    var playerScores = this.player.getScores().getAll();
                    var dmg = 4 + this.player.bowLevel;
                    this.osd.displayScores(playerScores, "BOTTOM-LEFT", 0, "Spieler", { 'AMMO': '' + dmg });

                    if (this.torchActive) {
                        var sec = Math.max(0, Math.ceil(this.torchTimer / 60));
                        this.renderer.fillTextStaticColor('Fackel: ' + sec + 's', 10, 70, 14, '#ffd700');
                    }

                    if(this.player.isMounted()){
                        var vScores = this.player.getMountScores().getAll();
                        this.osd.displayScores(vScores, "BOTTOM-LEFT", 100, "Blimp");
                        CM.Sound.fuelWarning(this.player.getMountScores().get("FUEL"));
                        this.drawWindRose(this.player.vehicle);
                    }
                    if (!this.inCave) this.drawStormWarning();
                }
                else
                {
                    this.renderer.fillText("GAME OVER",this.player.position.x,this.player.position.y, 50);
                }
            }

            this.inventory.draw(this.renderer);
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
            var prevHut = this.nearbyHut;
            this.nearbyHut = null;
            this.nearbyNPC = null;
            var self2 = this;
            this.world.getObjects().forEach(function(obj) {
                if (obj.isSafePoint && CM.distance(self2.player.position, obj.position) < 30) {
                    self2.nearbyHut = obj;
                }
                if (obj.isNPC && CM.distance(self2.player.position, obj.position) < 60) {
                    self2.nearbyNPC = obj;
                }
            });
            if (!prevHut && this.nearbyHut) {
                CM.SaveLoad.save(this);
                if (window.updateSaveIndicator) window.updateSaveIndicator();
                this.notify('Spielstand gespeichert', 100);
            }
            if (!this.nearbyHut) this.hutMenuOpen = false;
            if (this.nearbyHut) this.drawHutOverlay(this.nearbyHut);
            if (this.nearbyNPC) this.drawNPCOverlay(this.nearbyNPC);
            this.drawActiveQuest();
            if (!this.inCave) {
                this.minimap.draw(this.renderer, this.player, this.world);
            } else {
                var _ctx2 = this.renderer.ctxt;
                _ctx2.font = '12px monospace';
                _ctx2.fillStyle = 'rgba(180,150,80,0.85)';
                _ctx2.fillText('[ Höhle ]', this.renderer.getScreenWidth() - 80, 20);
            }
            if (this.buildMenuOpen) this.drawBuildMenu();
            if (this.bridgePlacementMode) {
                var _r = this.renderer;
                var _hint = '[ENTER] Br\u00fccke bauen  [ESC] Abbrechen';
                var _ctx = _r.ctxt;
                _ctx.font = '13px monospace';
                var _hw = _ctx.measureText(_hint).width + 24;
                var _hx = Math.floor((_r.getScreenWidth() - _hw) / 2);
                var _hy = _r.getScreenHeight() - 38;
                _r.drawRectangleStatic(_hx, _hy, _hw, 24, 'rgba(0,0,0,0.6)');
                _r.fillTextStaticColor(_hint, _hx + 12, _hy + 16, 13, '#aaddaa');
            }
            if (this.respawnDialog) this.drawRespawnDialog();
            this.osdocu.draw(this.renderer);

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
            this.player.mount(object);
          

        }
        tryMine(){
            // In der Höhle: Lampen können abgebaut werden
            if (this.inCave) {
                var lamps = this.caveWorld.getObjects().filter(function(o) { return o.isLamp; });
                for (var i = 0; i < lamps.length; i++) {
                    if (CM.distance(this.player.getMidPoint(), lamps[i].getMidPoint()) <= 40) {
                        this.caveWorld.removeObject(lamps[i]);
                        this.inventory.addItem('LAMP');
                        this.notify('Lampe aufgenommen.', 90);
                        return;
                    }
                }
            }
            var activeWorld = this.inCave ? this.caveWorld : this.world;
            var obj = activeWorld.getNearestObject(this.player.position, "mineable");
            if (!obj) return;
            if (CM.distance(this.player.getMidPoint(), obj.getMidPoint()) > 30) return;
            var type = obj.resourceType;
            var depleted = obj.mine();
            if (depleted) this.inventory.addItem(type);
        }
        tryCollect(){
            var activeWorld = this.inCave ? this.caveWorld : this.world;
            var self = this;

            // Chest interaction in cave
            if (this.inCave) {
                activeWorld.getObjects().forEach(function(obj) {
                    if (obj.isChest && !obj.opened &&
                        CM.distance(self.player.position, obj.position) < 30) {
                        var drop = obj.open(self.caveWorld, self.imagerepo);
                        if (drop) {
                            self.caveWorld.addObject(drop);
                            self.notify('Truhe ge\u00f6ffnet!', 90);
                            CM.Sound.play('collect');
                        }
                    }
                });
            }

            // Chest interaction on floating islands
            if (!this.inCave && Math.abs(this.player.z - CM.FloatLevel) <= 0.25) {
                this.world.getObjects().forEach(function(obj) {
                    if (obj.isChest && !obj.opened &&
                        CM.distance(self.player.position, obj.position) < 30) {
                        var drop = obj.open(null, self.imagerepo);
                        if (drop) {
                            drop.z = CM.FloatLevel;
                            self.world.addObject(drop);
                            self.notify('Truhe ge\u00f6ffnet!', 90);
                            CM.Sound.play('collect');
                        }
                    }
                });
            }

            var obj = activeWorld.getNearestObject(this.player.position,"collectable");
            if(obj == null) return;

            // CRYSTAL: goes to score
            if (obj.getTypeName() === 'CRYSTAL') {
                if (this.player.isInRange(obj)) {
                    var crystalScore = this.player.getScores().get('CRYSTAL');
                    if (crystalScore) crystalScore.up(obj.getPointValue());
                    activeWorld.removeObject(obj);
                    CM.Sound.play('collect');
                    this.notify('+' + obj.getPointValue() + ' Kristall', 60);
                }
                return;
            }

            // SKYMAP: one-time global unlock
            if (obj.getTypeName() === 'SKYMAP') {
                if (this.player.isInRange(obj)) {
                    CM.skyMapFound = true;
                    activeWorld.removeObject(obj);
                    CM.Sound.play('collect');
                    this.notify('Himmelskarte gefunden! Floating Islands erscheinen...', 240);
                }
                return;
            }

            if(obj.getTypeName() === 'FUEL' && !this.player.isMounted()) {
                if(CM.distance(this.player.getMidPoint(), obj.getMidPoint()) < 10) {
                    this.inventory.addItem('FUEL');
                    activeWorld.removeObject(obj);
                    CM.Sound.play('collect');
                }
                return;
            }
            if(obj.getTypeName() === 'HEALTH' && !this.player.isMounted()) {
                if(this.player.isInRange(obj)) {
                    var hp = this.player.getScores().get('HEALTH');
                    if(hp.getScore() >= hp.getMax()) {
                        this.inventory.addItem('HEALTH');
                        activeWorld.removeObject(obj);
                        CM.Sound.play('collect');
                    } else {
                        var collected = this.player.collect(obj);
                        if(collected) { activeWorld.removeObject(obj); CM.Sound.play('collect'); }
                    }
                }
                return;
            }
            var collected = this.player.collect(obj);
            if(collected) { activeWorld.removeObject(obj); CM.Sound.play('collect'); }
        }
        checkAutoHeal() {
            if(this.player.isMounted()) return;
            var hp = this.player.getScores().get('HEALTH');
            if(hp.getScore() / hp.getMax() >= 0.2) return;
            var si = this.inventory.slots.findIndex(function(s) { return s && s.type === 'HEALTH'; });
            if(si < 0) return;
            hp.up(10);
            this.inventory.slots[si].count--;
            if(this.inventory.slots[si].count <= 0) this.inventory.slots[si] = null;
            this.notify('Heiltrank automatisch angewendet!', 100);
        }
        tryRefuelBlimp() {
            if(this.player.isMounted()) return;
            var fi = this.inventory.slots.findIndex(function(s) { return s && s.type === 'FUEL'; });
            if(fi < 0) return;
            var blimp = this.world.getNearestObject(this.player.position, 'interactable');
            if(!blimp || !blimp.scores || !blimp.scores.get('FUEL')) return;
            if(CM.distance(this.player.getMidPoint(), blimp.getMidPoint()) > 30) return;
            var slot = this.inventory.slots[fi];
            blimp.scores.get('FUEL').up(slot.count * 20);
            this.inventory.slots[fi] = null;
            this.notify('Blimp aufgetankt!', 120);
        }
        handleInteractions(k){
            if (this.respawnDialog) {
                if (k === 13) {
                    this.respawnDialog = false;
                    this.paused = false;
                    if (this.respawnAction) { this.respawnAction(); this.respawnAction = null; }
                }
                return;
            }

            if (this.bridgePlacementMode) {
                if (k === 13) { this.tryBuildBridge(); this.bridgePlacementMode = false; }
                else if (k === 27) { this.bridgePlacementMode = false; }
                return;
            }

            if (this.hutMenuOpen) {
                if (k === 13) {
                    var hitems = this.getHutItems(this.hutMenuLevel, this.nearbyHut);
                    var hitem = hitems[this.hutMenuIndex];
                    if (hitem && !hitem.disabled) hitem.action();
                } else if (k === 37 || k === 38) {
                    var hlen = this.getHutItems(this.hutMenuLevel, this.nearbyHut).length;
                    this.hutMenuIndex = (this.hutMenuIndex - 1 + hlen) % hlen;
                } else if (k === 39 || k === 40) {
                    var hlen2 = this.getHutItems(this.hutMenuLevel, this.nearbyHut).length;
                    this.hutMenuIndex = (this.hutMenuIndex + 1) % hlen2;
                } else if (k === 27) {
                    if (this.hutMenuLevel !== 'main') { this.hutMenuLevel = 'main'; this.hutMenuIndex = 0; }
                    else this.hutMenuOpen = false;
                }
                return;
            }

            if (this.inventory.isOpen()) {
                if (k === 13 || k === 32) {
                    this.tryUseSelectedInventory();
                } else if (k === 37) {
                    this.inventory.moveSelection(-1, 0);
                } else if (k === 39) {
                    this.inventory.moveSelection(1, 0);
                } else if (k === 38) {
                    this.inventory.moveSelection(0, -1);
                } else if (k === 40) {
                    this.inventory.moveSelection(0, 1);
                } else if (k === 73 || k === 27) {
                    this.inventory.toggle();
                    this.paused = this.inventory.isOpen();
                }
                return;
            }

            if (this.buildMenuOpen) {
                if (k === 13) {
                    var items = this.getBuildItems();
                    if (items[this.buildMenuIndex].id === 'bridge') {
                        this.buildMenuOpen = false;
                        this.bridgePlacementMode = true;
                    } else {
                        items[this.buildMenuIndex].build();
                        this.buildMenuOpen = false;
                    }
                } else if (k === 37) {
                    this.buildMenuIndex = Math.max(0, this.buildMenuIndex - 1);
                } else if (k === 39) {
                    this.buildMenuIndex = Math.min(this.getBuildItems().length - 1, this.buildMenuIndex + 1);
                } else if (k === 27 || k === 76) {
                    this.buildMenuOpen = false;
                }
                return;
            }

           switch(""+k)
            {
                case "70" :
                    if (this.player.isMounted()) {
                        var v = this.player.vehicle;
                        v.sailMode = !v.sailMode;
                        if (v.sailMode) { CM.Sound.stop('blimp_hum'); CM.Sound.startWind(); }
                        else            { CM.Sound.stopWind(); CM.Sound.play('blimp_hum'); }
                        this.notify(v.sailMode ? 'Segel gesetzt!' : 'Segel eingeholt!', 90);
                    } else {
                        this.tryNPCInteract();
                        this.tryIslandInteract();
                    }
                    break;
                case "66" : {
                    if (this.player.isMounted()) { var _wasSail = this.player.vehicle.sailMode; this.player.vehicle.sailMode = false; this.player.dismount(); this.inputHandler._aimTarget = this.player; CM.Sound.play('dismount'); CM.Sound.stop('blimp_hum'); if(_wasSail) CM.Sound.stopWind(); }
                    else { this.tryMount(); this.inputHandler._aimTarget = this.player.isMounted() ? this.player.vehicle : this.player; CM.Sound.play('mount'); CM.Sound.play('blimp_hum'); }
                    break;
                }
                case "67" : this.player.fire(); break;
                case "69" : this.tryMine(); break;
                case "73" : this.inventory.toggle(); this.paused = this.inventory.isOpen(); break;
                case "76" :
                    this.buildMenuOpen = !this.buildMenuOpen;
                    if (this.buildMenuOpen) this.buildMenuIndex = 0;
                    break;
                case "77" : CM.Sound.toggleMute(); break;
                case "72" :
                    if (this.nearbyHut) { this.hutMenuOpen = true; this.hutMenuLevel = 'main'; this.hutMenuIndex = 0; }
                    break;

            }
        }
        handleMove(_k,currentlyPressed)
        {
            if (this.buildMenuOpen || this.hutMenuOpen || this.inventory.isOpen()) return;
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
        handleStop(_k, currentlyPressed)
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
        _getBridgeWaterTile() {
            var p = this.player;
            var dir = p.direction;
            if (!dir || (dir.x === 0 && dir.y === 0)) return null;
            var tileAccess = CM.TILEACCESS(this.world);
            var dx = dir.x !== 0 ? Math.sign(dir.x) : 0;
            var dy = dir.y !== 0 ? Math.sign(dir.y) : 0;
            var mx = Math.floor(p.sizeX / 2);
            var my = Math.floor(p.sizeY / 2);
            var bridges = this.world.getObjects().filter(function(o) { return o.isBridge; });
            var foundWater = false;
            for (var dist = 6; dist <= 84; dist += 4) {
                var pt = new CM.Point(p.position.x + mx + dx * dist, p.position.y + my + dy * dist);
                var tile = tileAccess(pt);
                if (!tile) break;
                if (tile.info && tile.info.isMountain) break; // mountains block bridge placement
                if (tile.isLand()) {
                    if (foundWater) break;
                    continue;
                }
                foundWater = true;
                var covered = bridges.some(function(b) {
                    return pt.x >= b.position.x && pt.x < b.position.x + b.sizeX &&
                           pt.y >= b.position.y && pt.y < b.position.y + b.sizeY;
                });
                if (!covered) return tile;
            }
            return null;
        }
        tryBuildBridge() {
            var slots = this.inventory.slots;
            var wi = slots.findIndex(function(s) { return s && s.type === 'WOOD'; });
            var woodHave = wi >= 0 ? slots[wi].count : 0;
            if (woodHave < 3) {
                this.notify('Ben\u00f6tigt: 3 Holz', 180);
                return;
            }
            var waterTile = this._getBridgeWaterTile();
            if (!waterTile) {
                this.notify('Keine Wasserkante in Laufrichtung!', 180);
                return;
            }
            slots[wi].count -= 3;
            if (slots[wi].count === 0) slots[wi] = null;
            var vertical = Math.abs(this.player.direction.y) > Math.abs(this.player.direction.x);
            this.world.addObject(new CM.Bridge(new CM.Point(waterTile.location.x, waterTile.location.y), vertical));
            this.notify('Br\u00fccke gebaut!');
        }
        tryBuildVogelscheuche() {
            var slots = this.inventory.slots;
            var wi = -1, ri = -1, bi = -1;
            for (var i = 0; i < slots.length; i++) {
                if (slots[i] && slots[i].type === 'WOOD'      && wi < 0) wi = i;
                if (slots[i] && slots[i].type === 'REED'      && ri < 0) ri = i;
                if (slots[i] && slots[i].type === 'BERRY_RED' && bi < 0) bi = i;
            }
            var woodHave  = wi >= 0 ? slots[wi].count : 0;
            var reedHave  = ri >= 0 ? slots[ri].count : 0;
            var berryHave = bi >= 0 ? slots[bi].count : 0;
            if (woodHave < 2 || reedHave < 1 || berryHave < 1) {
                var missing = [];
                if (woodHave  < 2) missing.push('2 Holz');
                if (reedHave  < 1) missing.push('1 Schilf');
                if (berryHave < 1) missing.push('1 Rote Beere');
                this.notify('Ben\u00f6tigt: ' + missing.join(' + '), 180);
                return;
            }
            slots[wi].count -= 2; if (slots[wi].count === 0) slots[wi] = null;
            slots[ri].count -= 1; if (slots[ri].count === 0) slots[ri] = null;
            slots[bi].count -= 1; if (slots[bi].count === 0) slots[bi] = null;

            this.world.addObject(new CM.Vogelscheuche(this.player.position.clone()));
            this.notify('Vogelscheuche gebaut!');
        }
        checkCaveTransition() {
            if (this.player.isMounted()) return;
            if (this.caveTransitionFrames > 0) { this.caveTransitionFrames--; return; }

            if (!this.inCave) {
                // Surface → Cave
                var chunk = this.world.getChunk(this.player.position);
                var tile = chunk && chunk.getTile(this.player.position);
                if (tile && tile.info.isCaveEntrance && this.player.z >= CM.GroundLevel - 0.1) {
                    this.inCave = true;
                    this.player.z = CM.CaveLevel;
                    this.caveTransitionFrames = 90;
                    this.player.setFireBallCreator(CM.FireBallCreator(this.caveWorld, this.imagerepo));
                    this.notify('Du betrittst eine Höhle...', 90);
                }
            } else {
                // Cave → Surface
                var caveChunk = this.caveWorld && this.caveWorld.getChunk(this.player.position);
                var caveTile = caveChunk && caveChunk.getTile(this.player.position);
                if (caveTile && caveTile.info.isCaveExit) {
                    this.inCave = false;
                    this.player.z = CM.GroundLevel;
                    this.caveTransitionFrames = 90;
                    this.player.setFireBallCreator(CM.FireBallCreator(this.world, this.imagerepo));
                    this.notify('Du verlässt die Höhle.', 90);
                }
            }
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
        tryCraftTorch() {
            if (!this.nearbyHut || !this.nearbyHut.hasCraftingStation) return;
            var slots = this.inventory.slots;
            var wi = slots.findIndex(function(s) { return s && s.type === 'WOOD'; });
            var ri = slots.findIndex(function(s) { return s && s.type === 'REED'; });
            var woodHave = wi >= 0 ? slots[wi].count : 0;
            var reedHave = ri >= 0 ? slots[ri].count : 0;
            if (woodHave < 1 || reedHave < 1) {
                var missing = [];
                if (woodHave < 1) missing.push('1 Holz (vorhanden: ' + woodHave + ')');
                if (reedHave < 1) missing.push('1 Reed (vorhanden: ' + reedHave + ')');
                this.notify('Benötigt: ' + missing.join(' + '), 180);
                return;
            }
            slots[wi].count -= 1; if (slots[wi].count === 0) slots[wi] = null;
            slots[ri].count -= 1; if (slots[ri].count === 0) slots[ri] = null;
            this.inventory.addItem('TORCH');
            this.notify('Fackel hergestellt!', 120);
        }
        tryCraftLamp() {
            if (!this.nearbyHut || !this.nearbyHut.hasCraftingStation) return;
            var slots = this.inventory.slots;
            var wi  = slots.findIndex(function(s) { return s && s.type === 'WOOD'; });
            var si  = slots.findIndex(function(s) { return s && s.type === 'STONE'; });
            var ci  = slots.findIndex(function(s) { return s && s.type === 'CRYSTAL'; });
            var bi  = slots.findIndex(function(s) { return s && s.type === 'BERRY_RED'; });
            var woodHave    = wi >= 0 ? slots[wi].count : 0;
            var stoneHave   = si >= 0 ? slots[si].count : 0;
            var crystalHave = ci >= 0 ? slots[ci].count : 0;
            var berryHave   = bi >= 0 ? slots[bi].count : 0;
            if (woodHave < 1 || stoneHave < 1 || crystalHave < 4 || berryHave < 1) {
                var missing = [];
                if (woodHave    < 1) missing.push('1 Holz');
                if (stoneHave   < 1) missing.push('1 Stein');
                if (crystalHave < 4) missing.push('4 Kristalle (vorhanden: ' + crystalHave + ')');
                if (berryHave   < 1) missing.push('1 Rote Beere');
                this.notify('Ben\u00f6tigt: ' + missing.join(' + '), 180);
                return;
            }
            slots[wi].count -= 1; if (slots[wi].count === 0) slots[wi] = null;
            slots[si].count -= 1; if (slots[si].count === 0) slots[si] = null;
            var ci2 = slots.findIndex(function(s) { return s && s.type === 'CRYSTAL'; });
            slots[ci2].count -= 4; if (slots[ci2].count === 0) slots[ci2] = null;
            var bi2 = slots.findIndex(function(s) { return s && s.type === 'BERRY_RED'; });
            slots[bi2].count -= 1; if (slots[bi2].count === 0) slots[bi2] = null;
            this.inventory.addItem('LAMP');
            this.notify('Lampe hergestellt!', 120);
        }
        tryUseSelectedInventory() {
            if (!this.inventory.isOpen()) return;
            var item = this.inventory.getSelectedItem();
            if (!item) {
                this.notify('Kein Item ausgewählt.', 120);
                return;
            }
            if (item.type === 'TORCH') {
                if (this.torchActive) {
                    this.notify('Fackel ist bereits an.', 120);
                    return;
                }
                this.inventory.removeSelectedItem();
                this.torchActive = true;
                this.torchTimer = 60 * 60; // 1 Minute bei 60 FPS
                this.notify('Fackel angezündet! (1 Minute)', 120);
                return;
            }
            if (item.type === 'LAMP') {
                if (!this.inCave) {
                    this.notify('Lampe nur in H\u00f6hlen platzierbar.', 120);
                    return;
                }
                this.inventory.removeSelectedItem();
                var lamp = new CM.PlacedLamp(this.player.position.clone(), this.imagerepo.getImage('item_lamp'));
                lamp.setRemover(this.caveWorld.removeObject.bind(this.caveWorld));
                this.caveWorld.addObject(lamp);
                this.inventory.toggle();
                this.paused = false;
                this.notify('Lampe platziert.', 90);
                return;
            }
            this.notify('Dieses Item kann nicht benutzt werden: ' + item.type, 120);
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
        tryNPCInteract() {
            if (!this.nearbyNPC) return;
            var npc = this.nearbyNPC;
            var quest = npc.getQuest();
            if (!quest) {
                this.notify('H\u00e4ndler: Danke f\u00fcr alles!', 120);
                return;
            }
            if (!npc.questAccepted) {
                npc.questAccepted = true;
                this.notify('Auftrag angenommen: ' + quest.text, 180);
                return;
            }
            var slots = this.inventory.slots;
            var si = slots.findIndex(function(s) { return s && s.type === quest.resource; });
            var have = si >= 0 ? slots[si].count : 0;
            if (have < quest.amount) {
                this.notify(quest.resource + ': ' + have + '/' + quest.amount + ' \u2014 noch nicht fertig', 150);
                return;
            }
            // hand in
            slots[si].count -= quest.amount;
            if (slots[si].count === 0) slots[si] = null;
            var r = quest.reward;
            if (r.coins)  this.player.getScores().get('COINS').up(r.coins);
            if (r.ammo)   this.player.getScores().get('AMMO').up(r.ammo);
            if (r.health) this.player.getScores().get('HEALTH').up(r.health);
            npc.questIndex++;
            npc.questAccepted = false;
            this.notify('Auftrag erf\u00fcllt! Belohnung: ' + quest.rewardText, 200);
        }
        tryIslandInteract() {
            if (Math.abs(this.player.z - CM.FloatLevel) > 0.25) return;
            var shrines = this.world.getObjects().filter(function(o) { return o.isShrine; });
            for (var i = 0; i < shrines.length; i++) {
                var obj = shrines[i];
                if (CM.distance(this.player.position, obj.position) > 50) continue;
                if (obj.used) { this.notify('Schrein bereits aktiviert.', 90); return; }
                obj.used = true;
                var player = this.player;
                switch (obj.buffType) {
                    case 'MAX_HEALTH':
                        player.getScores().get('HEALTH').max += 3;
                        this.notify('+3 max. Leben! (permanent)', 180);
                        break;
                    case 'MAX_AMMO':
                        player.getScores().get('AMMO').max += 5;
                        this.notify('+5 max. Pfeile! (permanent)', 180);
                        break;
                    case 'BOW_LEVEL':
                        player.bowLevel = (player.bowLevel || 0) + 1;
                        this.notify('Bogen gesegnet! +' + (4 + player.bowLevel) + ' Schaden', 180);
                        break;
                }
                CM.SaveLoad.save(this);
                return;
            }
        }
        drawNPCOverlay(npc) {
            var quest = npc.getQuest();
            var ctx = this.renderer.ctxt;
            var sw = this.renderer.getScreenWidth();
            var sh = this.renderer.getScreenHeight();
            var pad = 18;
            var titleFont = 'bold 13px monospace';
            var lineFont  = '12px monospace';
            var title = 'H\u00e4ndler';
            var lines = [];
            if (!quest) {
                lines.push({ font: lineFont, text: 'Danke f\u00fcr deine Hilfe!', color: '#ccc' });
            } else if (!npc.questAccepted) {
                lines.push({ font: lineFont, text: quest.text, color: '#ffe080' });
                lines.push({ font: lineFont, text: 'Belohnung: ' + quest.rewardText, color: '#aaffaa' });
                lines.push({ font: lineFont, text: '[F] Annehmen', color: '#ccc' });
            } else {
                var slots = this.inventory.slots;
                var si = slots.findIndex(function(s) { return s && s.type === quest.resource; });
                var have = si >= 0 ? slots[si].count : 0;
                var done = have >= quest.amount;
                lines.push({ font: lineFont, text: quest.text, color: '#ffe080' });
                lines.push({ font: lineFont, text: 'Fortschritt: ' + have + ' / ' + quest.amount, color: done ? '#aaffaa' : '#ffaaaa' });
                if (done) lines.push({ font: lineFont, text: '[F] Abgeben \u2192 ' + quest.rewardText, color: '#aaffaa' });
                else      lines.push({ font: lineFont, text: 'Noch nicht fertig...', color: '#888' });
            }
            ctx.save();
            ctx.font = titleFont;
            var maxW = ctx.measureText(title).width;
            lines.forEach(function(l) { ctx.font = l.font; maxW = Math.max(maxW, ctx.measureText(l.text).width); });
            var W = maxW + pad * 2;
            var H = 22 + lines.length * 22 + pad;
            var ox = Math.floor((sw - W) / 2);
            var oy = sh - H - 50;
            ctx.fillStyle = 'rgba(20,20,30,0.82)';
            this.roundRect(ctx, ox, oy, W, H, 8);
            ctx.fill();
            ctx.strokeStyle = 'rgba(100,180,100,0.7)';
            ctx.lineWidth = 1.5;
            this.roundRect(ctx, ox, oy, W, H, 8);
            ctx.stroke();
            var tx = ox + pad;
            var ty = oy + 22;
            ctx.font = titleFont;
            ctx.fillStyle = '#88dd88';
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
        drawActiveQuest() {
            var npc = null;
            this.world.getObjects().forEach(function(obj) {
                if (obj.isNPC && obj.questAccepted) npc = obj;
            });
            if (!npc) return;
            var quest = npc.getQuest();
            if (!quest) return;
            var slots = this.inventory.slots;
            var si = slots.findIndex(function(s) { return s && s.type === quest.resource; });
            var have = si >= 0 ? slots[si].count : 0;
            var done = have >= quest.amount;
            var ctx = this.renderer.ctxt;
            var sh = this.renderer.getScreenHeight();
            var pad = 10;
            ctx.save();
            ctx.font = '11px monospace';
            var line1 = '\u25b6 ' + quest.text;
            var line2 = 'Fortschritt: ' + have + ' / ' + quest.amount;
            var boxW = Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width) + pad * 2;
            var boxX = 8;
            var boxY = sh - 62;
            ctx.fillStyle = 'rgba(20,20,30,0.78)';
            ctx.fillRect(boxX, boxY, boxW, 54);
            ctx.strokeStyle = 'rgba(255,220,80,0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(boxX, boxY, boxW, 54);
            ctx.fillStyle = '#ffe080';
            ctx.fillText(line1, boxX + pad, boxY + 18);
            ctx.fillStyle = done ? '#88ff88' : '#ffaaaa';
            ctx.fillText(line2, boxX + pad, boxY + 36);
            ctx.restore();
        }
        getHutItems(level, hut) {
            var self = this;
            if (level === 'develop') return [
                {
                    name: 'Bett',
                    sub: hut.hasBed ? '(gebaut)' : '4 Holz',
                    disabled: hut.hasBed,
                    action: function() { self.tryBuildBed(); },
                    drawPict: function(ctx, cx, cy, dis) {
                        var c = dis ? '#333' : '#7a5030';
                        // frame
                        ctx.fillStyle = c; ctx.fillRect(cx - 18, cy - 6, 36, 12);
                        // headboard
                        ctx.fillStyle = dis ? '#2a2a2a' : '#5a3010'; ctx.fillRect(cx - 18, cy - 10, 7, 14);
                        // footboard
                        ctx.fillStyle = dis ? '#2a2a2a' : '#5a3010'; ctx.fillRect(cx + 11, cy - 7, 5, 11);
                        // mattress
                        ctx.fillStyle = dis ? '#444' : '#c8b08a'; ctx.fillRect(cx - 10, cy - 5, 20, 9);
                        // pillow
                        ctx.fillStyle = dis ? '#555' : '#ede8d8'; ctx.fillRect(cx - 9, cy - 4, 7, 5);
                    }
                },
                {
                    name: 'Crafting Station',
                    sub: hut.hasCraftingStation ? '(gebaut)' : '3 Holz + 5 Stein',
                    disabled: hut.hasCraftingStation,
                    action: function() { self.tryBuildCraftingStation(); },
                    drawPict: function(ctx, cx, cy, dis) {
                        var top = dis ? '#333' : '#6b3a14';
                        var leg = dis ? '#2a2a2a' : '#4a2008';
                        var tool = dis ? '#444' : '#aaaaaa';
                        // tabletop
                        ctx.fillStyle = top; ctx.fillRect(cx - 20, cy - 8, 40, 5);
                        // legs
                        ctx.fillStyle = leg; ctx.fillRect(cx - 18, cy - 3, 4, 10);
                        ctx.fillStyle = leg; ctx.fillRect(cx + 14, cy - 3, 4, 10);
                        // tools on top: hammer handle
                        ctx.fillStyle = tool; ctx.fillRect(cx - 8, cy - 16, 2, 9);
                        // hammer head
                        ctx.fillStyle = dis ? '#555' : '#888'; ctx.fillRect(cx - 11, cy - 17, 8, 4);
                        // wrench
                        ctx.fillStyle = tool; ctx.fillRect(cx + 4, cy - 15, 2, 8);
                        ctx.fillStyle = tool; ctx.fillRect(cx + 2, cy - 15, 6, 2);
                        ctx.fillStyle = tool; ctx.fillRect(cx + 2, cy - 8,  6, 2);
                    }
                }
            ];
            if (level === 'craft') return [
                {
                    name: 'Bogen aufr\u00fcsten',
                    sub: '2 Holz + 3 Stein  Lvl ' + this.player.bowLevel + '\u2192' + (this.player.bowLevel + 1),
                    action: function() { self.tryBowUpgrade(); },
                    drawPict: function(ctx, cx, cy) {
                        // bow arc
                        ctx.strokeStyle = '#8B5E3C'; ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.arc(cx, cy, 14, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
                        // string
                        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.moveTo(cx - 8, cy - 11); ctx.lineTo(cx - 8, cy + 11); ctx.stroke();
                        // arrow
                        ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
                        ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 14, cy); ctx.stroke();
                        ctx.fillStyle = '#888'; ctx.fillRect(cx + 10, cy - 2, 6, 4);
                    }
                },
                {
                    name: 'Pfeile herstellen',
                    sub: '2 Holz  (+3 Ammo)',
                    action: function() { self.tryCraftArrows(); },
                    drawPict: function(ctx, cx, cy) {
                        for (var a = 0; a < 3; a++) {
                            var ay = cy - 8 + a * 8;
                            ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
                            ctx.beginPath(); ctx.moveTo(cx - 14, ay); ctx.lineTo(cx + 10, ay); ctx.stroke();
                            ctx.fillStyle = '#888'; ctx.fillRect(cx + 7, ay - 2, 5, 4);
                            ctx.fillStyle = '#cc8844'; ctx.fillRect(cx - 16, ay - 2, 4, 4);
                        }
                    }
                },
                {
                    name: 'Fackel herstellen',
                    sub: '1 Holz + 1 Reed',
                    action: function() { self.tryCraftTorch(); },
                    drawPict: function(ctx, cx, cy) {
                        ctx.fillStyle = '#8B5E3C'; ctx.fillRect(cx - 2, cy - 12, 4, 24); // handle
                        ctx.fillStyle = '#ffcc33'; ctx.beginPath(); ctx.arc(cx, cy - 14, 8, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.arc(cx, cy - 16, 6, 0, Math.PI * 2); ctx.fill();
                    }
                },
                {
                    name: 'Lampe herstellen',
                    sub: '1 Holz + 1 Stein + 4 Kristalle + 1 Beere',
                    action: function() { self.tryCraftLamp(); },
                    drawPict: function(ctx, cx, cy) {
                        // pole
                        ctx.fillStyle = '#8B5E3C'; ctx.fillRect(cx - 2, cy, 4, 14);
                        // foot
                        ctx.fillStyle = '#6a4020'; ctx.fillRect(cx - 7, cy + 11, 14, 3);
                        // body frame
                        ctx.fillStyle = '#6a4010'; ctx.fillRect(cx - 8, cy - 14, 16, 15);
                        // glow
                        ctx.fillStyle = '#ffe866'; ctx.beginPath(); ctx.arc(cx, cy - 7, 5, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = 'rgba(255,220,80,0.4)'; ctx.beginPath(); ctx.arc(cx, cy - 7, 10, 0, Math.PI * 2); ctx.fill();
                        // cap
                        ctx.fillStyle = '#4a2a08'; ctx.fillRect(cx - 6, cy - 16, 12, 3);
                    }
                }
            ];
            // main
            var items = [];
            items.push({
                name: 'Heilen',
                sub: hut.hasBed ? 'HP wiederherstellen' : '(kein Bett)',
                disabled: !hut.hasBed,
                action: function() { self.tryHutHeal(); self.hutMenuOpen = false; },
                drawPict: function(ctx, cx, cy, dis) {
                    // heart
                    var c = dis ? '#444' : '#dd3333';
                    ctx.fillStyle = c;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy + 10);
                    ctx.bezierCurveTo(cx - 18, cy - 2, cx - 18, cy - 14, cx, cy - 6);
                    ctx.bezierCurveTo(cx + 18, cy - 14, cx + 18, cy - 2, cx, cy + 10);
                    ctx.fill();
                    // cross
                    ctx.fillStyle = dis ? '#333' : '#ffffff';
                    ctx.fillRect(cx - 1, cy - 4, 3, 9);
                    ctx.fillRect(cx - 4, cy - 1, 9, 3);
                }
            });
            items.push({
                name: 'Entwickeln',
                sub: 'Bett, Crafting Station',
                action: function() { self.hutMenuLevel = 'develop'; self.hutMenuIndex = 0; },
                drawPict: function(ctx, cx, cy) {
                    // hammer
                    ctx.fillStyle = '#8B5E3C'; ctx.fillRect(cx - 2, cy - 4, 4, 14);
                    ctx.fillStyle = '#999'; ctx.fillRect(cx - 8, cy - 10, 16, 8);
                    ctx.fillStyle = '#bbb'; ctx.fillRect(cx - 6, cy - 9, 4, 6);
                }
            });
            if (hut.hasCraftingStation) items.push({
                name: 'Craften',
                sub: 'Bogen, Pfeile',
                action: function() { self.hutMenuLevel = 'craft'; self.hutMenuIndex = 0; },
                drawPict: function(ctx, cx, cy) {
                    ctx.strokeStyle = '#8B5E3C'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.arc(cx, cy, 12, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
                    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(cx - 7, cy - 9); ctx.lineTo(cx - 7, cy + 9); ctx.stroke();
                    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(cx - 7, cy); ctx.lineTo(cx + 12, cy); ctx.stroke();
                    ctx.fillStyle = '#888'; ctx.fillRect(cx + 9, cy - 2, 5, 4);
                }
            });
            return items;
        }
        drawHutOverlay(hut) {
            if (!this.hutMenuOpen) {
                // proximity hint
                var _ctx = this.renderer.ctxt;
                var _hint = '[H] Blockh\u00fctte';
                _ctx.font = '12px monospace';
                var _hw = _ctx.measureText(_hint).width + 20;
                var _hx = Math.floor((this.renderer.getScreenWidth() - _hw) / 2);
                var _hy = this.renderer.getScreenHeight() - 38;
                this.renderer.drawRectangleStatic(_hx, _hy, _hw, 22, 'rgba(0,0,0,0.55)');
                this.renderer.fillTextStaticColor(_hint, _hx + 10, _hy + 15, 12, '#d4b87a');
                return;
            }

            var ctx = this.renderer.ctxt;
            var sw = this.renderer.getScreenWidth();
            var sh = this.renderer.getScreenHeight();
            var items = this.getHutItems(this.hutMenuLevel, hut);

            var CARD_W = 140;
            var CARD_H = 104;
            var CARD_GAP = 16;
            var PAD = 24;
            var TITLE_H = 30;
            var HINT_H = 22;

            var titles = { main: 'Blockh\u00fctte', develop: 'Entwickeln', craft: 'Crafting Station' };
            var title = titles[this.hutMenuLevel] || 'Blockh\u00fctte';

            var panelW = items.length * CARD_W + (items.length - 1) * CARD_GAP + PAD * 2;
            var panelH = TITLE_H + CARD_H + HINT_H + PAD * 2;
            var px = Math.floor((sw - panelW) / 2);
            var py = Math.floor((sh - panelH) / 2);

            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, sw, sh);

            ctx.fillStyle = 'rgba(18,15,10,0.96)';
            this.roundRect(ctx, px, py, panelW, panelH, 10);
            ctx.fill();
            ctx.strokeStyle = 'rgba(180,160,100,0.6)';
            ctx.lineWidth = 1.5;
            this.roundRect(ctx, px, py, panelW, panelH, 10);
            ctx.stroke();

            ctx.font = 'bold 14px monospace';
            ctx.fillStyle = '#d4b87a';
            ctx.fillText(title, px + PAD, py + 20);

            var cardY = py + TITLE_H + PAD;

            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var cardX = px + PAD + i * (CARD_W + CARD_GAP);
                var sel = i === this.hutMenuIndex;
                var dis = !!item.disabled;

                ctx.fillStyle = dis ? 'rgba(20,20,20,0.7)' : sel ? 'rgba(50,40,20,0.9)' : 'rgba(25,22,15,0.9)';
                this.roundRect(ctx, cardX, cardY, CARD_W, CARD_H, 6);
                ctx.fill();
                ctx.strokeStyle = dis ? 'rgba(60,60,60,0.4)' : sel ? 'rgba(220,190,100,0.9)' : 'rgba(100,80,40,0.5)';
                ctx.lineWidth = sel ? 2 : 1;
                this.roundRect(ctx, cardX, cardY, CARD_W, CARD_H, 6);
                ctx.stroke();

                ctx.font = 'bold 12px monospace';
                ctx.fillStyle = dis ? '#555' : sel ? '#ffe0a0' : '#c4a060';
                var nameW = ctx.measureText(item.name).width;
                ctx.fillText(item.name, cardX + Math.floor((CARD_W - nameW) / 2), cardY + 18);

                if (item.drawPict) {
                    ctx.save();
                    item.drawPict(ctx, Math.floor(cardX + CARD_W / 2), cardY + 56, dis);
                    ctx.restore();
                }

                if (item.sub) {
                    ctx.font = '10px monospace';
                    ctx.fillStyle = dis ? '#444' : '#998060';
                    var subW = ctx.measureText(item.sub).width;
                    ctx.fillText(item.sub, cardX + Math.floor((CARD_W - subW) / 2), cardY + 92);
                }
            }

            ctx.font = '11px monospace';
            ctx.fillStyle = '#556677';
            var back = this.hutMenuLevel !== 'main' ? '   ESC zur\u00fcck' : '   ESC schlie\u00dfen';
            var hint = '\u2190 \u2192 ausw\u00e4hlen   ENTER best\u00e4tigen' + back;
            var hintW = ctx.measureText(hint).width;
            ctx.fillText(hint, px + Math.floor((panelW - hintW) / 2), py + panelH - 8);
            ctx.restore();
        }
        drawWindRose(blimp) {
            var ctx = this.renderer.ctxt;
            var sw = this.renderer.getScreenWidth();
            var mm = 120 + 16; // minimap size + margin
            var R = 36;
            var cx = sw - 16 - mm - 16 - R;
            var cy = 16 + R;

            // background circle
            ctx.save();
            ctx.fillStyle = 'rgba(10,12,20,0.7)';
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(140,160,200,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

            // cardinal labels
            ctx.font = '8px monospace';
            ctx.fillStyle = 'rgba(180,190,210,0.7)';
            ctx.textAlign = 'center';
            ctx.fillText('N', cx,      cy - R + 9);
            ctx.fillText('S', cx,      cy + R - 2);
            ctx.fillText('W', cx - R + 4, cy + 3);
            ctx.fillText('O', cx + R - 4, cy + 3);

            // draw all wind layers as faint arcs
            var layers = blimp.windLayers;
            var layerColors = ['rgba(100,180,255,0.25)', 'rgba(100,255,180,0.25)', 'rgba(255,200,100,0.25)'];
            for (var i = 0; i < layers.length; i++) {
                var w = layers[i].wind;
                var len = Math.sqrt(w.x*w.x + w.y*w.y);
                if (len === 0) continue;
                var nx = w.x / len, ny = w.y / len;
                var r = 20 + i * 5;
                ctx.strokeStyle = layerColors[i];
                ctx.lineWidth = 3 + i;
                ctx.beginPath();
                ctx.moveTo(cx - nx * r * 0.3, cy - ny * r * 0.3);
                ctx.lineTo(cx + nx * r, cy + ny * r);
                ctx.stroke();
            }

            // active wind arrow
            var wind = blimp.wind;
            var wlen = Math.sqrt(wind.x*wind.x + wind.y*wind.y);
            if (wlen > 0) {
                var wx = wind.x / wlen, wy = wind.y / wlen;
                var arrowLen = R - 8;
                var ax = cx + wx * arrowLen, ay = cy + wy * arrowLen;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ax, ay); ctx.stroke();
                // arrowhead
                var angle = Math.atan2(wy, wx);
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.lineTo(ax - Math.cos(angle - 0.4) * 7, ay - Math.sin(angle - 0.4) * 7);
                ctx.lineTo(ax - Math.cos(angle + 0.4) * 7, ay - Math.sin(angle + 0.4) * 7);
                ctx.closePath(); ctx.fill();
            } else {
                // no wind at this altitude
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx - 6, cy - 6); ctx.lineTo(cx + 6, cy + 6);
                ctx.moveTo(cx + 6, cy - 6); ctx.lineTo(cx - 6, cy + 6);
                ctx.stroke();
            }

            // altitude indicator on right side of rose
            var altLabel = blimp.z >= CM.GroundLevel ? 'Boden' :
                           blimp.z >= CM.SkyLevel    ? 'Tief'  :
                           blimp.z >= CM.Max + 0.4   ? 'Mittel': 'Hoch';
            ctx.font = '8px monospace';
            ctx.fillStyle = '#aabbcc';
            ctx.textAlign = 'center';
            ctx.fillText(altLabel, cx, cy + R + 11);

            ctx.textAlign = 'left';
            ctx.restore();
        }

        drawStormWarning() {
            if (!this.storm.isWarning() && !this.storm.isActive()) return;
            var ctx = this.renderer.ctxt;
            var sw  = this.renderer.getScreenWidth();
            // Position: left of the minimap/wind-rose cluster, same height as wind rose
            var ix  = sw - 16 - (120 + 16) - 16 - 36 - 20 - 36; // ~sw-280
            var iy  = 16 + 36;

            ctx.save();

            if (this.storm.isActive()) {
                // Pulsing danger circle
                var pulse = 0.55 + 0.45 * Math.sin(Date.now() / 130);
                ctx.fillStyle = 'rgba(180,40,0,' + (0.45 + pulse * 0.4) + ')';
                ctx.beginPath(); ctx.arc(ix, iy, 22, 0, Math.PI * 2); ctx.fill();
                CM._drawStormIcon(ctx, ix, iy, 1.0);
            } else {
                // Warning: dark background + countdown
                var cd = this.storm.getWarningCountdown();
                ctx.fillStyle = 'rgba(10,12,20,0.72)';
                ctx.beginPath(); ctx.arc(ix, iy - 8, 19, 0, Math.PI * 2); ctx.fill();
                CM._drawStormIcon(ctx, ix, iy - 8, 0.75);
                ctx.font = 'bold 11px monospace';
                ctx.fillStyle = '#ffdd44';
                ctx.textAlign = 'center';
                ctx.fillText(cd + 's', ix, iy + 14);
            }

            ctx.textAlign = 'left';
            ctx.restore();
        }

        getBuildItems() {
            return [
                {
                    name: 'Blockh\u00fctte',
                    cost: [{type: 'WOOD', amount: 6}, {type: 'STONE', amount: 3}],
                    build: this.tryBuildBlockhut.bind(this),
                    drawPict: function(ctx, cx, cy, size) {
                        var sx = size / 12;
                        var ox = Math.round(cx - 5.5 * sx);
                        var oy = Math.round(cy - size / 2);
                        ctx.fillStyle = '#3a2008'; ctx.fillRect(ox + Math.round(2*sx), oy, Math.round(7*sx), Math.round(2*sx));
                        ctx.fillStyle = '#4a3010'; ctx.fillRect(ox + Math.round(sx), oy + Math.round(2*sx), Math.round(9*sx), Math.round(2*sx));
                        ctx.fillStyle = '#5a3a18'; ctx.fillRect(ox, oy + Math.round(4*sx), Math.round(11*sx), Math.round(2*sx));
                        ctx.fillStyle = '#8B5E3C'; ctx.fillRect(ox, oy + Math.round(6*sx), Math.round(11*sx), Math.round(6*sx));
                        ctx.fillStyle = '#6a4020'; ctx.fillRect(ox, oy + Math.round(7*sx), Math.round(11*sx), Math.round(sx));
                        ctx.fillStyle = '#6a4020'; ctx.fillRect(ox, oy + Math.round(9*sx), Math.round(11*sx), Math.round(sx));
                        ctx.fillStyle = '#6a4020'; ctx.fillRect(ox, oy + Math.round(11*sx), Math.round(11*sx), Math.round(sx));
                        ctx.fillStyle = '#2a1800'; ctx.fillRect(ox + Math.round(3*sx), oy + Math.round(8*sx), Math.round(4*sx), Math.round(4*sx));
                    }
                },
                {
                    id: 'bridge',
                    name: 'Br\u00fccke',
                    cost: [{type: 'WOOD', amount: 3}],
                    build: this.tryBuildBridge.bind(this),
                    drawPict: function(ctx, cx, cy, size) {
                        var sx = size / 32;
                        var ox = Math.round(cx - 16 * sx);
                        var oy = Math.round(cy - 7 * sx);
                        ctx.fillStyle = '#6b3a14'; ctx.fillRect(ox, oy, Math.round(32*sx), Math.round(14*sx));
                        ctx.fillStyle = '#3a1a04'; ctx.fillRect(ox, oy + Math.round(2*sx), Math.round(32*sx), Math.round(sx));
                        ctx.fillStyle = '#3a1a04'; ctx.fillRect(ox, oy + Math.round(6*sx), Math.round(32*sx), Math.round(sx));
                        ctx.fillStyle = '#3a1a04'; ctx.fillRect(ox, oy + Math.round(10*sx), Math.round(32*sx), Math.round(sx));
                        ctx.fillStyle = '#3a1a04'; ctx.fillRect(ox, oy, Math.round(2*sx), Math.round(14*sx));
                        ctx.fillStyle = '#3a1a04'; ctx.fillRect(ox + Math.round(30*sx), oy, Math.round(2*sx), Math.round(14*sx));
                    }
                },
                {
                    name: 'Vogelscheuche',
                    cost: [{type: 'WOOD', amount: 2}, {type: 'REED', amount: 1}, {type: 'BERRY_RED', amount: 1}],
                    build: this.tryBuildVogelscheuche.bind(this),
                    drawPict: function(ctx, cx, cy, size) {
                        var sx = size / 24;
                        var ox = Math.round(cx - 7 * sx);
                        var oy = Math.round(cy - size / 2);
                        ctx.fillStyle = '#8B6914'; ctx.fillRect(ox + Math.round(6*sx), oy + Math.round(4*sx), Math.round(2*sx), Math.round(20*sx));
                        ctx.fillStyle = '#7a5c10'; ctx.fillRect(ox, oy + Math.round(9*sx), Math.round(14*sx), Math.round(2*sx));
                        ctx.fillStyle = '#3a2008'; ctx.fillRect(ox + Math.round(4*sx), oy, Math.round(6*sx), Math.round(3*sx));
                        ctx.fillStyle = '#3a2008'; ctx.fillRect(ox + Math.round(3*sx), oy + Math.round(3*sx), Math.round(8*sx), Math.round(sx));
                        ctx.fillStyle = '#e8c87a'; ctx.fillRect(ox + Math.round(4*sx), oy + Math.round(4*sx), Math.round(6*sx), Math.round(5*sx));
                        ctx.fillStyle = '#3a2008'; ctx.fillRect(ox + Math.round(5*sx), oy + Math.round(5*sx), Math.round(sx), Math.round(sx));
                        ctx.fillStyle = '#3a2008'; ctx.fillRect(ox + Math.round(8*sx), oy + Math.round(5*sx), Math.round(sx), Math.round(sx));
                        ctx.fillStyle = '#cc6622'; ctx.fillRect(ox + Math.round(sx), oy + Math.round(11*sx), Math.round(4*sx), Math.round(5*sx));
                        ctx.fillStyle = '#cc6622'; ctx.fillRect(ox + Math.round(9*sx), oy + Math.round(11*sx), Math.round(4*sx), Math.round(5*sx));
                        ctx.fillStyle = '#cc6622'; ctx.fillRect(ox + Math.round(5*sx), oy + Math.round(14*sx), Math.round(4*sx), Math.round(8*sx));
                    }
                }
            ];
        }
        drawBuildMenu() {
            var ctx = this.renderer.ctxt;
            var sw = this.renderer.getScreenWidth();
            var sh = this.renderer.getScreenHeight();
            var items = this.getBuildItems();
            var self = this;

            var CARD_W = 124;
            var CARD_H = 150;
            var CARD_GAP = 20;
            var PAD = 24;
            var TITLE_H = 30;
            var HINT_H = 22;
            var PICT_H = 64;

            var panelW = items.length * CARD_W + (items.length - 1) * CARD_GAP + PAD * 2;
            var panelH = TITLE_H + CARD_H + HINT_H + PAD * 2;
            var px = Math.floor((sw - panelW) / 2);
            var py = Math.floor((sh - panelH) / 2);

            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, 0, sw, sh);

            ctx.fillStyle = 'rgba(15,18,28,0.96)';
            this.roundRect(ctx, px, py, panelW, panelH, 10);
            ctx.fill();
            ctx.strokeStyle = 'rgba(140,190,140,0.6)';
            ctx.lineWidth = 1.5;
            this.roundRect(ctx, px, py, panelW, panelH, 10);
            ctx.stroke();

            ctx.font = 'bold 14px monospace';
            ctx.fillStyle = '#aaddaa';
            ctx.fillText('Bauen', px + PAD, py + 20);

            var cardY = py + TITLE_H + PAD;

            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var cardX = px + PAD + i * (CARD_W + CARD_GAP);
                var sel = i === this.buildMenuIndex;

                ctx.fillStyle = sel ? 'rgba(40,65,40,0.9)' : 'rgba(25,30,45,0.9)';
                this.roundRect(ctx, cardX, cardY, CARD_W, CARD_H, 6);
                ctx.fill();
                ctx.strokeStyle = sel ? 'rgba(160,230,160,0.9)' : 'rgba(60,80,60,0.5)';
                ctx.lineWidth = sel ? 2 : 1;
                this.roundRect(ctx, cardX, cardY, CARD_W, CARD_H, 6);
                ctx.stroke();

                ctx.font = 'bold 12px monospace';
                ctx.fillStyle = sel ? '#ddffdd' : '#99bb99';
                var nameW = ctx.measureText(item.name).width;
                ctx.fillText(item.name, cardX + Math.floor((CARD_W - nameW) / 2), cardY + 16);

                item.drawPict(ctx, Math.floor(cardX + CARD_W / 2), Math.floor(cardY + 24 + PICT_H / 2), PICT_H);

                // cost icons centered at bottom of card
                var costY = cardY + CARD_H - 14;
                var iconH = 14;
                var slots = this.inventory.slots;
                ctx.font = '11px monospace';
                var parts = item.cost.map(function(c) {
                    var si = slots.findIndex(function(s) { return s && s.type === c.type; });
                    var have = si >= 0 ? slots[si].count : 0;
                    return { type: c.type, amount: c.amount, enough: have >= c.amount, numW: ctx.measureText('' + c.amount).width };
                });
                var totalCostW = parts.reduce(function(acc, p) { return acc + p.numW + 2 + iconH; }, 0) + (parts.length - 1) * 6;
                var cx2 = cardX + Math.floor((CARD_W - totalCostW) / 2);
                parts.forEach(function(p, j) {
                    ctx.font = '11px monospace';
                    ctx.fillStyle = p.enough ? '#88ff88' : '#ff7777';
                    ctx.fillText('' + p.amount, cx2, costY);
                    cx2 += Math.round(p.numW) + 2;
                    var img = self.imagerepo.getImage('item_' + p.type.toLowerCase());
                    if (img && img.width) ctx.drawImage(img, cx2, costY - iconH + 2, iconH, iconH);
                    cx2 += iconH + (j < parts.length - 1 ? 6 : 0);
                });
            }

            ctx.font = '11px monospace';
            ctx.fillStyle = '#556677';
            var hint = '\u2190 \u2192 ausw\u00e4hlen   ENTER bauen   ESC schlie\u00dfen';
            var hintW = ctx.measureText(hint).width;
            ctx.fillText(hint, px + Math.floor((panelW - hintW) / 2), py + panelH - 8);
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
        drawRespawnDialog() {
            var r = this.renderer;
            var w = r.getScreenWidth();
            var h = r.getScreenHeight();
            r.drawRectangleStatic(0, 0, w, h, 'rgba(0,0,0,0.72)');

            var cx = Math.floor(w / 2);
            var boxW = 320, boxH = 130;
            var bx = cx - Math.floor(boxW / 2);
            var by = Math.floor(h / 2) - 100;

            r.fillTextStaticColor('GAME OVER', bx + 60, by - 20, 42, '#dd2222');

            r.drawRectangleStatic(bx - 2, by + 4, boxW + 4, boxH, '#445566');
            r.drawRectangleStatic(bx, by + 6, boxW, boxH - 4, 'rgba(18,20,28,0.96)');
            r.fillTextStaticColor('Respawn an Blockh\u00fctte?', bx + 20, by + 44, 18, '#eeeeff');
            r.fillTextStaticColor('[ ENTER ]  Ja', bx + 20, by + 80, 14, '#aabbcc');
        }
        gameOver(){
            this.over = true;
        }
        init(){

                this.world.setChunksCachedCallback(CM.ADDENEMYMAKER(this.world,this.imagerepo));

                this.player = new CM.CloudPlayer(this.startPos,this.imagerepo.getImage("playerAni"),this.imagerepo.getImage("playerAniLeft"));
                this.inputHandler._aimTarget = this.player;
                // Cave world
                this.caveWorld = new CM.World(
                    this.world.sizeX, this.world.sizeY,
                    CM.CAVE_TILECREATOR(this.imagerepo, 300, CM.caveEntrancePositions)
                );
                this.caveWorld.setChunksCachedCallback(CM.ADDENEMYMAKER_CAVE(this.caveWorld, this.imagerepo));
                this.caveWorld.applyForTile(CM.CAVE_COLLECTABLEMAKER(this.caveWorld, this.imagerepo));
                this.caveWorld.addHitable('player', this.player);

                this.player.setTileInfoRetrieve(CM.TILEACCESS(this.world));
                this.player.setCaveTileInfoRetriever(CM.TILEACCESS(this.caveWorld));
                var _world = this.world;
                this.player.setBridgeRetriever(function(pos) {
                    return _world.getObjects().some(function(obj) {
                        return obj.isBridge &&
                               pos.x >= obj.position.x && pos.x < obj.position.x + obj.sizeX &&
                               pos.y >= obj.position.y && pos.y < obj.position.y + obj.sizeY;
                    });
                });
                this.player.setFireBallCreator(CM.FireBallCreator(this.world,this.imagerepo));
                this.world.applyForTile(CM.COLLECTABLEMAKER(this.world, this.imagerepo));
                this.world.applyForTile(CM.MINEABLEMAKER(this.world, this.imagerepo));
                this.world.addObject( new CM.Collectable(this.startPos.clone().move(20,20),this.imagerepo.getImage("coin_10"),"COINS",10,0.2));
                for (var _t = 0; _t < 4; _t++) this.inventory.addItem('TORCH');
                var blimp = new CM.Blimp(this.startPos,this.imagerepo.getImage("blimp"));
                this.world.addObject(blimp);
                this.world.addObject(new CM.NPC(new CM.Point(60, 10)));

                // Floating islands — reachable only by blimp at CM.FloatLevel
                [
                    new CM.Point( 600,  400),
                    new CM.Point(2800,  350),
                    new CM.Point( 450, 2600),
                    new CM.Point(2700, 2400),
                ].forEach(pos => {
                    var island = new CM.FloatingIsland(pos, null, this.imagerepo.getImage('tile_island'));
                    this.world.addObject(island);
                    island.populate(this.world, this.imagerepo);
                });
                var _w2 = this.world;
                var _islandGetter = function() {
                    return _w2.getObjects().filter(function(o) { return o instanceof CM.FloatingIsland; });
                };
                blimp.setIslandRetriever(_islandGetter);
                this.player.setIslandRetriever(_islandGetter);
                
                var dragon = new CM.Dragon(new CM.Point( 150,150),this.imagerepo.getImage("dragon_small"));
                dragon.setFireBallCreator(CM.FireBallCreator(this.world,this.imagerepo));
                dragon.setRemover(this.world.removeObject.bind(this.world));
                var _w = this.world;
                dragon.setScarecrowGetter(function() { return _w.getObjects().filter(function(o) { return o.isScarecrow; }); });
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
                this.inputHandler.on("letterKeys", this.handleInteractions.bind(this));
                this.inputHandler.on("arrowKeys", this.handleInteractions.bind(this));
                this.inputHandler.on("keyup", this.handleStop.bind(this));
                this.inputHandler.onGamepadConnected = null;
                this.inputHandler.onGamepadDisconnected = null;
                var self3 = this;
                this.inputHandler.on("keydown", function(k) {
                    if (k === 13 || k === 27 || (k >= 49 && k <= 57)) self3.handleInteractions(k);
                });
                this.osdocu = new CM.OnScreenDocu(new CM.Point(-150,-100), this.imagerepo, this.inputHandler);
                document.getElementById('helpBtn').addEventListener('click', () => this.osdocu.toggle());

                if (CM.SaveLoad.load(this)) this.notify('Spielstand geladen');


        }
    }


