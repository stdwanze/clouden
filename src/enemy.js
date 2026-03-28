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
    }

    setTileInfoRetriever(retriever) {
        this.tileInfoRetriever = retriever;
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
            if (this.remove) this.remove(this);
        }
    }

    tick(player) {
        if (player == null) return;
        // only aggro when player is on the ground, not airborne in blimp
        if (player.z < CM.GroundLevel - 0.3) return;

        this.playerDist = CM.distance(this.position, player.position);

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
    hit(strength)
    {
        this.hitmanager.hit();
        CM.Sound.playAt('enemy_hit', this.playerDist, 300);
        var healthBar = this.scores.get("HEALTH");
        healthBar.reduce(strength);
       
        if(healthBar.getScore() == healthBar.getMin() && this.remove)
        {
            this.remove(this);
        }
    }
    tick(player)
    {
        if(player != null){
            this.playerDist = CM.distance(this.position, player.position);
            this.idleSoundId = CM.Sound.updateSpatialLoop('enemy_idle', this.idleSoundId, this.playerDist, 250, 2);

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