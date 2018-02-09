
CM = window.CM || {}
CM.TILECREATOR = function (imagerepo)
{
    return function(i,k,location,tileSize)
    {
        var c = (i+k) % 2 == 0 ? "tile_water" : "tile_land_desert";
        var image = imagerepo.getImage(c);
        return new CM.TileSprite(new CM.Point(location.x+i*tileSize,location.y+k*tileSize),tileSize,image);
    }
}
CM.Chunk = class Chunk {
    constructor(location/*point*/, widthInTiles, sizeOfTile, tileCreator){
        this.locationbase = location;
        this.tilesize = sizeOfTile;
        this.widthInTiles = widthInTiles;
        this.tiles = [];
        this.init(tileCreator);


    }
    init(tileCreator){

        for(var i = 0 ; i < this.widthInTiles; i++)
        {
            
            var row = [];
            for(var k = 0 ; k < this.widthInTiles; k++)
            {

                var tile = tileCreator(i,k,this.locationbase, this.tilesize);
                row.push(tile);
            } 
            this.tiles.push(row);
        }
    }
    getTiles(){
        
        var ret = [].concat(...this.tiles);
        return ret;
    }
    // setupTile(x,y,tiledata)
    // {

    // }
}
CM.World = class World{

    constructor(sizeX,sizeY,tileCreator){
        
        if(tileCreator != null){ this.tileCreator = tileCreator;}
        else{
            this.tileCreator = CM.TILECREATOR;
        }
        this.TILESIZE = 100;
        this.CHUNKWIDTHINTILES = 10;

        this.world = [];
        this.objects =[];
        this.cachedHolder = {};
        this.lastX = -1;
        this.lastY = -1;
        this.sizeX = sizeX;
        this.sizeY = sizeY;

        this.init(sizeX,sizeY,this.CHUNKWIDTHINTILES , this.TILESIZE);
    }
    getSizeX(){
        return this.sizeX*this.TILESIZE*this.CHUNKWIDTHINTILES;
    }
    getSizeY(){
        return this.sizeY*this.TILESIZE*this.CHUNKWIDTHINTILES;
    }
    getScene(location /*point*/)
    {
        var x = Math.floor(location.x / (this.TILESIZE*this.CHUNKWIDTHINTILES));
        var y = Math.floor(location.y / (this.TILESIZE*this.CHUNKWIDTHINTILES));
        
        if(x == this.lastX && y == this.lastY) return this.cachedHolder.tiles;
        else
        {
            var holder = { tiles : []};
            // 1 2 3
            // 4 x 5
            // 6 7 8
            var st = this.selectTiles.bind(this,x,y,holder);
            //1 
            st(-1,-1);
            //2
            st(0,-1);
            //3
            st(1,-1 );
            //4
            st(-1,0 );
            //5
            st(1,0);
            //6
            st(-1,1);
            //7    
            st(0,1);
            //8
            st(1,1);
            //self
            st(0,0);
            this.cachedHolder = holder;
            this.lastX =x;
            this.lastY = y;
            return holder.tiles;

        }
    }
    selectTiles(x,y,holder, offsetx,offsety)
    {
        var x1 = x+offsetx;
        var y1 = y+offsety;
        if(x1 >= 0 && y1 >= 0) holder.tiles = holder.tiles.concat(this.getTiles(x1,y1));
     
    }
    getTiles(x,y)
    {
        return this.world[y][x].getTiles();
    }
    init(nbrOfChunksX,nbrOfChunksY,chunkWidthsIntiles,sizeOfTile)
    {
        for(var i = 0; i < nbrOfChunksY; i++){
            this.world.push(this.createWorldRow(i,nbrOfChunksX,chunkWidthsIntiles,sizeOfTile))
        }
    }
    createWorldRow(rownbr, nbrOfChunks, chunkWidthsIntiles, sizeOfTile)
    {
        
        var row = [];
        for(var i = 0; i < nbrOfChunks; i++ )
        {
            row.push(new CM.Chunk(new CM.Point(i*chunkWidthsIntiles*sizeOfTile,rownbr*chunkWidthsIntiles*sizeOfTile),chunkWidthsIntiles,sizeOfTile, this.tileCreator));
        }
        return row;
    }
    getObjects(){
        return this.objects.sort(function (a,b) {
            if(a.z > b.z) return -1;
            if( a.z == b.z) return 0;
            else return 1;
        });;
    }
    addObject(object)
    {
        this.objects.push(object);
    }
    addObjects(objects)
    {
       this.objects = this.objects.concat(objects);
    }
    getNearestObject(position)
    {
      

        if(this.objects.length > 0)
        {
            var nearest = this.objects[0];
            var currDist = Number.MAX_VALUE;
            this.objects.forEach(_=> {
                if(_.interactable){
                    var d = CM.distance(_.getMidPoint(),position);
                    if(d < currDist)
                    {
                        nearest = _;
                        currDist = d;
                    }
                }
            });
            return nearest;
        }
        return null;
    }
}
