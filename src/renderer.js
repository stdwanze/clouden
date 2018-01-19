CM = window.CM || {};

CM.Renderer = class Renderer extends Renderinterface{
    constructor(canvas)
    {
        super();
        this.zoom = 1;
        this.canvas = $("#"+canvas)[0];
        this.ctxt = this.canvas.getContext("2d");
    }
    draw(element)
    {
        element.draw(this);
    }
    updatePos(pos)
    {
        this.viewport = new CM.Point(pos.x,pos.y);
        this.viewport = this.viewport.move(-this.canvas.width/2,-this.canvas.height/2);
    }
    drawRectangle(x1,y1,sizex,sizey,color)
    {
       




        this.ctxt.fillStyle = color;

        var worldX = this.translateAndZoom(x1-this.viewport.x,this.canvas.width/2);
        var worldY = this.translateAndZoom(y1-this.viewport.y,this.canvas.height/2);
        this.ctxt.fillRect(worldX,worldY,sizex*this.zoom,sizey*this.zoom);
    }
    drawRectangleStatic(sizex,sizey,color)
    {
        this.ctxt.fillStyle = color;
        this.ctxt.fillRect(this.canvas.width/2-sizex/2,this.canvas.height/2-sizey/2,sizex,sizey);
   
    }
    drawTriangleStatic(p1,p2,p3,color){
        this.ctxt.beginPath();
        this.ctxt.moveTo(this.translate(p1.x,this.canvas.width/2), this.translate(p1.y,this.canvas.height/2));
        this.ctxt.lineTo(this.translate(p2.x,this.canvas.width/2), this.translate(p2.y,this.canvas.height/2));
        this.ctxt.lineTo(this.translate(p3.x,this.canvas.width/2), this.translate(p3.y,this.canvas.height/2));
        this.ctxt.closePath();
         
         
        // the fill color
        this.ctxt.fillStyle = color;
        this.ctxt.fill();
    }
    translateAndZoom(coord,base)
    {
        //return coord*this.zoom;
        return ((coord-base)*this.zoom)+base;
    }
    translate(coord,base)
    {
            return (coord+base);
    }
    clear()
    {
        this.ctxt.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    setZoom(zoom)
    {
        this.zoom = zoom;
    }
}
