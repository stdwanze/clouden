CM = window.CM || {}

CM.OSD = class OSD
{
    constructor( renderer, imagerepo)
    {
       this.renderer = renderer;
        this.size = 20;
        this.imagerepo = imagerepo;
        this.imgchache = {};

    }

    loadImage(name)
    {
        var typeName = name.toLowerCase();
        if(this.imgchache[typeName] != null) return this.imgchache[typeName];

        var img = this.imagerepo.getImage(typeName+"-osd");
        if(img)
        {
            this.imgchache[typeName] = img;
            return img;
        }
        return null;
    }
    displayScores( scores, preferredPlace)
    {
        var prefY = preferredPlace.split("-",1);
        var prefX = preferredPlace.split("-",2)[1];
        var screenwidth = this.renderer.getScreenWidth();
        var screenheight = this.renderer.getScreenHeight();

        var nextX = prefX == "LEFT" ? function (i,size){ return size*i*2; } :
        function (i,size){ return screenwidth - (size*(i+1)*2); }

        var nextY = prefY == "BOTTOM" ? function (size) { return screenheight - size; }:
        function (size) { return size}; 


        for(var i = 0; i < scores.length; i++)
        {
            var score = scores[i];
            var x = nextX(i,this.size);
            var y = nextY(80); 
            var s = score.getScore();
            var m = score.getMax();

            var scaledScore = s/m ;
            var scoreOffset = (1-scaledScore)*50;
            this.renderer.drawRectangleStatic(x,y,this.size,50,"#FF0000");
            this.renderer.drawRectangleStatic(x,y+scoreOffset,this.size,50-scoreOffset,"#00FF00");
            
            var img = this.loadImage(score.getName());
            if(img)
            {
                this.renderer.drawImageStatic(img,x,y+55, img.width, img.height,this.size/img.width);

            }
            
        }
    }
}