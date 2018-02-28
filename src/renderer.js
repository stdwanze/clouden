CM = window.CM || {};

CM.Renderer = class Renderer {
    constructor(canvas)
    {
        this.zoom = 1;
        this.canvas = $("#"+canvas)[0];
        this.ctxt = this.canvas.getContext("2d");
    }

    lighter(){
        this.orgAlpha = this.ctxt.globalAlpha;
        this.ctxt.globalAlpha = 0.5
    }
    restore(){
        this.ctxt.globalAlpha = this.orgAlpha;
        this.ctxt.restore();
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
    drawRectangleStatic(x,y,sizex,sizey,color)
    {
        this.ctxt.fillStyle = color;
        this.ctxt.fillRect(x,y,sizex,sizey);
   
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
    drawImageStatic(image,x,y,sizex,sizey,scalingfactor)
    {
        this.ctxt.drawImage(image,x,y,sizex*scalingfactor, sizey*scalingfactor);
    }
    drawImageZ(image,x1,y1,sizex,sizey,z,scalingfactor)
    {
        var worldX = this.translateAndZoom(x1-this.viewport.x,this.canvas.width/2);
        var worldY = this.translateAndZoom(y1-this.viewport.y,this.canvas.height/2);
        this.ctxt.drawImage(image,worldX,worldY,sizex*z*scalingfactor, sizey*z*scalingfactor);
    }
    drawImage(image,x1,y1,sizex,sizey, scalingfactor)
    {
        var worldX = this.translateAndZoom(x1-this.viewport.x,this.canvas.width/2);
        var worldY = this.translateAndZoom(y1-this.viewport.y,this.canvas.height/2);
        this.ctxt.drawImage(image,worldX,worldY,sizex*this.zoom*scalingfactor, sizey*this.zoom*scalingfactor);
    }
    translateAndZoom(coord,base,z)
    {
        //return coord*this.zoom;
        if(z != null)
        {
            return ((coord-base)*z)+base;
        }
        return ((coord-base)*this.zoom)+base;
    }
    translate(coord,base)
    {
            return (coord+base);
    }
    getScreenHeight(){
        return this.canvas.height;
    }
    getScreenWidth(){
        return this.canvas.width;
    }
    clear()
    {
        this.ctxt.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    setZoom(zoom)
    {
        this.zoom = zoom;
    }
    fillText(text,x1,y1, size)
    {
        if(size == undefined) size = 20;
        this.ctxt.fillStyle  = "#24272b";
        this.ctxt.font = size+ "px Ariel black";
        var worldX = this.translateAndZoom(x1-this.viewport.x,this.canvas.width/2);
        var worldY = this.translateAndZoom(y1-this.viewport.y,this.canvas.height/2);
       
        this.ctxt.fillText(text,worldX,worldY);
        this.ctxt.restore();
    }
}
