CM = window.CM || {};


CM.CloudPlayer = class Player extends CM.MoveableObject {
    constructor(position, image){
      super(position, image.width*0.3,image.height*0.3,3);
    
      this.sprite = new CM.Sprite(image , position,3, false,0.3);
     
      
       this.vehicle = null;
    }
    setTileInfoRetrieve(retriever)
    {
        this.tileInfoRetriever = retriever;
    }
    draw(renderer){


        

        if(this.vehicle != null)
        {
            // draw nothing?
        }
        else {
            if(this.sprite != null)
            {
             // renderer.drawRectangle(this.position.x,this.position.y,this.sizeX, this.sizeY,"#0000FF");
              this.sprite.draw(renderer);
            }
            else{
                renderer.drawRectangleStatic(20,20,"#0000FF");
                renderer.drawTriangleStatic(this.p1,this.p2,this.p3,"#0000FF");
            }
        }
    }
  
    descend(val){
        this.z += val;
        if( this.z >= 3)  this.z = 3;
        if(this.isMounted()) this.vehicle.z = this.z;
    }
    ascend(val){
        if(this.isMounted()){
            this.z -= val;
            if( this.z <= 0.5)  this.z = 0.5;
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
    move(x,y)
    {   
        


        if(this.tileInfoRetriever && !this.isMounted())
        {
            if(!this.checkMovement(x,0) || !this.checkMovement(0,y)) return;
           
        }
        super.move(x,y);
        if(this.vehicle != null)
        {
            this.vehicle.move(x,y);
        }
        if(this.sprite != null)
        {
            this.sprite.move(x,y);
        }
    }
    mount(vehicle)
    {
        if(this.z != 3) return false;
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
        if(this.z != 3) return null;
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
       if(distance < 20)
       {
           return true;
       }
       else return false;
    }
    tick(){
      if(this.isMounted())  this.vehicle.tick();
    }
    
}
