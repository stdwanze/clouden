CM = window.CM || {}

CM.GroundEnemy = class GroundEnemy extends CM.Sprite {
    constructor(location, image) {
        super(image, location, CM.GroundLevel, false, 0.3);
        this.scores = new CM.ScoreSet();
        this.scores.add(new CM.Health(10));
        this.speed = 0.8;
        this.damageCooldown = 0;
        this.hitmanager = new CM.Hitable();
        this.playerDist = 9999;
        this.dead = false;
        this.idleSoundId = null;
    }

    setTileInfoRetriever(retriever) {
        this.tileInfoRetriever = retriever;
    }

    setScarecrowGetter(fn) {
        this.getScarecrows = fn;
    }

    canMoveTo(dx, dy) {
        if (!this.tileInfoRetriever) return true;
        var next = new CM.Point(this.position.x + dx, this.position.y + dy);
        var info = this.tileInfoRetriever(next);
        return info != null && info.isLand();
    }

    hit(strength) {
        if (this.dead) return;
        this.hitmanager.hit();
        CM.Sound.playAt('enemy_hit', this.playerDist, 300);
        this.scores.get("HEALTH").reduce(strength);
        if (this.scores.get("HEALTH").getScore() == 0) {
            this.dead = true;
            this.idleSoundId = CM.Sound.updateSpatialLoop('crab_idle', this.idleSoundId, 9999, 200, 2);
            if (this.remove) this.remove(this);
        }
    }

    tick(player) {
        if (player == null) return;
        // only aggro when player is on the ground, not in blimp
        if (player.isMounted() || player.z < CM.GroundLevel - 0.3) {
            this.idleSoundId = CM.Sound.updateSpatialLoop('crab_idle', this.idleSoundId, 9999, 200, 2);
            return;
        }

        this.playerDist = CM.distance(this.position, player.position);
        this.idleSoundId = CM.Sound.updateSpatialLoop('crab_idle', this.idleSoundId, this.playerDist, 200, 2);

        if (this.getScarecrows) {
            var scarecrows = this.getScarecrows();
            for (var i = 0; i < scarecrows.length; i++) {
                var sc = scarecrows[i];
                if (CM.distance(this.position, sc.position) < sc.repelRadius) {
                    var flee = CM.getVector(sc.position, this.position, 1);
                    var fdx = flee.x * this.speed;
                    var fdy = flee.y * this.speed;
                    if      (this.canMoveTo(fdx, fdy)) { this.move(fdx, fdy); this.toggleAnimation(true); }
                    else if (this.canMoveTo(fdx, 0))   { this.move(fdx, 0);   this.toggleAnimation(true); }
                    else if (this.canMoveTo(0,   fdy)) { this.move(0,   fdy); this.toggleAnimation(true); }
                    else                               {                       this.toggleAnimation(false); }
                    if (this.damageCooldown > 0) this.damageCooldown--;
                    return;
                }
            }
        }

        if (this.playerDist < 200) {
            var movement = CM.getVector(this.position, player.position, 1);
            var dx = movement.x * this.speed;
            var dy = movement.y * this.speed;

            var moved = false;
            if (this.canMoveTo(dx, dy))          { this.move(dx, dy); moved = true; }
            else if (this.canMoveTo(dx, 0))      { this.move(dx, 0);  moved = true; }
            else if (this.canMoveTo(0, dy))      { this.move(0, dy);  moved = true; }
            this.toggleAnimation(moved);

            if (this.playerDist < 15) {
                if (this.damageCooldown == 0) {
                    player.hit(1);
                    CM.Sound.playAt('crab_attack', this.playerDist, 150);
                    this.damageCooldown = 60;
                }
            }
        }

        if (this.damageCooldown > 0) this.damageCooldown--;
    }

    draw(renderer) {
        super.draw(renderer);
        this.hitmanager.draw(this, renderer);
    }
}

CM.CaveCrab = class CaveCrab extends CM.GroundEnemy {
    constructor(location, image) {
        super(location, image);
        // 2/3 der Größe von GroundEnemy (0.3 * 2/3 = 0.2)
        this.scalingfactor = 0.2;
        this.sizeX = image.width  * 0.2;
        this.sizeY = image.height * 0.2;
        this.speed = 1.1;
        this.DAMAGE_COOLDOWN_RESET = 40;
        this.z = CM.CaveLevel;
        this.isCaveCrab = true;
    }

    draw(renderer) {
        var ctx = renderer.ctxt;
        ctx.save();
        ctx.filter = 'hue-rotate(105deg) saturate(0.7) brightness(0.55)';
        super.draw(renderer);
        ctx.restore();
    }

    tick(player, _playerMoving, torchActive) {
        if (player == null) return;
        if (player.z < CM.CaveLevel - 0.3) return;

        this.playerDist = CM.distance(this.position, player.position);
        this.idleSoundId = CM.Sound.updateSpatialLoop('crab_idle', this.idleSoundId, this.playerDist, 200, 2);

        if (this.getScarecrows) {
            var scarecrows = this.getScarecrows();
            for (var i = 0; i < scarecrows.length; i++) {
                var sc = scarecrows[i];
                if (CM.distance(this.position, sc.position) < sc.repelRadius) {
                    var flee = CM.getVector(sc.position, this.position, 1);
                    var fdx = flee.x * this.speed;
                    var fdy = flee.y * this.speed;
                    if      (this.canMoveTo(fdx, fdy)) { this.move(fdx, fdy); this.toggleAnimation(true); }
                    else if (this.canMoveTo(fdx, 0))   { this.move(fdx, 0);   this.toggleAnimation(true); }
                    else if (this.canMoveTo(0,   fdy)) { this.move(0,   fdy); this.toggleAnimation(true); }
                    else                               {                       this.toggleAnimation(false); }
                    if (this.damageCooldown > 0) this.damageCooldown--;
                    return;
                }
            }
        }

        var aggroRadius = torchActive ? 200 : 50;
        if (this.playerDist < aggroRadius) {
            var movement = CM.getVector(this.position, player.position, 1);
            var dx = movement.x * this.speed;
            var dy = movement.y * this.speed;

            var moved = false;
            if (this.canMoveTo(dx, dy))     { this.move(dx, dy); moved = true; }
            else if (this.canMoveTo(dx, 0)) { this.move(dx, 0);  moved = true; }
            else if (this.canMoveTo(0, dy)) { this.move(0,  dy); moved = true; }
            this.toggleAnimation(moved);

            if (this.playerDist < 15 && this.damageCooldown === 0) {
                player.hit(1);
                CM.Sound.playAt('crab_attack', this.playerDist, 150);
                this.damageCooldown = this.DAMAGE_COOLDOWN_RESET;
            }
        } else {
            this.toggleAnimation(false);
        }

        if (this.damageCooldown > 0) this.damageCooldown--;
    }
}

CM.Dragon = class Dragon extends CM.VehicleSprite
{
    constructor(location, image)
    {
        super(location,image,CM.SkyLevel+1,0.5);
        this.spit = null;
        this.scores = new CM.ScoreSet();
        this.scores.add(new CM.Health(20));
        this.speed = 0.1;
        this.cooldown = 0;
        this.hitmanager = new CM.Hitable();
        this.playerDist = 9999;
        this.idleSoundId = null;
    }
    
    setFireBallCreator(fireballmaker)
    {
        this.spit = fireballmaker;
    }

    setScarecrowGetter(fn) {
        this.getScarecrows = fn;
    }
    hit(strength)
    {
        this.hitmanager.hit();
        CM.Sound.playAt('enemy_hit', this.playerDist, 300);
        var healthBar = this.scores.get("HEALTH");
        healthBar.reduce(strength);
       
        if(healthBar.getScore() == healthBar.getMin() && this.remove)
        {
            this.idleSoundId = CM.Sound.updateSpatialLoop('enemy_idle', this.idleSoundId, 9999, 250, 2);
            this.remove(this);
        }
    }
    tick(player)
    {
        if(player != null){
            this.playerDist = CM.distance(this.position, player.position);
            this.idleSoundId = CM.Sound.updateSpatialLoop('enemy_idle', this.idleSoundId, this.playerDist, 250, 2);

            if (this.getScarecrows) {
                var scarecrows = this.getScarecrows();
                for (var i = 0; i < scarecrows.length; i++) {
                    var sc = scarecrows[i];
                    if (CM.distance(this.position, sc.position) < sc.repelRadius) {
                        var flee = CM.getVector(sc.position, this.position, 1);
                        super.move(flee.x * this.speed, flee.y * this.speed);
                        return;
                    }
                }
            }

            if(this.playerDist < 150)
            {

                var movement = CM.getVector(this.position, player.position, 1);

                super.move(movement.x*this.speed,movement.y*this.speed);

                if(this.spit && this.cooldown == 0)
                {
                    this.cooldown = 120;
                    this.spit(this.position,this.z, "DRAGONFIRE",new CM.Point(movement.x*3,movement.y*3), this.id);
                    CM.Sound.playAt('enemy_shoot', this.playerDist, 300);
                }
                else
                {

                    this.cooldown--;
                }
            }
        }
    }
    draw(renderer)
    {
        super.draw(renderer);
        this.hitmanager.draw(this, renderer);

    }
}

CM.IslandDragon = class IslandDragon extends CM.Dragon {
    constructor(location, image, island) {
        super(location, image);
        this.z = CM.FloatLevel;
        this.homeIsland = island;
        this.PATROL_RADIUS = 180;
    }

    tick(player) {
        if (this.homeIsland) {
            var home = this.homeIsland.getMidPoint();
            var distFromHome = CM.distance(this.position, home);
            if (distFromHome > this.PATROL_RADIUS) {
                var back = CM.getVector(this.position, home, 1);
                super.move(back.x * this.speed * 2, back.y * this.speed * 2);
                return;
            }
        }
        super.tick(player);
    }
}