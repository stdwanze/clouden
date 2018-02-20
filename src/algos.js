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
CM.FireBallCreator = function (world, repo)
{
    return function (location, z, typename)
    {
        if(typename == "HANDGUN")
        {
     
            var img = repo.getImage("fireball_small");       
            var fb = new CM.FireBall(location,img,z,100,new CM.Point(3,0),0.1);
        
        }
        else{
            
            var img = repo.getImage("fireball_small");
            var fb = new CM.FireBall(location,img,z,250,new CM.Point(5,0),0.2);
        }
        fb.registerRangeEx(function (item){
            world.removeObject(item);
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

        if (i<(mapWidth*2)||i%mapWidth<2||i%mapWidth>(mapWidth-3)||i>(mapWidth*mapheight)-((mapWidth*2)+1)){

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
        
    }
    return tileArray;

}
CM.AnnotateWorld = function (tileArray, widthInTiles)
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
            return curr !== other;
        }
        else return false;
    }
    var ret = [];
    for(var i = 0; i < tileArray.length ; i++)
    {
        var tile = new CM.TileInfo(
            tileArray[i],
            isDiff(tileArray[i],get(-widthInTiles,i,tileArray)),
            isDiff(tileArray[i],get(-1,i,tileArray)),
            isDiff(tileArray[i],get(1,i,tileArray)),
            isDiff(tileArray[i],get(widthInTiles,i,tileArray)),
            Math.random() > 0.8 &&  tileArray[i] ? true: false
        );
        ret.push(tile);
    }
    return ret;
}

CM.TILECREATOR = function (imagerepo,widthInTiles)
{
    var array = CM.BuildWorld(widthInTiles);
    array = CM.AnnotateWorld(array, widthInTiles);

    return function(i,k,location,tileSize)
    {
        
        var info = array[k*widthInTiles+i];
        if(i< 2 && k < 2)
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
CM.COLLECTABLEMAKER = function  (world, imagerepo){ 
    return function (tile){
        if(tile.isLand())
        {
            if(Math.random() < 0.01)
            {
                var rand = Math.random() ;
                if(rand > 0.75)
                {
                    world.addObject( new CM.Collectable(tile.location.clone().move(20,20),imagerepo.getImage("ammo_10"),"AMMO",10));
                    return;
                }
                if(rand > 0.5)
                {
                    world.addObject( new CM.Collectable(tile.location.clone().move(20,20),imagerepo.getImage("health_10"),"HEALTH",10));
                    return;
                }
                if(rand > 0.25)
                {
                    world.addObject( new CM.Collectable(tile.location.clone().move(20,20),imagerepo.getImage("coin_10"),"COINS",10));
                    return;
                }
                else {
                 //   world.addObject( new CM.Coin(tile.location.clone().move(20,20),imagerepo.getImage("coin_10"),10));
                }
            }
        }
    }
}