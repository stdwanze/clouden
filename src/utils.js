CM = window.CM || {};


CM.Point = class Point{
    constructor(x,y)
    {
        this.x = x;
        this.y = y;
    }
    move(divx,divy)
    {
        this.x += divx;
        this.y += divy;
        return this;
    }
    clone(){
        return new CM.Point(this.x,this.y);
    }
}

CM.AABB = class AABB{
    
    constructor(location, size) {
        this.x = location.x;
        this.y = location.y;
    
        this.width = size.x;
        this.height = size.y;
    
    };
    contains(location)
    {
        if(this.x <= location.x && this.x+this.width > location.x &&
                        this.y <= location.y && this.y+this.height > location.y)
            { return true;}
        else{
            return false;
        }
    }
}


CM.InputHandler = class InputHandler{
    constructor(){

        this.init();
        this.currentKeys = {};
        this.lastPressed = null;
        this.keyArrowListeners = [];
        this.keyDownListeners = [];
        this.keyUpListeners = [];
        this.keyLetterListeneres =[];
    }
    init(){
        this.bindEvent("keydown",this.keydown.bind(this));
        this.bindEvent("keyup",this.keyup.bind(this));
    }
    bindEvent(eventname, func)
    {
        document.addEventListener(eventname,func);
    };
    calcCurrentlyPressed(){
        return Object.entries(this.currentKeys).filter(_=>{
            return _[1] == true;
         });
    }
    keydown(event)
    {
        this.currentKeys[event.keyCode] = true;
        this.notifiy(event.keyCode);
    }
    keyup(event)
    {
        this.currentKeys[event.keyCode] = false;
        this.notifiy(null);
            
    }
    notifiy(keycode)
    {
        var currentlyPressed = this.calcCurrentlyPressed();
        this.keyDownListeners.forEach(element => {
            element(keycode,currentlyPressed);
        });
        if(this.inrange(event.keyCode,37,40)){
            this.keyArrowListeners.forEach(element => {
                element(keycode,currentlyPressed);
            });
        } 
        if(this.inrange(event.keyCode,65,90)){
            this.keyLetterListeneres.forEach(element => {
                element(keycode,currentlyPressed);
            });
        } 
    }
    inrange(key,lower,upper)
    {
        return (key >= lower && key <= upper);
    }
    on(eventname, func)
    {
        switch(eventname)
        {
            case "keyup": this.keyUpListeners.push(func); break;
            case "keydown": this.keyDownListeners.push(func); break;
            case "arrowKeys": this.keyArrowListeners.push(func); break;
            case "letterKeys": this.keyLetterListeneres.push(func); break;
        }
    }

}
