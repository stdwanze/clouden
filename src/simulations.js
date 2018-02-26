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
CM.Score = class Score {
    constructor(min,max,step, typeName,curr)
    {
        this.min = min;
        this.max = max;
        this.step =step;
        this.typeName = typeName;
        this.score = max;
        if(curr !== undefined) this.score = curr;
    }
    getMin()
    {
        return this.min;
    }
    getMax(){
        return this.max;
    }
    getScore()
    {
        return this.score;
    }
    up(val)
    {
        var add = this.step;
        if(val)
        {
            add = val;
        }
        this.score +=add;
        if(this.score > this.max) this.score = this.max;
    }
    reduce(val)
    {
        var sub = this.step;
        if(val)
        {
            sub = val;
        }
        this.score -=sub;
        if(this.score < this.min) this.score = this.min;
    }
    getName(){
        return this.typeName;
    }
    

}



CM.Health = class Health extends CM.Score
 {
     constructor(max)
     {
        super(0,max,1,"HEALTH");
     }

 }
 CM.Ammo = class Ammo extends CM.Score
 {
     constructor(max)
     {
        super(0,max,1,"AMMO");
     }

 }
 CM.Fuel = class Fuel extends CM.Score
 {
     constructor(max)
     {
        super(0,max,1,"FUEL");
     }

 }
 CM.Coins = class Coins extends CM.Score
 {
    constructor()
     {
        super(0,200,1,"COINS",0);
     }
 }
 
 CM.ScoreSet = class SimSet {

    constructor()
    {
        this.Set ={};
    }
    get(typeName)
    {
        return this.Set[typeName]
    }
    add(score)
    {
        this.Set[score.getName()] = score;
    }
    getAll(){
        var ret = [];
        for(var k in this.Set)
        {
            if(this.Set.hasOwnProperty(k))
            {
                ret.push(this.Set[k]);
            }
        }
        return ret;
    }
 }
CM.Hitable = class Hitable{
    constructor()
    {
        this.hitted = false;
        this.hitcount = 0;
    }
    draw(cloudobject, renderer)
    {
        if(this.hitted)
        {
            var pos = cloudobject.getMidPoint();
            pos.move(-2,-2);
            renderer.drawRectangle(pos.x,pos.y,5,5,"#FF0000");
            this.hitcount++;
            this.hitted = false;
        }
    }
    hit()
    {
       this.hitted = true;
    }
}