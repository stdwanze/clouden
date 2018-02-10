

CM = window.CM || {};

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
    }
    move(x,y)
    {
        this.position.move(x,y);
       
    }
}


CM.Vehicle = class Vehicle extends CM.MoveableObject{
    constructor(location,sizex,sizey,z)
    {
      super(location,sizex,sizey,z);
      this.mountedState = false;
      this.interactable = true;
    }
    setMountedState(val)
    {
        this.mountedState = val;
    }
    draw(renderer)
     {
         var size = 20;
        //  if(this.mountedState == true)
        //  {
        //     renderer.drawRectangleStatic(size*3,size*3,"#FF00FF");
        //  }
        //  else {
         renderer.drawRectangle(this.position.x,this.position.y,20,20,"#FF00FF");
        
      
     }
}

CM.VehicleSprite = class VehicleSprite extends CM.MoveableObject{
    constructor(location,image,z,scalingfactor)
    {
        console.log("init sprite "+image.src);
      super(location,image.width,image.height,z);
      this.mountedState = false;
      this.sprite = new CM.Sprite(image,location,z,false,scalingfactor);
      this.interactable = true;
    
    }
    setMountedState(val)
    {
        this.mountedState = val;
      //  this.sprite.setStatic( val);
    }
    move(x,y)
    {
        super.move(x,y);
        this.sprite.move(x,y);
    }
    draw(renderer)
     {
        this.sprite.draw(renderer);
      
     }
     tick(){
         if(this.ticker) this.ticker(this)
     }
     setTicker(func)
     {
        this.ticker = func;
     }
}
CM.AABB = class AABB{
    
    constructor(location, size) {
        this.x = location.x;
        this.y = location.y;
    
        this.width = size.x;
        this.height = size.y;
    
    };
    contains(location)
    {
        if(this.x <= location.x && this.x+this.width > location.x &&
                        this.y <= location.y && this.y+this.height > location.y)
            { return true;}
        else{
            return false;
        }
    }
}
                

CM.Sprite = class Sprite extends CM.MoveableObject{
    
                   constructor(image, location,z, isStatic, scalingfactor) {

                        super(location,image.width,image.height,z);
                        //this.image = image;
                        this.static = isStatic;
                        this.scalingfactor = scalingfactor;
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
                            renderer.drawImageStatic(this.getImage(),  this.sizeX*3,this.sizeY*3,this.scalingfactor);
                            
                        }
                        else{
                         renderer.drawImage(this.getImage(), this.position.x,this.position.y, this.sizeX,this.sizeY, this.scalingfactor);
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
    
                        this.anispeed = 5;
                        this.frame = 0;
                    };
                    tick(x, y) {
                        this.frame++;
                        this.location = new CM.Point(x, y);
                        if (this.imageArray.length > 0) {
                            if (this.frame % this.anispeed === 0)
                                this.anistep = (this.anistep + 1) % this.imageArray.length;
                            this.image = this.imageArray[this.anistep];
                        }
                    };
            };
