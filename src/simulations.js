CM = window.CM || {}
CM.CloudSource = class CloudGen {
    constructor(worldwidth, worldheight, cloudmakerfunc){
        this.width = worldwidth;
        this.height = worldheight;
        this.cloudmakerfunc = cloudmakerfunc;
    }

    generateClouds(densityWidth, densityHeight){

        var clouds = [];
        var protocloud = this.cloudmakerfunc(0,0);

        var h = protocloud.sizeX;
        var w = protocloud.sizeY;

        var avgCloudDistanceX = this.width/w/densityWidth;
        var avgCloudDistanceY = this.height/h/densityHeight;
        
        var cloudsInX = Math.floor(this.width/avgCloudDistanceX);
        var cloudsInY = Math.floor(this.width/avgCloudDistanceX);
        
        for(var i = 0; i < cloudsInX ; i++)
        {
            for(var k = 0; k < cloudsInY; k++)
            {
                var varianceX = Math.random()*avgCloudDistanceX;
                var varianceY = Math.random()*avgCloudDistanceY;
        
                var x = i*avgCloudDistanceX+varianceX;
                var y = k*avgCloudDistanceY+varianceY;

                var c = this.cloudmakerfunc(x,y);
                clouds.push(c);
            }
        }

        return clouds;
        
    }
}