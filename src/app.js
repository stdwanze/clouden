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
            this.osd = new CM.OSD(this.renderer,this.imagerepo);
            this.over = false;
           
        }

        run(){
            this.renderer.setZoom(this.player.height);
            this.tickndraw();

        }
        tickndraw(){

            if(!this.over){
                // update renderer
                this.renderer.setZoom(this.player.z);
                this.renderer.clear(); 
                this.renderer.updatePos(this.player.position);
            

                // interacte player with world
                this.tryCollect();

                // draw world
                this.world.getScene(this.player.position).forEach(element => {
                    this.renderer.draw(element);
                });


                // draw movableobjects
                this.world.getObjects().forEach(element =>
                {
                    element.tick(this.player);
                    if(this.player.z >= element.z+0.3)
                    {
                        this.renderer.lighter()
                    }
                    this.renderer.draw(element);
                    this.renderer.restore();
                });

                //draw Player
                this.player.tick();
                this.renderer.draw(this.player);
                
               
                

                var playerScores = this.player.getScores().getAll();
                this.osd.displayScores( playerScores,"BOTTOM-LEFT");

                if(this.player.isMounted()){
                    var vScores = this.player.getMountScores().getAll();
                    this.osd.displayScores(vScores,"BOTTOM-RIGHT");
                }
            }
            else
            {
                this.renderer.fillText("GAME OVER",this.player.position.x,this.player.position.y, 50);
            }
            this.osdocu.draw(this.renderer); //, this.player.position);
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
            var object = this.world.getNearestObject(this.player.getMidPoint(),"interactable");
            var mounted = this.player.mount(object);
          

        }
        tryCollect(){
            var obj =this.world.getNearestObject(this.player.position,"collectable");
            if(obj == null) return;
            var collected = this.player.collect(obj);
            if(collected) this.world.removeObject(obj);
        }
        handleInteractions(k){

           switch(""+k)
            {
                case "65" : this.player.ascend(0.01); break;
                case "83" : this.player.descend(0.01); break;
                case "66" : {
                    this.player.isMounted() ? this.player.dismount() : this.tryMount();
                    break;
                }
                case "67" : this.player.fire(); break;

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
        gameOver(){
            this.over = true;
        }
        init(){

                this.world.setChunksCachedCallback(CM.ADDENEMYMAKER(this.world,this.imagerepo));

                this.player = new CM.CloudPlayer(this.startPos,this.imagerepo.getImage("playerAni"),this.imagerepo.getImage("playerAniLeft"));
                this.player.setTileInfoRetrieve(CM.TILEACCESS(this.world));
                this.player.setFireBallCreator(CM.FireBallCreator(this.world,this.imagerepo));
                this.world.applyForTile(CM.COLLECTABLEMAKER(this.world, this.imagerepo));
                this.world.addObject( new CM.Collectable(this.startPos.clone().move(20,20),this.imagerepo.getImage("coin_10"),"COINS",10,0.2));
                this.world.addObject( new CM.Blimp(this.startPos,this.imagerepo.getImage("blimp")));
                
                var dragon = new CM.Dragon(new CM.Point( 150,150),this.imagerepo.getImage("dragon_small"));
                dragon.setFireBallCreator(CM.FireBallCreator(this.world,this.imagerepo));
                dragon.setRemover(this.world.removeObject.bind(this.world));
                this.world.addObject(dragon);

                this.world.addHitable("player", this.player);
                this.world.addHitable("dragon1", dragon);
                

                
                CM.VEHICLEDEATHMAKER(this,this.world,this.player);

                window.requestAnimFrame = (function(callback) {
                    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
                    function(callback) {
                        window.setTimeout(callback, 1000 / 30);
                    };
                })();
                this.inputHandler.on("letterKeys",this.handleInteractions.bind(this));
                this.inputHandler.on("arrowKeys",this.handleMove.bind(this));
                this.inputHandler.on("keyup", this.handleStop.bind(this));

                this.osdocu = new CM.OnScreenDocu(new CM.Point(-150,-100));


        }
    }


