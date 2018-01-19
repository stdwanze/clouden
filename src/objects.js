

CM = window.CM || {};

CM.CloudObject = class CloudObject {
    constructor(location)
    {
        this.position = new CM.Point(location.x,location.y);
    }
}
CM.MoveableObject = class Moveable extends CM.CloudObject{
    constructor(location)
    {
       super(location);
    }
    move(x,y)
    {
        this.position.move(x,y);
       
    }
}

CM.Vehicle = class Vehicle extends CM.MoveableObject{
    constructor(location)
    {
      super(location);
      this.mountedState = false;
    }
    setMountedState(val)
    {
        this.mountedState = val;
    }
    draw(renderer)
     {
         var size = 20;
         if(this.mountedState == true)
         {
            renderer.drawRectangleStatic(size*3,size*3,"#FF00FF");
         }
         else {
            renderer.drawRectangle(this.position.x,this.position.y,20,20,"#FF00FF");
         }
      
     }
}
