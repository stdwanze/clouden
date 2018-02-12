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
CM.TILEACCESS = function (world) {
        return function (location){
        var c = world.getChunk(location);
        if(c) {
            return c.getTile(location);
        }
        return null;
    }
}


CM.TILECREATOR = function (imagerepo)
{
    return function(i,k,location,tileSize)
    {
       
        var c = "";
        if(i< 2 && k < 2)
         {
            c = "tile_land_desert";
           
         }
        else{
             c = Math.random()*100 >50 ? "tile_water" :  "tile_land_desert";
        } 
       // var c = (i+k) % 2 == 0 ? "tile_water" : "tile_land_desert";
        var image = imagerepo.getImage(c);
        return new CM.TileSprite(new CM.Point(location.x+i*tileSize,location.y+k*tileSize),tileSize,image, c=="tile_land_desert");
    }
}
CM.CLOUDGEN = function (world,repo){

    return  function (startPosX,startPosY)
        {
            var maxX = world.getSizeX();
            var startPos = new CM.Point(startPosX,startPosY);
            var c = new CM.VehicleSprite(new CM.Point(startPos.x,startPos.y), repo.getImage("cloud"),2,1);
                c.setTicker( 
                    function (startPos)
                {
                    var s = startPos;
                    return function (v){
                    v.move(-1,0);
                    if(v.position.x < -500){
                    v.move(s.x+maxX,0);
                        console.log("reset");
                    } 
                    };
                }(startPos));
            return c;
        }
}