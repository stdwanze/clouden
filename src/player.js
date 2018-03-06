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

       this.direction = new CM.Point(6,0);
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
    setFireBallCreator(creator)
    {
        this.fireBallMaker = creator;
    }   
    fire()
    {
        
        var ammoScore = this.isMounted() ? this.vehicle.scores.get("AMMO"):  this.scores.get("AMMO");
        var type = this.isMounted() ? "BLIMBGUN" : "HANDGUN";
        var midPoint = this.isMounted() ? this.vehicle.getMidPoint() : this.getMidPoint();
        var z = this.isMounted() ? this.vehicle.z : this.z;
        if(ammoScore.getScore() > ammoScore.getMin())
        {
    

            var source = this.isMounted() ? [this.id, this.vehicle.id] : this.id;
            this.fireBallMaker(midPoint, z, type, new CM.Point(this.direction.x*2,this.direction.y*2),source );
            ammoScore.reduce();
        }
    }   
    hit(strength)
    {
        if(this.isMounted()) this.vehicle.hit(strength); //this.getMountScores().get("HEALTH").reduce(strength);
        else this.getScores().get("HEALTH").reduce(strength);
    }
    draw(renderer){

        if(this.vehicle != null)
        {
            // draw nothing?
            var start = this.getMidPoint();
            start.move(-1,-1);
            var sizex = this.direction.x;
            var sizey = this.direction.y;
            if(this.direction.x == 0) sizex = 1;
            if(this.direction.y == 0) sizey = 1;
            if(this.direction.y > 3) sizey = 3;
            if(this.direction.x > 3) sizex = 3;
            
            renderer.drawRectangle(start.x,start.y,sizex, sizey, "#59616d");
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
       
         var newPos = this.getBoundingPos(x,y); //this.position.clone();
         newPos.move(x,y);
         var tileInfo = this.tileInfoRetriever(newPos);
         if(!tileInfo.isLand())return false;
         else return true;
      
    }
    toggleSprite(sprite)
    {
        this.stop();
        this.sprite = sprite;
    }
    stop(){
        this.sprite.toggleAnimation(false);
    }
    move(x,y)
    {   

        if(Math.abs(x) >1 || Math.abs(y) > 1) this.direction = new CM.Point(x,y);

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
        if(this.z != CM.GroundLevel) return false;
        if(vehicle != null)
        {
            if(this.isInRange(vehicle)){
                this.vehicle = vehicle;
                this.vehicle.setMountedState(true);
                return true;
            }
        }
     
        return false;
    }
    dismount(){
        if(this.tileInfoRetriever)
        {
            if(!this.tileInfoRetriever(this.getBoundingPos(0,0)).isLand())
            {
                return null;
            }
        }
        if(this.z != CM.GroundLevel) return null;
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
    }
    
}
