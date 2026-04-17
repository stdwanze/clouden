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
    return function (location, z, typename, movementvector, sourceId, bowLevel)
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
            fb.strength = 4 + (bowLevel || 0);

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
        fb.registerIslandRetriever(function() {
            return world.getObjects().filter(function(o) { return o instanceof CM.FloatingIsland; });
        });
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

        rndm=(CM.rng()*101);
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
            CM.rng() > 0.8 &&  tileArray[i] ? true: false,
            chunkBorderArea,
            color
        );
        ret.push(tile);
    }
    return ret;
}

CM.BiomeMap = function(chunksWide, chunksHigh) {
    var spawnBiome = Math.floor(CM.rng() * 3); // 0–2, never snow at spawn
    var MAX_DIST   = Math.sqrt(chunksWide * chunksWide + chunksHigh * chunksHigh);
    var map = new Uint8Array(chunksWide * chunksHigh);

    // initial assignment: diagonal gradient from spawn corner + noise
    for (var cy = 0; cy < chunksHigh; cy++) {
        for (var cx = 0; cx < chunksWide; cx++) {
            var dist    = Math.sqrt(cx * cx + cy * cy) / MAX_DIST;
            var shifted = spawnBiome / 3 + dist * (1 - spawnBiome / 3);
            // deterministic per-chunk noise ±0.10
            var h = (((cx * 1664525 + cy * 1013904223) >>> 0) % 1000) / 1000;
            var noise = h * 0.20 - 0.10;
            var biome = Math.min(3, Math.max(0, Math.floor((shifted + noise) * 4)));
            map[cy * chunksWide + cx] = biome;
        }
    }

    // clamp pass: no two neighbors may differ by more than 1 step
    var changed = true;
    while (changed) {
        changed = false;
        for (var cy2 = 0; cy2 < chunksHigh; cy2++) {
            for (var cx2 = 0; cx2 < chunksWide; cx2++) {
                var idx = cy2 * chunksWide + cx2;
                var b   = map[idx];
                var nb  = [];
                if (cx2 > 0)              nb.push(map[idx - 1]);
                if (cx2 < chunksWide - 1) nb.push(map[idx + 1]);
                if (cy2 > 0)              nb.push(map[idx - chunksWide]);
                if (cy2 < chunksHigh - 1) nb.push(map[idx + chunksWide]);
                for (var n = 0; n < nb.length; n++) {
                    if (Math.abs(b - nb[n]) > 1) {
                        b = nb[n] + Math.sign(b - nb[n]);
                        map[idx] = b;
                        changed = true;
                    }
                }
            }
        }
    }

    return {
        spawnBiome: spawnBiome,
        biomeAt: function(cx, cy) {
            if (cx < 0 || cy < 0 || cx >= chunksWide || cy >= chunksHigh) return 0;
            return map[cy * chunksWide + cx];
        }
    };
};

CM.MountainMap = function(totalTilesWide, totalTilesHigh, landArray) {
    var map = new Uint8Array(totalTilesWide * totalTilesHigh);
    var numRidges = 60;
    var numSmallRidges = 80; // small outcroppings ~5 long, ~3 wide

    function isLandTile(tx, ty) {
        if (!landArray) return true; // no filter if array not provided
        if (tx < 0 || ty < 0 || tx >= totalTilesWide || ty >= totalTilesHigh) return false;
        return !!landArray[ty * totalTilesWide + tx];
    }

    function mark(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= totalTilesWide || ty >= totalTilesHigh) return;
        if (!isLandTile(tx, ty)) return;
        map[ty * totalTilesWide + tx] = 1;
    }

    for (var r = 0; r < numRidges; r++) {
        // avoid spawn area (first 15×15 tiles)
        var cx, cy;
        do {
            cx = Math.floor(CM.rng() * totalTilesWide);
            cy = Math.floor(CM.rng() * totalTilesHigh);
        } while (cx < 15 && cy < 15);

        var length  = 10 + Math.floor(CM.rng() * 11); // 10–20
        var maxW    = 1  + Math.floor(CM.rng() * 4);  // 1–4
        // primary direction — 8 possible angles for more variety
        var angle   = Math.floor(CM.rng() * 8);
        var adx     = [1,1,0,-1,-1,-1,0,1][angle];
        var ady     = [0,1,1,1,0,-1,-1,-1][angle];

        for (var step = 0; step < length; step++) {
            // organic drift: occasionally nudge the path perpendicular
            if (step > 0 && CM.rng() < 0.25) {
                cx += ady;
                cy -= adx;
            }
            cx += adx;
            cy += ady;
            // minimum width 2 so there are no single-tile gaps to slip through
            var t   = step / length;
            var env = Math.sin(t * Math.PI);
            var w   = Math.max(2, Math.round(maxW * env + CM.rng() * 0.8));
            mark(cx, cy);
            for (var wi = 1; wi < w; wi++) {
                mark(cx + ady * wi,  cy - adx * wi);
                mark(cx - ady * wi,  cy + adx * wi);
            }
        }
    }

    // small outcroppings
    for (var sr = 0; sr < numSmallRidges; sr++) {
        var scx, scy;
        do {
            scx = Math.floor(CM.rng() * totalTilesWide);
            scy = Math.floor(CM.rng() * totalTilesHigh);
        } while (scx < 15 && scy < 15);

        var sangle = Math.floor(CM.rng() * 8);
        var sadx   = [1,1,0,-1,-1,-1,0,1][sangle];
        var sady   = [0,1,1,1,0,-1,-1,-1][sangle];
        var slen   = 3 + Math.floor(CM.rng() * 4); // 3–6

        for (var sstep = 0; sstep < slen; sstep++) {
            scx += sadx;
            scy += sady;
            mark(scx, scy);
            mark(scx + sady,  scy - sadx);
            mark(scx - sady,  scy + sadx);
        }
    }

    // dilation pass: fill any tile that has mountain neighbours on two opposite sides
    // this closes single-tile gaps left by drift steps
    var dilated = new Uint8Array(map);
    for (var dy = 1; dy < totalTilesHigh - 1; dy++) {
        for (var dx = 1; dx < totalTilesWide - 1; dx++) {
            if (dilated[dy * totalTilesWide + dx]) continue;
            var idx = dy * totalTilesWide + dx;
            var n = map[(dy-1)*totalTilesWide+dx], s = map[(dy+1)*totalTilesWide+dx];
            var w2 = map[dy*totalTilesWide+(dx-1)], e = map[dy*totalTilesWide+(dx+1)];
            var nw = map[(dy-1)*totalTilesWide+(dx-1)], se = map[(dy+1)*totalTilesWide+(dx+1)];
            var ne = map[(dy-1)*totalTilesWide+(dx+1)], sw = map[(dy+1)*totalTilesWide+(dx-1)];
            if ((n&&s) || (w2&&e) || (nw&&se) || (ne&&sw)) dilated[idx] = 1;
        }
    }

    return {
        isMountain: function(tx, ty) {
            if (tx < 0 || ty < 0 || tx >= totalTilesWide || ty >= totalTilesHigh) return false;
            return dilated[ty * totalTilesWide + tx] === 1;
        }
    };
};

CM.TILECREATOR = function (imagerepo,widthInTiles)
{
    var biomeNames = ['tile_land_desert', 'tile_land_gras', 'tile_land_gras_dark', 'tile_land_snow'];
    var tilesPerChunk = 30;

    var index = Math.floor(CM.rng()*10);
    var color = [ "#F00000", "0F0000", "#00F000", "#000F00", "#0000F0", "#00000F", "#FF0000", "00FF00", "0000FF", "#FFFF00", "#FFFFFF", "#000000"];
    var array = CM.BuildWorld(widthInTiles);
    array = CM.AnnotateWorld(array, widthInTiles, color[index]);

    return function(i,k,location,tileSize, worldx, worldy)
    {
        var info = array[(worldy+k)*widthInTiles+(i+worldx)];

        // guarantee spawn tiles are walkable land
        if(worldx == 0 && worldy == 0 && i < 2 && k < 2) {
            info.isLand = true;
            if(i == 1) info.borderRight = true;
            if(k == 1) info.borderDown = true;
        }

        var chunkX = Math.floor(worldx / tilesPerChunk);
        var chunkY = Math.floor(worldy / tilesPerChunk);
        var biomeIndex = CM.biomeMap ? CM.biomeMap.biomeAt(chunkX, chunkY) : 0;
        var tileX = worldx + i;
        var tileY = worldy + k;
        var isMountain = !!(info.isLand && CM.mountainMap && CM.mountainMap.isMountain(tileX, tileY));

        if (isMountain) {
            info.isLand = false;
            info.isMountain = true;
        }

        // Cave entrance: rare land tile far from spawn
        var distFromSpawn = Math.sqrt(tileX * tileX + tileY * tileY);
        if (info.isLand && !isMountain && distFromSpawn > 30 && CM.rng() < 0.0004) {
            info.isCaveEntrance = true;
            CM.caveEntrancePositions.push({ tileX: tileX, tileY: tileY });
        }

        var c = !info.isLand && !isMountain ? "tile_water" : biomeNames[biomeIndex];
        var image = imagerepo.getImage(c);
        var ts = new CM.TileSprite(new CM.Point(location.x+i*tileSize,location.y+k*tileSize),tileSize,image,info);
        if (isMountain) ts.addOverlay(imagerepo.getImage("tile_mountain"));

        if(info.isLand)
        {
            if(info.borderTop)  ts.addBorder(imagerepo.getImage("border_land_water_top"),   new CM.Point(0,-2));
            if(info.borderDown) ts.addBorder(imagerepo.getImage("border_land_water_down"),  new CM.Point(0,24));
            if(info.borderLeft) ts.addBorder(imagerepo.getImage("border_land_water_left"),  new CM.Point(0,0));
            if(info.borderRight)ts.addBorder(imagerepo.getImage("border_land_water_right"), new CM.Point(26,0));

            var num = CM.rng() > 0.5 ? "1" : "2";
            if(info.decals) ts.addDecals(imagerepo.getImage("decal_land_vegetation_"+num), new CM.Point(2+Math.floor(CM.rng()*10),2+Math.floor(CM.rng()*10)));
        }

        if (info.isCaveEntrance) ts.addOverlay(imagerepo.getImage('tile_cave_entrance'));

        return ts;
    }

}

CM.CAVE_TILECREATOR = function(imagerepo, widthInTiles, entrancePositions) {
    var array = CM.BuildWorld(widthInTiles);
    array = CM.AnnotateWorld(array, widthInTiles, '#222');

    return function(i, k, location, tileSize, worldx, worldy) {
        var info = array[(worldy + k) * widthInTiles + (i + worldx)];
        var tileX = worldx + i;
        var tileY = worldy + k;

        // Spawn area always walkable
        if (worldx === 0 && worldy === 0 && i < 3 && k < 3) info.isLand = true;

        // Exit tiles: positions matching surface entrances
        info.isCaveExit = (entrancePositions || []).some(function(ep) {
            return ep.tileX === tileX && ep.tileY === tileY;
        });
        if (info.isCaveExit) info.isLand = true;

        var imgKey = info.isLand ? 'tile_cave_floor' : 'tile_cave_rock';
        var image = imagerepo.getImage(imgKey);
        var ts = new CM.TileSprite(
            new CM.Point(location.x + i * tileSize, location.y + k * tileSize),
            tileSize, image, info
        );

        if (info.isCaveExit) ts.addOverlay(imagerepo.getImage('tile_cave_exit'));

        return ts;
    };
};

CM.CAVE_COLLECTABLEMAKER = function(caveWorld, imagerepo) {
    return function(tile) {
        if (!tile.isLand() || tile.info.isCaveExit) return;
        var rand = CM.rng();

        if (rand < 0.06) {
            caveWorld.addObject(new CM.Collectable(
                tile.location.clone().move(10, 10),
                imagerepo.getImage('crystal'), 'CRYSTAL', 1, 0.5
            ));
        } else if (rand < 0.062 && !CM.skyMapSpawned) {
            CM.skyMapSpawned = true;
            caveWorld.addObject(new CM.Collectable(
                tile.location.clone().move(10, 10),
                imagerepo.getImage('skymap'), 'SKYMAP', 1, 0.8
            ));
        } else if (rand < 0.063) {
            var chest = new CM.Chest(tile.location.clone().move(8, 8), imagerepo.getImage('chest'));
            chest.setRemover(caveWorld.removeObject.bind(caveWorld));
            caveWorld.addObject(chest);
        }
    };
};

CM.ADDENEMYMAKER_CAVE = function(caveWorld, imagerepo) {
    function makeCaveCrab(x1, y1, idx) {
        var key = 'cavecrab' + x1 + '_' + y1 + '_' + idx;
        if (caveWorld.getHitablesByKey(key)) return;
        var c = caveWorld.getChunkByIndeces(x1, y1);
        if (!c) return;
        var landTiles = c.getTiles().filter(function(t) { return t.isLand() && !t.info.isCaveExit; });
        if (landTiles.length === 0) return;
        var tile = landTiles[Math.floor(CM.rng() * landTiles.length)];

        var crab = new CM.CaveCrab(tile.location.clone(), imagerepo.getImage('crab'));
        crab.setTileInfoRetriever(CM.TILEACCESS(caveWorld));
        crab.setRemover(caveWorld.removeObject.bind(caveWorld));
        crab.setScarecrowGetter(function() { return []; });
        caveWorld.addObject(crab);
        caveWorld.addHitable(key, crab);
    }

    return function(x, y) {
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                var cx = x + dx, cy = y + dy;
                if (cx < 0 || cy < 0) continue;
                for (var i = 0; i < 2; i++) makeCaveCrab(cx, cy, i);
            }
        }
    };
};

CM.CLOUDGEN = function (world,repo){

    return  function (startPosX,startPosY)
        {
            var maxX = world.getSizeX();
            var maxY = world.getSizeY();
            var startPos = new CM.Point(startPosX,startPosY);

            var layer = CM.WindLayers[Math.floor(CM.rng() * CM.WindLayers.length)];
            var z = layer.zMin + CM.rng() * (layer.zMax - layer.zMin);
            var wx = layer.wind.x;
            var wy = layer.wind.y;
            var speed = 0.5 + CM.rng() * 1.5;

            var c = new CM.VehicleSprite(new CM.Point(startPos.x,startPos.y), repo.getImage("cloud"), z, 1);
            c.setTicker(function(s, dx, dy, sp) {
                return function(v) {
                    v.move(dx * sp, dy * sp);
                    if(dx < 0 && v.position.x < -500)  v.position.x = s.x + maxX;
                    if(dx > 0 && v.position.x > maxX + 500) v.position.x = s.x - maxX;
                    if(dy < 0 && v.position.y < -500)  v.position.y = s.y + maxY;
                    if(dy > 0 && v.position.y > maxY + 500) v.position.y = s.y - maxY;
                };
            }(startPos, wx, wy, speed));
            return c;
        }
}
CM.ADDENEMYMAKER = function (world, imagerepo)
{
    function getScarecrows() {
        return world.getObjects().filter(function(o) { return o.isScarecrow; });
    }

    function makeDragon (location, i)
    {
        var dragon = new CM.Dragon(location.clone(), { right: imagerepo.getImage("dragon"), left: imagerepo.getImage("dragonLeft") });
        dragon.setFireBallCreator(CM.FireBallCreator(world,imagerepo));
        dragon.setRemover(world.removeObject.bind(world));
        dragon.setScarecrowGetter(getScarecrows);
        world.addObject(dragon);

        world.addHitable("dragon"+i, dragon);

    }

    function makeGroundEnemy(x1, y1, i)
    {
        var c = world.getChunkByIndeces(x1, y1);
        var landTiles = c.getTiles().filter(function(t) { return t.isLand(); });
        if (landTiles.length == 0) return;
        var tile = landTiles[Math.floor(CM.rng() * landTiles.length)];

        var enemy = new CM.GroundEnemy(tile.location.clone(), imagerepo.getImage("crab"));
        enemy.setTileInfoRetriever(CM.TILEACCESS(world));
        enemy.setRemover(world.removeObject.bind(world));
        enemy.setScarecrowGetter(getScarecrows);
        world.addObject(enemy);
        world.addHitable("groundenemy" + i, enemy);
    }

    function perChunk(x1,y1)
    {
        if(x1 < 0 || y1 < 0) return;
        var c = world.getChunkByIndeces(x1,y1);
        var chunkCenter = new CM.Point(
            c.locationbase.x + c.tilesize * c.widthInTiles / 2,
            c.locationbase.y + c.tilesize * c.widthInTiles / 2
        );
        var scarecrows = world.getObjects().filter(function(o) { return o.isScarecrow; });
        for (var s = 0; s < scarecrows.length; s++) {
            if (CM.distance(chunkCenter, scarecrows[s].position) < scarecrows[s].repelRadius) return;
        }
        for(var i = 0; i < 3; i++)
        {
            var dragon = world.getHitablesByKey("dragon"+x1+"_"+y1+"_"+i);
            if(dragon == undefined)
            {
                var locbase = c.locationbase.clone();
                var xOffset = CM.rng()*c.tilesize*c.widthInTiles;
                var yOffSet =CM.rng()*c.tilesize*c.widthInTiles;
                makeDragon(locbase.move(xOffset,yOffSet),""+x1+"_"+y1+"_"+i)
            }
            var ge = world.getHitablesByKey("groundenemy"+x1+"_"+y1+"_"+i);
            if(ge == undefined)
            {
                makeGroundEnemy(x1, y1, ""+x1+"_"+y1+"_"+i);
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
            if(CM.rng() < 0.05)
            {
                var rand = CM.rng() ;
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
CM.MINEABLEMAKER = function (world, imagerepo) {
    var getTile = CM.TILEACCESS(world);
    function spawnCluster(type, centerLocation, count) {
        var img = type === 'STONE' ? imagerepo.getImage('mineable_rock')
                : type === 'WOOD'  ? imagerepo.getImage('mineable_tree')
                : null;
        var spread = 48;
        for (var i = 0; i < count; i++) {
            var ox = (CM.rng() * 2 - 1) * spread;
            var oy = (CM.rng() * 2 - 1) * spread;
            var pos = centerLocation.clone().move(ox, oy);
            var spawnTile = getTile(pos);
            if (!spawnTile || !spawnTile.isLand()) continue;
            var m;
            if (type === 'REED') {
                m = new CM.Reed(pos);
            } else if (type === 'BERRY_RED' || type === 'BERRY_BLUE') {
                m = new CM.BerryBush(pos, type);
            } else {
                m = new CM.Mineable(pos, type, img);
            }
            m.setRemover(world.removeObject.bind(world));
            world.addObject(m);
        }
    }
    return function (tile) {
        if (!tile.isLand()) return;
        var info = tile.info;
        var isWaterEdge = info.borderTop || info.borderLeft || info.borderRight || info.borderDown;
        var rand = CM.rng();

        if (isWaterEdge) {
            if (rand < 0.10) {
                spawnCluster('REED', tile.location, 1 + Math.floor(CM.rng() * 3));
            }
            return;
        }

        if (rand < 0.01) {
            spawnCluster('STONE', tile.location, 1 + Math.floor(CM.rng() * 3));
        } else if (rand < 0.03) {
            spawnCluster('WOOD', tile.location, 1 + Math.floor(CM.rng() * 5));
        } else if (rand < 0.04) {
            var type = CM.rng() < 0.5 ? 'BERRY_RED' : 'BERRY_BLUE';
            spawnCluster(type, tile.location, 1 + Math.floor(CM.rng() * 2));
        }
    };
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
        var safePoints = world.getObjects().filter(function(o) { return o.isSafePoint; });
        if (safePoints.length === 0) {
            app.gameOver();
            return;
        }
        var nearest = safePoints.reduce(function(best, sp) {
            return CM.distance(player.position, sp.position) < CM.distance(player.position, best.position) ? sp : best;
        });
        app.paused = true;
        app.respawnDialog = true;
        app.respawnAction = function() {
            world.getHitables().forEach(function(obj) {
                if (obj === player) return;
                if (CM.distance(nearest.position, obj.position) < 32) {
                    world.removeObject(obj);
                }
            });
            player.position.x = nearest.position.x;
            player.position.y = nearest.position.y;
            player.spriteright.position.x = nearest.position.x;
            player.spriteright.position.y = nearest.position.y;
            player.spriteleft.position.x  = nearest.position.x;
            player.spriteleft.position.y  = nearest.position.y;
            player.getScores().get("HEALTH").score = 3;
            player.dead = false;
            CM.SaveLoad.save(app);
            app.notify('Respawn an Blockh\u00fctte', 120);
        };
    }
}