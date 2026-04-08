CM = window.CM || {};


CM.CloudPlayer = class Player extends CM.MoveableObject {
    constructor(position, image, imageleft){
        super(position, image.width*(1/CM.GroundLevel),image.height*(1/CM.GroundLevel),CM.GroundLevel);
        
        this.spriteright = new CM.Sprite(image , position,CM.GroundLevel, false,(1/CM.GroundLevel));
        this.spriteleft = new CM.Sprite(imageleft , position,CM.GroundLevel, false,(1/CM.GroundLevel));
        this.sprite = this.spriteright;
        
        this.vehicle = null;
        this.scores = new CM.ScoreSet();
        this.scores.add(new CM.Health(10));
        this.scores.add(new CM.Ammo(10));
        this.scores.add(new CM.Coins());
        this.scores.add(new CM.Crystals());

        this.direction = new CM.Point(6,0);
        this.gunDirection = null;
        this.dead = false;
        this.hitFlashFrames = 0;
        this.bowLevel = 0;
    }
    getScores(){
        return this.scores;
    }
    getMountScores(){
        return this.vehicle.scores;
    }
    setTileInfoRetrieve(retriever)
    {
        this.tileInfoRetriever = retriever;
    }
    setBridgeRetriever(retriever)
    {
        this.bridgeRetriever = retriever;
    }
    setIslandRetriever(retriever)
    {
        this.islandRetriever = retriever;
    }
    setCaveTileInfoRetriever(retriever)
    {
        this.caveTileInfoRetriever = retriever;
    }
    setFireBallCreator(creator)
    {
        this.fireBallMaker = creator;
    }   
    fire()
    {
        
        var ammoScore = this.isMounted() ? this.vehicle.scores.get("AMMO"):  this.scores.get("AMMO");
        var type = this.isMounted() ? "BLIMBGUN" : "HANDGUN";
        var midPoint = this.isMounted() ? this.vehicle.getFrontPoint() : this.getMidPoint();
        var z = this.isMounted() ? this.vehicle.z : this.z;
        if(ammoScore.getScore() > ammoScore.getMin())
        {

            var source = this.isMounted() ? [this.id, this.vehicle.id] : this.id;
            var gunDir = this.isMounted() ? this.vehicle.gunDirection : this.gunDirection;
            var aimDir = (CM.gamepadActive && gunDir) ? gunDir : this.direction;
            var spd = this.isMounted() ? 2 : 6;
            this.fireBallMaker(midPoint, z, type, new CM.Point(aimDir.x*spd,aimDir.y*spd),source, this.bowLevel);
            ammoScore.reduce();
            CM.Sound.play(this.isMounted() ? 'shoot_blimp' : 'shoot');
            if(this.isMounted()) this.vehicle.triggerGunFlash();
        }
    }   
    hit(strength)
    {
        this.hitFlashFrames = 20;
        if(this.isMounted()) this.vehicle.hit(strength); //this.getMountScores().get("HEALTH").reduce(strength);
        else{

            this.getScores().get("HEALTH").reduce(strength);
            CM.Sound.play('hit');

            if(this.getScores().get("HEALTH").getScore() == 0 && !this.dead)
            {
                this.dead = true;
                CM.Sound.play('die');
                CM.PLAYERDEATH(this);
            }
        }
    }
    getMovementDirection(){
        return this.direction;
    }
    draw(renderer){

        if(this.vehicle != null)
        {
            // draw nothing?
          
        }
        else {
            //renderer.drawRectangle(this.position.x,this.position.y,this.sizeX,this.sizeY,"#00FF00")
            
            this.sprite.draw(renderer);
        }
    }
  
    descend(val){
        this.z += val;
        if( this.z >= CM.GroundLevel)  this.z = CM.GroundLevel;
        if(this.isMounted()) this.vehicle.z = this.z;
    }
    ascend(val){
        if(this.isMounted()){
            this.z -= val;
            if( this.z <= CM.Max)  this.z = CM.Max;
            this.vehicle.z = this.z;
        }
    }
    getBoundingPos(x,y)
    {
        if(x > 0) return this.getBoundingPosWhere("RIGHT");
        if(y > 0) return this.getBoundingPosWhere("DOWN");
        if(x < 0) return this.getBoundingPosWhere("LEFT");
        if(y < 0) this.getBoundingPosWhere("UP");
        return this.getBoundingPosWhere("");
    }
    getBoundingPosWhere(where)
    {
        var pos =  this.position.clone();
        switch(where)
        {
            
            case "RIGHT": {pos.x += this.sizeX; break;}
            case "LEFT" : break;
            case "UP" : break;
            case "DOWN": { pos.y+=this.sizeY; break;}
            default: 
        }
        return pos;
    }
    checkMovement(x,y)
    {
        var newPos = this.getBoundingPos(x,y);
        newPos.move(x,y);

        // Cave level: use cave tile collision
        if (this.z >= CM.CaveLevel - 0.1) {
            if (!this.caveTileInfoRetriever) return true;
            var caveTile = this.caveTileInfoRetriever(newPos);
            return !!(caveTile && caveTile.isLand());
        }

        // determine current altitude state
        var onGround  = this.z >= CM.GroundLevel - 0.05;
        var onIsland  = !onGround && this.islandRetriever &&
                        Math.abs(this.z - CM.FloatLevel) <= 0.25 &&
                        this.islandRetriever().some(function(isl) {
                            return isl.containsRect(this.position.x, this.position.y, 1, 1);
                        }.bind(this));
        if (onGround) {
            // ground rules: must step onto land or bridge
            var tileInfo = this.tileInfoRetriever(newPos);
            var hasGround = tileInfo && tileInfo.isLand();
            var hasBridge = this.bridgeRetriever && this.bridgeRetriever(newPos);
            if (!hasGround && !hasBridge) return false;

            // island tiles sit above ground — normally block walking into footprint,
            // but allow movement when the player is already under the island.
            var isCurrentlyUnderIsland = this.islandRetriever && this.islandRetriever().some(function(isl) {
                return isl.containsRect(this.position.x, this.position.y, 1, 1);
            }.bind(this));
            if (this.islandRetriever && this.islandRetriever().some(function(isl) {
                return isl.containsRect(newPos.x, newPos.y, 1, 1);
            })) {
                if (!isCurrentlyUnderIsland) return false;
            }
            return true;
        }

        if (onIsland) {
            // island rules: may only step onto another island tile (can't walk off the edge)
            if (this.islandRetriever().some(function(isl) {
                return isl.containsRect(newPos.x, newPos.y, 1, 1);
            })) return true;
            return false;
        }

        // inAir: mounted in blimp — movement handled by vehicle, player just follows
        return true;
    }
    toggleSprite(sprite)
    {
        this.stop();
        this.sprite = sprite;
    }
    stop(){
        this.sprite.toggleAnimation(false);
    }
    move(x,y,updateDirection)
    {

        if(updateDirection !== false && (x !== 0 || y !== 0)) this.direction = new CM.Point(x,y);

        if(this.isMounted())
        {
            var res = this.vehicle.move(x,y);
            if(res)
            {
                super.move(x,y);
                if(this.sprite != null)
                {
                    this.spriteright.move(x,y);
                    this.spriteleft.move(x,y);
                }
            }
        }
        else {

            if(x > 0) this.toggleSprite(this.spriteright);
            if(x < 0) this.toggleSprite(this.spriteleft);


            if(this.tileInfoRetriever && !this.isMounted())
            {
                if(!this.checkMovement(x,0) || !this.checkMovement(0,y)) return;
            
            }
            this.sprite.toggleAnimation(true);
            super.move(x,y);
           
            if(this.sprite != null)
            {
                this.spriteright.move(x,y);
                this.spriteleft.move(x,y);
            }
        }
    }
    mount(vehicle)
    {
        if(this.z != CM.GroundLevel && Math.abs(this.z - CM.FloatLevel) > 0.25) return false;
        if(vehicle != null)
        {
            if(this.isInRange(vehicle)){
                this.vehicle = vehicle;
                this.vehicle.setMountedState(true, this);
                return true;
            }
        }
     
        return false;
    }
    dismount(){
        var onIsland = this.vehicle && this.vehicle.isOnIsland && this.vehicle.isOnIsland();
        if(!onIsland) {
            if(this.tileInfoRetriever)
            {
                var dismountPos = this.getBoundingPos(0,0);
                if(!this.tileInfoRetriever(dismountPos).isLand())
                {
                    if(!this.bridgeRetriever || !this.bridgeRetriever(dismountPos)) return null;
                }
            }
            if(this.z != CM.GroundLevel) return null;
        }
        var v = this.vehicle;
        this.vehicle.setMountedState(false);
        this.vehicle = null;
        return v;
    }
    isMounted(){
        return this.vehicle != null;
    }
    isInRange(cloudobject)
    {
       var distance= CM.distance(this.getMidPoint(),cloudobject.getMidPoint());
       if(distance < 10)
       {
           return true;
       }
       else return false;
    }
    collect(collect)
    {
        if(collect != null )
        {
            
            if(this.isInRange(collect))
            {
                if(collect.getTypeName() == "FUEL" && this.isMounted() && this.z == CM.GroundLevel)
                {
                    this.getMountScores().get("FUEL").up(collect.getPointValue());
                    return true;
                }
                else if(collect.getTypeName() == "AMMO" && this.isMounted() && this.z == CM.GroundLevel)
                {
                    this.getMountScores().get("AMMO").up(collect.getPointValue());
                    return true;
                }
                else if(!this.isMounted() && collect.getTypeName() != "FUEL"){

                    this.scores.get(collect.getTypeName()).up(collect.getPointValue());
                    return true;
                }
              

            }
        }
        
        
        return false;
    }
    tick(){
      if(!this.isMounted()) this.sprite.tick();
      if(this.hitFlashFrames > 0) this.hitFlashFrames--;
    }
    
}
