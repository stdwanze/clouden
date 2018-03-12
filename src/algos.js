CM = window.CM || {};

CM.distance= function (point1, point2)
{
  //  var x =  Math.abs(point1.x - point2.x);
  //  var y = Math.abs(point1.y - point2.y);

    var x = point2.x - point1.x;
    var y = point2.y - point1.y;


    var diff = Math.sqrt(x*x + y*y);

    return diff;
}
CM.getVector = function (start, end, scale)
{
    var dist = CM.distance(start,end);
    var rawx = start.x - end.x;
    var rawy = start.y - end.y;
    
    var x = rawx*-1 / (dist*scale);
    var y = rawy*-1 / (dist*scale);

    return new CM.Point(x,y);
    
}
CM.FireBallCreator = function (world, repo)
{
    return function (location, z, typename, movementvector, sourceId)
    {
        if(typename == "DRAGONFIRE")
        {
            var img = repo.getImage("fireball_small");       
            var fb = new CM.FireBall(location,img,z,100,movementvector,0.1, sourceId);
        
        }
        else if(typename == "HANDGUN")
        {
     
            var img = repo.getImage("fireball_small");       
            var fb = new CM.FireBall(location,img,z,100,movementvector,0.1, sourceId);
        
        }
        else{
            
            var img = repo.getImage("fireball_small");
            var fb = new CM.FireBall(location,img,z,250,movementvector,0.2,sourceId);
        }
        fb.registerRangeEx(function (item){
            world.removeObject(item);
        })
        fb.registerGetHitables(function (getHitables){
            return world.getHitables();
        })
        world.addObject(fb);
    }
}
CM.TILEACCESS = function (world) {
        return function (location){
        var c = world.getChunk(location);
        if(c) {
            return c.getTile(location);
        }
        return null;
    }
}
CM.BuildWorld = function (tilewidth){
    var tileArray = new Array();
    var probabilityModifier = 0;
    var mapWidth=tilewidth;
    var mapheight=tilewidth;
   // var tileSize=10;

    var landMassAmount=2; // scale of 1 to 5
    var landMassSize=3; // scale of 1 to 5




    for (var i = 0; i < mapWidth*mapheight; i++) {

        var probability = 0;
        var probabilityModifier = 0;
        var borderDetected = false;
        if (i<(mapWidth*2)||i%mapWidth<2||i%mapWidth>(mapWidth-3)||i>(mapWidth*mapheight)-((mapWidth*2)+1)){

            borderDetected = true;
            // make the edges of the map water
            probability=0;
        }
        else {

            probability = 15 + landMassAmount;

            if (i>(mapWidth*2)+2){

                // Conform the tile upwards and to the left to its surroundings 
                var conformity =
                    (tileArray[i-mapWidth-1]==(tileArray[i-(mapWidth*2)-1]))+
                    (tileArray[i-mapWidth-1]==(tileArray[i-mapWidth]))+
                    (tileArray[i-mapWidth-1]==(tileArray[i-1]))+
                    (tileArray[i-mapWidth-1]==(tileArray[i-mapWidth-2]));

                if (conformity<2)
                {
                    tileArray[i-mapWidth-1]=!tileArray[i-mapWidth-1];
                }
            }

            // get the probability of what type of tile this would be based on its surroundings 
            probabilityModifier = (tileArray[i-1]+tileArray[i-mapWidth]+tileArray[i-mapWidth+1])*(19+(landMassSize*1.4));
        }

        rndm=(Math.random()*101);
        tileArray[i]=(rndm<(probability+probabilityModifier));
        if(borderDetected) tileArray[i] = false;
    }
    return tileArray;

}
CM.AnnotateWorld = function (tileArray, widthInTiles, color)
{
    
    function get(manipulate,i,array)
    {
        var index = i+manipulate
        if(index >= 0)
        {
            return array[index];
        }
        else return null;
    }
    function isDiff(curr,other)
    {
        if(curr != null && other !=null)
        {
            return curr != other;
        }
        else return false;
    }
    var ret = [];
    var mapWidth = 300;
    var mapheight = 300;
    for(var i = 0; i < tileArray.length ; i++)
    {
        var chunkBorderArea = false;
        if(i%mapWidth > (mapWidth-2))
        {
            chunkBorderArea = true;
        }
        if (i<(mapWidth*2)||i%mapWidth<2||i%mapWidth>(mapWidth-3)||i>(mapWidth*mapheight)-((mapWidth*2)+1)){
            chunkBorderArea = true;
        }
      
        var tile = new CM.TileInfo(
            tileArray[i],
            isDiff(tileArray[i],get(-widthInTiles,i,tileArray)),
            isDiff(tileArray[i],get(-1,i,tileArray)),
            isDiff(tileArray[i],get(1,i,tileArray)),
            isDiff(tileArray[i],get(widthInTiles,i,tileArray)),
            Math.random() > 0.8 &&  tileArray[i] ? true: false,
            chunkBorderArea,
            color
        );
        ret.push(tile);
    }
    return ret;
}

CM.TILECREATOR = function (imagerepo,widthInTiles)
{

    var index = Math.floor(Math.random()*10);
    var color = [ "#F00000", "0F0000", "#00F000", "#000F00", "#0000F0", "#00000F", "#FF0000", "00FF00", "0000FF", "#FFFF00", "#FFFFFF", "#000000"];
    var array = CM.BuildWorld(widthInTiles);
    array = CM.AnnotateWorld(array, widthInTiles, color[index]);

    return function(i,k,location,tileSize, worldx, worldy)
    {
        

      //  var info = worldx != 0 && worldy != 0 ? array[k*worldy*widthInTiles+(i*worldx)]: array[k*widthInTiles+(i)];
        var info =  array[(worldy+k)*widthInTiles+(i+worldx)];
        if(worldx == 0 && worldy == 0 && i< 2 && k < 2)
         {
            c = "tile_land_desert";
            info.isLand = true;
            if(i == 1)info.borderRight = true;
            if(k == 1)info.borderDown = true;
        }
        else{
            c = !info.isLand ? "tile_water" :  "tile_land_desert";
        } 
       // var c = (i+k) % 2 == 0 ? "tile_water" : "tile_land_desert";
        var image = imagerepo.getImage(c);
        var ts =  new CM.TileSprite(new CM.Point(location.x+i*tileSize,location.y+k*tileSize),tileSize,image,info);
   
        if(info.isLand)
        {
            if(info.borderTop) ts.addBorder(imagerepo.getImage("border_land_water_top"), new CM.Point(0,-2));
            if(info.borderDown) ts.addBorder(imagerepo.getImage("border_land_water_down"), new CM.Point(0,24));
            if(info.borderLeft) ts.addBorder(imagerepo.getImage("border_land_water_left"), new CM.Point(0,0));
            if(info.borderRight) ts.addBorder(imagerepo.getImage("border_land_water_right"), new CM.Point(26,0));

            var num = Math.random() >0.5? "1": "2";
            if(info.decals) ts.addDecals(imagerepo.getImage("decal_land_vegetation_"+num), new CM.Point(2+Math.floor(Math.random()*10),2+Math.floor(Math.random()*10)));
        }

        return ts;
    }

}
CM.CLOUDGEN = function (world,repo){

    return  function (startPosX,startPosY)
        {
            var maxX = world.getSizeX();
            var startPos = new CM.Point(startPosX,startPosY);
            var c = new CM.VehicleSprite(new CM.Point(startPos.x,startPos.y), repo.getImage("cloud"),CM.SkyLevel,1);
                c.setTicker( 
                    function (startPos,speed)
                {
                    var s = startPos;
                    return function (v){
                    v.move(-1*speed,0);
                    if(v.position.x < -500){
                    v.move(s.x+maxX,0);
                        console.log("reset");
                    } 
                    };
                }(startPos, Math.random()*5));
            return c;
        }
}
CM.ADDENEMYMAKER = function (world, imagerepo)
{
    function makeDragon (location, i)
    {
        var dragon = new CM.Dragon(location.clone(),imagerepo.getImage("dragon_small"));
        dragon.setFireBallCreator(CM.FireBallCreator(world,imagerepo));
        dragon.setRemover(world.removeObject.bind(world));
        world.addObject(dragon);

        world.addHitable("dragon"+i, dragon);
     
    }

    function perChunk(x1,y1)
    {
        if(x1 < 0 || y1 < 0) return;
        var c = world.getChunkByIndeces(x1,y1);
        for(var i = 0; i < 3; i++)
        {
            var dragon = world.getHitablesByKey("dragon"+x1+"_"+y1+"_"+i);
            if(dragon == undefined)
            {
                var locbase = c.locationbase.clone();
                var xOffset = Math.random()*c.tilesize*c.widthInTiles;
                var yOffSet =Math.random()*c.tilesize*c.widthInTiles;
                makeDragon(locbase.move(xOffset,yOffSet),""+x1+"_"+y1+"_"+i)
            }
        }
      
    }
    return function (x,y)
    {
        //1 2 3
        //4 x 5
        //6 7 8


        // 1
        perChunk(x-1,y-1);
        // 2
        perChunk(x,y-1);
        // 3
        perChunk(x+1,y-1);
        // 4
        perChunk(x-1, y);
        // 5
        perChunk(x+1,y);
        // 6
        perChunk(x-1,y+1);
        // 7
        perChunk(x,y+1);
        // 8
        perChunk(x+1,y+1);


    }
}
CM.COLLECTABLEMAKER = function  (world, imagerepo){ 
    return function (tile){
        if(tile.isLand())
        {
            if(Math.random() < 0.05)
            {
                var rand = Math.random() ;
                if(rand > 0.75)
                {
                    world.addObject( new CM.Collectable(tile.location.clone().move(20,20),imagerepo.getImage("ammo_10"),"AMMO",10,0.4));
                    return;
                }
                if(rand > 0.5)
                {
                    world.addObject( new CM.Collectable(tile.location.clone().move(20,20),imagerepo.getImage("health_10"),"HEALTH",10,0.4));
                    return;
                }
                if(rand > 0.25)
                {
                    world.addObject( new CM.Collectable(tile.location.clone().move(20,20),imagerepo.getImage("coin_10"),"COINS",10,0.2));
                    return;
                }
                else {
                 
                       world.addObject( new CM.Collectable(tile.location.clone().move(20,20),imagerepo.getImage("fuel_10"),"FUEL",20,0.4));
                }
            }
        }
    }
}
CM.VEHICLEDEATHMAKER = function (app, world, player)
{
    CM.VEHICLEDEATH =  function (vehicle)
    {
        function down (){
            player.descend(0.01);
            if(player.z != CM.GroundLevel)
            {
                setTimeout(down,20);
            }
            else
            {
                player.dismount();
                if(!world.getChunk(player.position).getTile(player.position).isLand())
                {
                    app.gameOver();
                }
            }
        }

        player.getMountScores().get("FUEL").reduce(4000);
        down();

    }
    CM.PLAYERDEATH = function (player)
    {
        app.gameOver();
    }
}