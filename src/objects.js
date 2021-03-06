

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
            var hit = false;
            var objs = this.getHitables();
            objs.forEach(function (obj){
                if((this.sourceIds.length > 0 && this.sourceIds.indexOf(obj.id) == -1) || (this.sourceIds.length == undefined && this.sourceIds != obj.id))
                {
                        if(CM.distance(this.position, obj.position) < 15)
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
CM.VehicleSprite = class VehicleSprite extends CM.Sprite{
    constructor(location,image,z,scalingfactor)
    {
        console.log("init sprite "+image.src);
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
        super(location,image,CM.GroundLevel,0.5);
        this.scores = new CM.ScoreSet();
        this.scores.add(new CM.Fuel(30));
        this.scores.add(new CM.Ammo(30));
        this.scores.add(new CM.Health(30));
        
        this.consumptionEfficiancy = 0.01;
        this.wind = new CM.Point(-0.01,0); //new CM.Point(0,0); 
        this.hitmanager = new CM.Hitable();
        this.dead = false;

       
    }
   

    drawGun(renderer)
    {
        if( this.mountedState ){
            var direction = this.getDirection();
            var start = this.getMidPoint();

            var sizex = direction.x;
            var sizey = direction.y;
            sizex >= 0 ? start.move(-1,-1) : start.move(0,-1);
            if(direction.x == 0) sizex = 1;
            if(direction.y == 0) sizey = 1;
            if(direction.y > 3) sizey = 3;
            if(direction.x > 3) sizex = 3;
            
            renderer.drawRectangleZ(start.x,start.y,sizex*1.5, sizey*1.5, "#59616d",3);
        }
    }
    draw(renderer)
    {
        super.draw(renderer);
       
        this.drawGun(renderer);
        
        
        this.hitmanager.draw(this,renderer);


    }
    tick(player)
    {

        if(this.z < CM.GroundLevel)
        {
            if(this.mountedState == true)
            {
                if(player != null){
                    player.move(this.wind.x, this.wind.y);
                //    this.move(this.wind.x, this.wind.y);
                }
            }
            else{
                this.move(this.wind.x, this.wind.y);
            }
        }
    }
    move(x,y)
    {
        if(x == this.wind.x && y == this.wind.y) {
            super.move(x,y);
            
            return true;
        }
        if(this.scores.get("FUEL").getScore() > this.scores.get("FUEL").getMin()){
            
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
        if(this.scores.get("HEALTH").getScore() == 0 && !this.dead) 
        {
            this.dead = true;
            CM.VEHICLEDEATH(this);
        }
    }
}  

