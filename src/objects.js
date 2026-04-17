

CM = window.CM || {};
CM.ObjId = 1;
CM.CloudObject = class CloudObject {
    constructor(location,sizex,sizey,z)
    {
        this.position = new CM.Point(location.x,location.y);
        this.sizeX = sizex;
        this.sizeY = sizey;
        this.z = z;
        this.interactable = false;
    }
    getMidPoint(){
        return new CM.Point(this.position.x+this.sizeX/2, this.position.y+this.sizeY/2)
    }
    tick(){
        return;
    }
}
CM.MoveableObject = class Moveable extends CM.CloudObject{
    constructor(location,sizex,sizey,z)
    {
       super(location,sizex,sizey,z);
       this.id = CM.ObjId++;
       this.remove = null;
    }
    move(x,y)
    {
        this.position.move(x,y);
       
    }
    setRemover(remove)
    {
        this.remove = remove;
    }
  
}






CM.Sprite = class Sprite extends CM.MoveableObject{
    
                   constructor(image, location,z, isStatic, scalingfactor) {

                       
                        super(location,image.width*scalingfactor,image.height*scalingfactor,z);
                        //this.image = image;
                        this.static = isStatic;
                        this.scalingfactor = scalingfactor;
                        this.animate = false;
                        this.image = null;
                        this.init(image);
                    }
    
    
                    setStatic(val)
                    {
                        this.static = val;
                    }
                    getImage() {

                        return this.image;
                    };
                    draw(renderer) {
                        if(this.static)
                        {
                        //   renderer.drawImageStatic(this.getImage(),  this.sizeX*3,this.sizeY*3,this.scalingfactor);
                            renderer.drawImageZ(this.getImage(), this.position.x,this.position.y, this.sizeX,this.sizeY,3,1/* this.scalingfactor*/);
                            
                        }
                        else{
                          
                            renderer.drawImage(this.getImage(), this.position.x,this.position.y, this.sizeX,this.sizeY, 1 /*this.scalingfactor*/);
                        }
                    
                    };
                    init(image) {
                        this.anistep = 0;
                        this.imageArray = [];
                        if (image.length !== undefined) {
                            this.imageArray = image;
                            this.image = image[this.anistep];
                        } else {
                            this.image = image;
                        }
    
                        this.anispeed = 8;
                        this.frame = 0;
                    };
                    toggleAnimation (val)
                    {
                        this.animate = val;
                    }
                    tick() {
                        if(this.imageArray.length > 0)
                        {
                            if(this.animate)
                            {
                                this.frame++;
                                if (this.imageArray.length > 0) {
                                    if (this.frame % this.anispeed === 0)
                                        this.anistep = (this.anistep + 1) % this.imageArray.length;
                                    this.image = this.imageArray[this.anistep];
                                }
                            }
                            else
                            {
                                this.image = this.imageArray[0];
                            }
                       }
                    }
};
CM.FireBall = class FireBall extends CM.Sprite{
    constructor(location, image,z, range, movementVector, scaleFactor,sourceIds)
    {
        super(image,location,z,true,scaleFactor);
        this.range = range;
        this.speed = movementVector;
        this.sourceIds = sourceIds;
        this.travelLength = 0;
        this.getHitables = null;
        this.strength = 4;
    }
    tick()
    {
        var preTickLoc = this.position.clone();
        this.move(this.speed.x,this.speed.y);
        this.travelLength += CM.distance(preTickLoc, this.position);
        if(this.travelLength >= this.range && this.rangeExCallback)
        {
            this.rangeExCallback(this);
        }
        else
        {
            if(this.islandRetriever && Math.abs(this.z - CM.FloatLevel) <= 0.12)
            {
                var _pos = this.position;
                var hitIsland = this.islandRetriever().some(function(isl) {
                    return isl.containsRect(_pos.x, _pos.y, 1, 1);
                });
                if(hitIsland) { this.rangeExCallback(this); return; }
            }
            var hit = false;
            var objs = this.getHitables();
            objs.forEach(function (obj){
                if(Array.isArray(this.sourceIds) ? this.sourceIds.indexOf(obj.id) == -1 : this.sourceIds != obj.id)
                {
                        if(CM.distance(this.position, obj.position) < 15 && Math.abs(this.z - obj.z) < 0.6)
                        {
                            obj.hit(this.strength);
                            hit = true;
                        }

                }
            }.bind(this));
            if(hit)
            {
                this.rangeExCallback(this);
            }
        }
    }
    registerRangeEx(callback)
    {
        this.rangeExCallback = callback;
    }
    registerGetHitables(callback)
    {
        this.getHitables = callback;
    }
    registerIslandRetriever(fn)
    {
        this.islandRetriever = fn;
    }

}
CM.Collectable = class Collectable extends CM.Sprite
{
    constructor(location,image,typename, pvalue,scaleFactor)
    {
        var scale = scaleFactor != null ? scaleFactor : 0.3;
       super(image,location,CM.GroundLevel,false,scale);
       this.pointvalue = pvalue;
       this.collectable = true;
       this.typeName = typename;
    }
    getTypeName()
    {
        return this.typeName;
    }
    getPointValue(){
        return this.pointvalue;
    }
    draw(renderer)
    {
    //    renderer.drawRectangle(this.position.x,this.position.y,this.sizeX,this.sizeY,"#00FF00")
     
        super.draw(renderer);
    }
    tick(){
        super.tick();
    }
   
}
CM.PlacedLamp = class PlacedLamp extends CM.Sprite {
    constructor(location, image) {
        super(image, location, CM.CaveLevel, false, 0.8);
        this.isLamp = true;
        this.lightInnerR = 300;
        this.lightOuterR = 520;
    }
}

CM.Chest = class Chest extends CM.Sprite {
    constructor(location, image) {
        super(image, location, CM.CaveLevel, false, 0.8);
        this.interactable = true;
        this.isChest = true;
        this.opened = false;
    }

    open(_caveWorld, imagerepo) {
        if (this.opened) return null;
        this.opened = true;
        var lootPool = [
            { img: 'ammo_10',  type: 'AMMO',   val: 10 },
            { img: 'health_10',type: 'HEALTH',  val: 10 },
            { img: 'coin_10',  type: 'COINS',   val: 20 },
            { img: 'crystal',  type: 'CRYSTAL', val: 3  },
        ];
        var item = lootPool[Math.floor(CM.rng() * lootPool.length)];
        return new CM.Collectable(
            this.position.clone().move(5, 5),
            imagerepo.getImage(item.img), item.type, item.val, 0.4
        );
    }

    draw(renderer) {
        super.draw(renderer);
        if (this.opened) {
            // tint opened chest darker via semi-transparent overlay
            var ctx = renderer.ctxt;
            ctx.save();
            ctx.globalAlpha = 0.5;
            super.draw(renderer);
            ctx.restore();
        }
    }
}

CM.IslandChest = class IslandChest extends CM.Chest {
    constructor(location, image) {
        super(location, image);
        this.z = CM.FloatLevel;
    }
    open(_world, imagerepo) {
        if (this.opened) return null;
        this.opened = true;
        var lootPool = [
            { img: 'coin_10',   type: 'COINS',  val: 30 },
            { img: 'coin_10',   type: 'COINS',  val: 50 },
            { img: 'ammo_10',   type: 'AMMO',   val: 10 },
            { img: 'health_10', type: 'HEALTH', val: 5  },
        ];
        var item = lootPool[Math.floor(CM.rng() * lootPool.length)];
        return new CM.Collectable(
            this.position.clone().move(5, 5),
            imagerepo.getImage(item.img), item.type, item.val, 0.4
        );
    }
}

CM.Shrine = class Shrine extends CM.Sprite {
    constructor(location, image) {
        super(image, location, CM.FloatLevel, false, 0.7);
        this.interactable = false;
        this.isShrine = true;
        this.used = false;
        this.buffType = null;
    }
}

CM.DragonEgg = class DragonEgg extends CM.Sprite {
    constructor(location, image) {
        super(image, location, CM.FloatLevel, false, 0.6);
        this.isEgg = true;
        this.mineable = true;
        this.hitsRequired = 3;
        this.hitsReceived = 0;
        this.hitFlash = 0;
        this.resourceType = 'EGG';
        this.classType = 'DragonEgg';
    }
    mine() {
        this.hitsReceived++;
        this.hitFlash = 8;
        if (this.hitsReceived >= this.hitsRequired) {
            if (this.remove) this.remove(this);
            return true;
        }
        return false;
    }
    tick() { if (this.hitFlash > 0) this.hitFlash--; }
    draw(renderer) {
        if (this.hitFlash > 0) {
            var ctx = renderer.ctxt;
            ctx.save();
            ctx.filter = 'brightness(2)';
            super.draw(renderer);
            ctx.restore();
        } else {
            super.draw(renderer);
        }
    }
}

CM.VehicleSprite = class VehicleSprite extends CM.Sprite{
    constructor(location,image,z,scalingfactor)
    {
        console.log("init sprite "+(Array.isArray(image) ? '[animation]' : image.src));
      super(image, location,z,false,scalingfactor);
      this.mountedState = false;
   //   this.sprite = new CM.Sprite(image,location,z,false,scalingfactor);
      this.interactable = true;
      this.mountedGuest = null;
    
    }
    setMountedState(val, guest)
    {
        this.mountedState = val;
        this.setStatic( val);
        if(val) this.mountedGuest = guest;
        else this.mountedGuest = null;
    }
    getDirection(){
        var direction = new CM.Point(3,0);
        if(this.mountedGuest !=null) direction = this.mountedGuest.getMovementDirection();
        return direction;
    }
   
    draw(renderer)
     {
        super.draw(renderer);
     }
     tick(){
         super.tick();
         if(this.ticker) this.ticker(this)
     }
     setTicker(func)
     {
        this.ticker = func;
     }
}
CM.Blimp = class Blimp  extends CM.VehicleSprite{
    constructor(location,image)
    {
        super(location,image,CM.GroundLevel,1/6);
        this.scores = new CM.ScoreSet();
        this.scores.add(new CM.Fuel(30));
        this.scores.add(new CM.Ammo(30));
        this.scores.add(new CM.Health(30));
        
        this.consumptionEfficiancy = 0.01;
        this.windLayers = CM.WindLayers; // live reference — storm can mutate wind in-place
        this.wind = new CM.Point(0, 0);
        this.sailMode = false;
        this.hitmanager = new CM.Hitable();
        this.dead = false;
        this.gunFlashFrames = 0;
        this.gunDirection = null; // null = follow movement, CM.Point = independent aim
    }
   

    getGunPivot() {
        // Fester Aufhängepunkt: rechte Mitte des Blimps (Nase des Sprites)
        return new CM.Point(this.position.x + this.sizeX, this.getMidPoint().y - 2);
    }
    getGunDirection() {
        if(CM.gamepadActive) return this.gunDirection || this.getDirection();
        return this.getDirection();
    }
    getFrontPoint() {
        var dir = this.getGunDirection();
        var len = Math.sqrt(dir.x * dir.x + dir.y * dir.y) || 1;
        var pivot = this.getGunPivot();
        var barrelLen = 5; // Welteinheiten
        return new CM.Point(
            pivot.x + (dir.x / len) * barrelLen,
            pivot.y + (dir.y / len) * barrelLen
        );
    }
    triggerGunFlash() {
        this.gunFlashFrames = 8;
    }
    drawGun(renderer)
    {
        if (!this.mountedState) return;
        var direction = this.getGunDirection();
        var pivot = this.getGunPivot();
        var S = 3; // sprite scale factor — matches drawImageZ hardcoded z=3
        var ctx = renderer.ctxt;
        var cw = renderer.canvas.width, ch = renderer.canvas.height;
        var vx = renderer.viewport.x, vy = renderer.viewport.y;

        // anchor = top-left of blimp sprite on screen (same as drawImageZ uses this.zoom for translation)
        var anchorX = renderer.translateAndZoom(this.position.x - vx, cw / 2);
        var anchorY = renderer.translateAndZoom(this.position.y - vy, ch / 2);
        // offset within sprite uses S=3 like drawImageZ does for sizing
        function sx(wx) { return anchorX + (wx - this.position.x) * S; }
        function sy(wy) { return anchorY + (wy - this.position.y) * S; }

        var len = Math.sqrt(direction.x * direction.x + direction.y * direction.y) || 1;
        var angle = Math.atan2(direction.y / len, direction.x / len);

        var px = sx.call(this, pivot.x);
        var py = sy.call(this, pivot.y);
        var barrelLen = 5 * S;
        var barrelH = 1.5 * S;
        var baseR = 2 * S;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);

        // Rohr: dunkle Umrisslinie
        ctx.fillStyle = '#1e2226';
        ctx.fillRect(-1, -barrelH / 2 - 1, barrelLen + 2, barrelH + 2);

        // Rohr: Hauptkörper
        ctx.fillStyle = '#4a5158';
        ctx.fillRect(0, -barrelH / 2, barrelLen, barrelH);

        // Rohr: Mündungsband (dicker Ring am Ende)
        ctx.fillStyle = '#2e3338';
        ctx.fillRect(barrelLen - 2 * S, -barrelH / 2 - 0.5, 2 * S, barrelH + 1);

        // Rohr: Glanzstreifen oben
        ctx.fillStyle = 'rgba(190, 210, 230, 0.38)';
        ctx.fillRect(1, -barrelH / 2, barrelLen - 3, 1);

        // Rohr: dunkle Mündungsöffnung
        ctx.fillStyle = '#0d0f11';
        ctx.beginPath();
        ctx.arc(barrelLen, 0, barrelH * 0.42, 0, Math.PI * 2);
        ctx.fill();

        // Sockel: äußerer Ring
        ctx.fillStyle = '#2e3338';
        ctx.beginPath();
        ctx.arc(0, 0, baseR + 1, 0, Math.PI * 2);
        ctx.fill();

        // Sockel: Hauptfläche
        ctx.fillStyle = '#6a737d';
        ctx.beginPath();
        ctx.arc(0, 0, baseR, 0, Math.PI * 2);
        ctx.fill();

        // Sockel: Glanzpunkt
        ctx.fillStyle = 'rgba(200, 220, 240, 0.40)';
        ctx.beginPath();
        ctx.arc(-baseR * 0.22, -baseR * 0.28, baseR * 0.52, 0, Math.PI * 2);
        ctx.fill();

        // Mündungsfeuer
        if (this.gunFlashFrames > 0) {
            var alpha = this.gunFlashFrames / 8;
            ctx.fillStyle = 'rgba(255, 210, 60, ' + alpha + ')';
            ctx.beginPath();
            ctx.arc(barrelLen, 0, barrelH * 1.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 200, ' + (alpha * 0.8) + ')';
            ctx.beginPath();
            ctx.arc(barrelLen, 0, barrelH * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
    drawSails(renderer, side) {
        if (!this.mountedState || !this.sailMode) return;
        var mid = this.getMidPoint();
        var S = 3; // matches drawImageZ hardcoded z=3
        var ctx = renderer.ctxt;
        var cw = renderer.canvas.width, ch = renderer.canvas.height;
        var vx = renderer.viewport.x, vy = renderer.viewport.y;

        var anchorX = renderer.translateAndZoom(this.position.x - vx, cw / 2);
        var anchorY = renderer.translateAndZoom(this.position.y - vy, ch / 2);
        var self = this;
        function sx(wx) { return anchorX + (wx - self.position.x) * S; }
        function sy(wy) { return anchorY + (wy - self.position.y) * S; }

        function drawWing(rootX, rootY, dir, xs, ys) {
            var rx = sx(rootX), ry = sy(rootY);

            // mast
            var mastTopX = rx + dir * 2 * xs * S, mastTopY = ry - 6.75 * ys * S;

            ctx.strokeStyle = '#4a2a08';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(mastTopX, mastTopY);
            ctx.stroke();

            // spar tips (4 spars, fan outward)
            var spars = [
                { ex: rx + dir * 3.5 * xs * S, ey: ry - 8.5 * ys * S,  cx: rx + dir * 1.5 * xs * S, cy: ry - 7   * ys * S  }, // top
                { ex: rx + dir * 8   * xs * S, ey: ry - 5   * ys * S,  cx: rx + dir * 3.5 * xs * S, cy: ry - 5.5 * ys * S  }, // upper-mid
                { ex: rx + dir * 9.5 * xs * S, ey: ry - 0.5 * ys * S,  cx: rx + dir * 5   * xs * S, cy: ry - 1.5 * ys * S  }, // lower-mid
                { ex: rx + dir * 7.5 * xs * S, ey: ry + 3   * ys * S,  cx: rx + dir * 4   * xs * S, cy: ry + 1.5 * ys * S  }, // bottom
            ];

            // membrane fill — trace outer edge along spar tips, back along root
            ctx.fillStyle = 'rgba(180, 130, 50, 0.82)';
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            spars.forEach(function(s) {
                ctx.quadraticCurveTo(s.cx, s.cy, s.ex, s.ey);
            });
            // close back along a shallow curve to root
            ctx.quadraticCurveTo(rx + dir * 4 * xs * S, ry + 1 * ys * S, rx, ry);
            ctx.closePath();
            ctx.fill();

            // membrane highlight (upper half)
            ctx.fillStyle = 'rgba(220, 175, 80, 0.30)';
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.quadraticCurveTo(spars[0].cx, spars[0].cy, spars[0].ex, spars[0].ey);
            ctx.quadraticCurveTo(spars[1].cx, spars[1].cy, spars[1].ex, spars[1].ey);
            ctx.quadraticCurveTo(rx + dir * 5 * xs * S, ry - 2 * ys * S, rx, ry);
            ctx.closePath();
            ctx.fill();

            // spar bones
            ctx.strokeStyle = '#5a3010';
            ctx.lineWidth = 1.5;
            spars.forEach(function(s) {
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.quadraticCurveTo(s.cx, s.cy, s.ex, s.ey);
                ctx.stroke();
            });

            // rivet
            ctx.fillStyle = '#8b6030';
            ctx.beginPath();
            ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        if (side === 'left')  drawWing(mid.x - 2, mid.y, -1, 0.2, 1.2);
        if (side === 'right') drawWing(mid.x + 2, mid.y, +1, 0.35, 1.1);
        ctx.restore();
    }
    draw(renderer)
    {
        this.drawSails(renderer, 'left');
        super.draw(renderer);
        this.drawSails(renderer, 'right');
        this.drawGun(renderer);
        this.hitmanager.draw(this,renderer);
    }
    getWindForZ(z) {
        for (var i = 0; i < this.windLayers.length; i++) {
            var l = this.windLayers[i];
            if (z <= l.zMax && z >= l.zMin) return l.wind;
        }
        return new CM.Point(0, 0);
    }
    tick(player, playerMoving)
    {
        if (this.gunFlashFrames > 0) this.gunFlashFrames--;
        if(this.z < CM.GroundLevel)
        {
            this.wind = this.getWindForZ(this.z);
            var mult = this.sailMode ? 3.0 : 1.0;
            var wx = this.wind.x * mult, wy = this.wind.y * mult;
            if(this.mountedState == true) {
                if(player != null && !playerMoving) {
                    player.move(wx, wy, false);
                }
            } else {
                this.move(wx, wy);
            }
        }
    }
    setIslandRetriever(fn) {
        this.islandRetriever = fn;
    }
    isOnIsland() {
        if (!this.islandRetriever) return false;
        if (Math.abs(this.z - CM.FloatLevel) > 0.03) return false;
        return this.islandRetriever().some(function(isl) {
            return isl.containsRect(this.position.x, this.position.y, this.sizeX, this.sizeY);
        }.bind(this));
    }
    _collidesWithIsland(dx, dy) {
        if (!this.islandRetriever) return false;
        if (Math.abs(this.z - CM.FloatLevel) > 0.12) return false;
        var nx = this.position.x + dx;
        var ny = this.position.y + dy;
        return this.islandRetriever().some(function(island) {
            return island.containsRect(nx, ny, this.sizeX, this.sizeY);
        }.bind(this));
    }
    move(x,y)
    {
        if(this.isOnIsland()) return false;
        var mult = this.sailMode ? 3.0 : 1.0;
        if(x == this.wind.x * mult && y == this.wind.y * mult) {
            if(this._collidesWithIsland(x,y)) return false;
            super.move(x,y);
            return true;
        }
        if(this.scores.get("FUEL").getScore() > this.scores.get("FUEL").getMin()){
            if(this._collidesWithIsland(x,y)) return false;
            var fuelConsumption= CM.distance(new CM.Point(0,0),new CM.Point(x,y));
            this.scores.get("FUEL").reduce(fuelConsumption*this.consumptionEfficiancy);
            super.move(x,y);
            return true;
        }
        else return false;
    }
    hit(strength)
    {
        this.scores.get("HEALTH").reduce(strength);
        this.hitmanager.hit();
        CM.Sound.play('hit');
        if(this.scores.get("HEALTH").getScore() == 0 && !this.dead)
        {
            this.dead = true;
            CM.Sound.play('die');
            CM.VEHICLEDEATH(this);
        }
    }
}  

