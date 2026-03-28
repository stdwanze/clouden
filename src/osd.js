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
    displayScores( scores, preferredPlace, yOffset, label, overlays)
    {
        var prefX = preferredPlace.split("-",2)[1];
        var screenwidth = this.renderer.getScreenWidth();
        var pad = 8;
        var baseY = 8 + (yOffset || 0);

        var nextX = prefX == "LEFT" ? function (i,size){ return pad + size*i*2; } :
        function (i,size){ return screenwidth - pad - (size*(i+1)*2); }

        if (label) {
            var labelX = prefX == "LEFT" ? pad : screenwidth - pad - 80;
            this.renderer.fillTextStaticColor(label, labelX, baseY + 10, 11, 'rgba(200,200,200,0.7)');
        }

        var barY = baseY + (label ? 16 : 0);
        var ctx = this.renderer.ctxt;

        for(var i = 0; i < scores.length; i++)
        {
            var score = scores[i];
            var x = nextX(i,this.size);
            var y = barY;
            var s = score.getScore();
            var m = score.getMax();

            var scaledScore = s/m ;
            var scoreOffset = (1-scaledScore)*50;
            this.renderer.drawRectangleStatic(x,y,this.size,50,"#FF0000");
            this.renderer.drawRectangleStatic(x,y+scoreOffset,this.size,50-scoreOffset,"#00FF00");

            if (overlays && overlays[score.getName()]) {
                ctx.save();
                ctx.font = 'bold 11px monospace';
                ctx.fillStyle = '#000';
                ctx.textAlign = 'center';
                ctx.fillText(overlays[score.getName()], x + this.size / 2, y + 30);
                ctx.restore();
            }

            var img = this.loadImage(score.getName());
            if(img)
            {
                this.renderer.drawImageStatic(img,x,y+55, img.width, img.height,this.size/img.width);
            }
        }
    }
}