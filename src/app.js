CM = window.CM || {};

CM.CloudPlayer = class Player extends CM.MoveableObject {
    constructor(position, image){
      super(position, image.width,image.height,3);
    
      this.sprite = new CM.Sprite(image , position,3, true,0.3);
      this.right();
      
       this.vehicle = null;
    }
    
    draw(renderer){


        

        if(this.vehicle != null)
        {
            // draw nothing?
        }
        else {
            if(this.sprite != null)
            {
              this.sprite.draw(renderer);
            }
            else{
                renderer.drawRectangleStatic(20,20,"#0000FF");
                renderer.drawTriangleStatic(this.p1,this.p2,this.p3,"#0000FF");
            }
        }
    }
    left(){
        this.p1 = new CM.Point(-10,10);
        this.p2 = new CM.Point(-20,0);
        this.p3 = new CM.Point(-10,-10);
    }
    right(){
        this.p1 = new CM.Point(10,10);
        this.p2 = new CM.Point(20,0);
        this.p3 = new CM.Point(10,-10);
    }
    top(){
        this.p1 = new CM.Point(-10,10);
        this.p2 = new CM.Point(0,20);
        this.p3 = new CM.Point(10,10);
    }
    down(){
        this.p1 = new CM.Point(-10,-10);
        this.p2 = new CM.Point(0,-20);
        this.p3 = new CM.Point(10,-10);
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
    move(x,y)
    {
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
       if(distance < 30)
       {
           return true;
       }
       else return false;
    }
    
}

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
            this.speed = 3;
           
        }

        run(){
            this.renderer.setZoom(this.player.height);
            this.tickndraw();

        }
        tickndraw(){

            this.renderer.setZoom(this.player.z);
            this.renderer.clear(); 
            
            this.renderer.updatePos(this.player.position);
            this.world.getScene(this.player.position).forEach(element => {
                this.renderer.draw(element);
            });

            this.world.getObjects().forEach(element =>
            {
                element.tick();
                this.renderer.draw(element);
            });

            this.renderer.draw(this.player);
            var self = this;
            // register next
            //if (this.run && this.stillrun()) {
                requestAnimFrame( function() {
                    self.tickndraw();
                });
            //}
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
            var object = this.world.getNearestObject(this.player.getMidPoint());
            var mounted = this.player.mount(object);
          

        }
        handleInteractions(k){

           switch(""+k)
            {
                case "65" : this.player.ascend(0.01); break;
                case "83" : this.player.descend(0.01); break;
                case "66" : this.player.isMounted() ? this.player.dismount() : this.tryMount();

            }
        }
        handleMove(k,currentlyPressed)
        {
            switch(""+k)
            {
                case "39" : this.player.right(); break;
                case "38" : this.player.down(); break;
                case "37" : this.player.left(); break;
                case "40": this.player.top(); break;
            }
            currentlyPressed.forEach(_=>{
                switch(""+_[0])
                {
                    case "37" : this.moveRight(); break;
                    case "38" : this.moveUp(); break;
                    case "39" : this.moveLeft(); break;
                    case "40": this.moveDown(); break;	
                }
            });
        }
        init(){

                this.player = new CM.CloudPlayer(this.startPos,this.imagerepo.getImage("player"));
                this.world.addObject( new CM.VehicleSprite(this.startPos,this.imagerepo.getImage("blimp"),3,0.5));
                this.world.addObject( new CM.VehicleSprite(new CM.Point(400,400),this.imagerepo.getImage("blimp"),3,0.5));
                
               // this.tryMount();
            

                window.requestAnimFrame = (function(callback) {
                    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
                    function(callback) {
                        window.setTimeout(callback, 1000 / 30);
                    };
                })();
                this.inputHandler.on("letterKeys",this.handleInteractions.bind(this));
                this.inputHandler.on("arrowKeys",this.handleMove.bind(this));
                

                

        }
    }


