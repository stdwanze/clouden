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
            this.speed = 1;
            this.osd = new CM.OSD(this.renderer,this.imagerepo);
            this.over = false;
            this.paused = false;
            this.inventory = new CM.Inventory(this.imagerepo);
            this.notification = '';
            this.notificationFrames = 0;
           
        }

        run(){
            this.renderer.setZoom(this.player.height);
            this.tickndraw();

        }
        tickndraw(){
            var self = this;

            if(!this.paused){
                if(!this.over){
                    // update renderer
                    this.renderer.setZoom(this.player.z);
                    this.renderer.clear();
                    this.renderer.updatePos(this.player.position);
                    this.renderer.drawWaterBackground(this.imagerepo.getImage("tile_water"));


                    // handle movement every frame for smooth input
                    this.handleMove(null, this.inputHandler.calcCurrentlyPressed());

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

                    // hit flash overlay
                    if(this.player.hitFlashFrames > 0) {
                        var alpha = (this.player.hitFlashFrames / 20) * 0.25;
                        this.renderer.drawRectangleStatic(0, 0, this.renderer.getScreenWidth(), this.renderer.getScreenHeight(), 'rgba(220,0,0,' + alpha + ')');
                    }




                    var playerScores = this.player.getScores().getAll();
                    this.osd.displayScores( playerScores,"BOTTOM-LEFT");

                    if(this.player.isMounted()){
                        var vScores = this.player.getMountScores().getAll();
                        this.osd.displayScores(vScores,"BOTTOM-RIGHT");
                        CM.Sound.fuelWarning(this.player.getMountScores().get("FUEL"));
                    }
                }
                else
                {
                    this.renderer.fillText("GAME OVER",this.player.position.x,this.player.position.y, 50);
                }
            }

            this.inventory.draw(this.renderer);
            this.osdocu.draw(this.renderer);
            if (this.notificationFrames > 0) {
                var alpha = Math.min(1, this.notificationFrames / 20);
                var nx = Math.floor(this.renderer.getScreenWidth() / 2) - 80;
                var ny = 40;
                this.renderer.drawRectangleStatic(nx - 10, ny - 20, 190, 30, 'rgba(0,0,0,' + (alpha * 0.6) + ')');
                this.renderer.fillTextStaticColor(this.notification, nx, ny, 16, 'rgba(200,240,200,' + alpha + ')');
                this.notificationFrames--;
            }
            requestAnimFrame( function() {
                self.tickndraw();
            });
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
        tryMine(){
            var obj = this.world.getNearestObject(this.player.position, "mineable");
            if (!obj) return;
            if (CM.distance(this.player.getMidPoint(), obj.getMidPoint()) > 40) return;
            var type = obj.resourceType;
            var depleted = obj.mine();
            if (depleted) this.inventory.addItem(type);
        }
        tryCollect(){
            var obj =this.world.getNearestObject(this.player.position,"collectable");
            if(obj == null) return;
            var collected = this.player.collect(obj);
            if(collected) { this.world.removeObject(obj); CM.Sound.play('collect'); }
        }
        handleInteractions(k){

           switch(""+k)
            {
                case "65" : this.player.ascend(0.03); break;
                case "83" : this.player.descend(0.03); break;
                case "66" : {
                    if (this.player.isMounted()) { this.player.dismount(); CM.Sound.play('dismount'); CM.Sound.stop('blimp_hum'); }
                    else { this.tryMount(); CM.Sound.play('mount'); CM.Sound.play('blimp_hum'); }
                    break;
                }
                case "67" : this.player.fire(); break;
                case "69" : this.tryMine(); break;
                case "73" : this.inventory.toggle(); this.paused = this.inventory.isOpen(); break;
                case "76" : CM.SaveLoad.save(this); this.notify('Gespeichert!'); break;
                case "77" : CM.Sound.toggleMute(); break;

            }
        }
        handleMove(k,currentlyPressed)
        {
            var moving = false;
            currentlyPressed.forEach(_=>{
                switch(""+_[0])
                {
                    case "37" : this.moveRight(); moving = true; break;
                    case "38" : this.moveUp();    moving = true; break;
                    case "39" : this.moveLeft();  moving = true; break;
                    case "40" : this.moveDown();  moving = true; break;
                }
            });
            if (moving && !this.player.isMounted()) CM.Sound.footstep();
            else if (!moving) CM.Sound.resetFootstep();
        }
        handleStop(k, currentlyPressed)
        {
            if(currentlyPressed.filter(_ => _ == true).length == 0)
            {
                this.player.stop();
            }
        }
        notify(text) {
            this.notification = text;
            this.notificationFrames = 120;
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
                this.world.applyForTile(CM.MINEABLEMAKER(this.world, this.imagerepo));
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
                this.inputHandler.on("keyup", this.handleStop.bind(this));
                this.inputHandler.on("keydown", (k) => {
                    if ("" + k === "186") { // Ö on German keyboard
                        CM.SaveLoad.clear();
                        this.notify('Spielstand gelöscht');
                    }
                });

                this.osdocu = new CM.OnScreenDocu(new CM.Point(-150,-100), this.imagerepo);
                document.getElementById('helpBtn').addEventListener('click', () => this.osdocu.toggle());

                if (CM.SaveLoad.load(this)) this.notify('Spielstand geladen');


        }
    }


