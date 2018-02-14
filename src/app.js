CM = window.CM || {};


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
                if(this.player.z >= element.z+0.3)
                {
                    this.renderer.lighter()
                }
                this.renderer.draw(element);
                this.renderer.restore();
            });

            this.player.tick();
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
        handleStop(k, currentlyPressed)
        {
            if(currentlyPressed.filter(_ => _ == true).length == 0)
            {
                this.player.stop();
            }
        }
        init(){

                this.player = new CM.CloudPlayer(this.startPos,this.imagerepo.getImage("playerAni"),this.imagerepo.getImage("playerAniLeft"));
                this.player.setTileInfoRetrieve(CM.TILEACCESS(this.world));
                this.world.addObject( new CM.VehicleSprite(this.startPos,this.imagerepo.getImage("blimp"),CM.GroundLevel,0.5));
                //this.world.addObject( new CM.VehicleSprite(new CM.Point(400,400),this.imagerepo.getImage("blimp"),CM.GroundLevel,0.5));
            

                window.requestAnimFrame = (function(callback) {
                    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
                    function(callback) {
                        window.setTimeout(callback, 1000 / 30);
                    };
                })();
                this.inputHandler.on("letterKeys",this.handleInteractions.bind(this));
                this.inputHandler.on("arrowKeys",this.handleMove.bind(this));
                this.inputHandler.on("keyup", this.handleStop.bind(this));

                

        }
    }


