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
        this.keyLetterListeneres = [];

        // Gamepad state
        this._gpPrev = {};   // button state last frame
        this._gpAxis  = {};  // axis state last frame
        this._gpConnected = false;
        this.onGamepadConnected = null;    // callback(id)
        this.onGamepadDisconnected = null; // callback()
        window.addEventListener('gamepadconnected', function(e) {
            this._gpConnected = true;
            CM.gamepadActive = true;
            var ind = document.getElementById('gamepadIndicator');
            if(ind) ind.style.display = 'flex';
            if(this.onGamepadConnected) this.onGamepadConnected(e.gamepad.id);
        }.bind(this));
        window.addEventListener('gamepaddisconnected', function() {
            this._gpConnected = false;
            CM.gamepadActive = false;
            var ind = document.getElementById('gamepadIndicator');
            if(ind) ind.style.display = 'none';
            if(this._aimTarget) this._aimTarget.gunDirection = null;
            if(this.onGamepadDisconnected) this.onGamepadDisconnected();
        }.bind(this));

        // Gamepad button → keyCode mapping (Standard Gamepad Layout)
        // Buttons: 0=A 1=B 2=X 3=Y 4=LB 5=RB 12=D-Up 13=D-Down 14=D-Left 15=D-Right
        this._gpButtonMap = {
            12: 38,  // D-Up    → ArrowUp
            13: 40,  // D-Down  → ArrowDown
            14: 37,  // D-Left  → ArrowLeft
            15: 39,  // D-Right → ArrowRight
            0:  13,  // A       → Enter (bestätigen)
            6:  76,  // LT      → L (Baumenü)
            1:  66,  // B       → B (mount/dismount)
            2:  69,  // X       → E (mine)
            3:  70,  // Y       → F (sail/interact)
            4:  65,  // LB      → A (ascend)
            5:  83,  // RB      → S (descend)
            9:  73,  // Start   → I (inventory)
            7:  67,  // RT       → C (fire)
            11: 67,  // RS-Click → C (fire)
        };
    }
    init(){
        this.bindEvent("keydown", this.keydown.bind(this));
        this.bindEvent("keyup",   this.keyup.bind(this));
    }
    bindEvent(eventname, func){
        document.addEventListener(eventname, func);
    }
    pollGamepad(){
        var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        var gp = null;
        for(var i = 0; i < gamepads.length; i++){
            if(gamepads[i]){ gp = gamepads[i]; break; }
        }
        if(!gp) return;

        // Buttons — mapped ones trigger keycodes, all trigger debug
        for(var i = 0; i < gp.buttons.length; i++){
            var pressed = gp.buttons[i] && gp.buttons[i].pressed;
            var wasPrev = !!this._gpPrev[i];
            if(pressed && !wasPrev) this.lastKeyCode = 'GP-btn' + i + (this._gpButtonMap[i] ? '→' + this._gpButtonMap[i] : ' (unmapped)');
            if(this._gpButtonMap[i] !== undefined){
                var keyCode = this._gpButtonMap[i];
                if(pressed && !wasPrev){ this.currentKeys[keyCode] = true; this.notifiy(keyCode); }
                else if(!pressed && wasPrev){ this.currentKeys[keyCode] = false; this.notifiy(null); }
            }
            this._gpPrev[i] = pressed;
        }

        // Left stick → arrow keys (threshold 0.4)
        // Right stick → independent gun direction (when mounted in blimp)
        var rx = gp.axes[2] || 0;
        var ry = gp.axes[3] || 0;
        var GUN_THRESH = 0.2;
        if(this._aimTarget){
            if(Math.sqrt(rx*rx + ry*ry) > GUN_THRESH){
                this._aimTarget.gunDirection = new CM.Point(rx, ry);
            }
            // stick released: keep last gunDirection — no snap
        }

        var ax = gp.axes[0] || 0;
        var ay = gp.axes[1] || 0;
        var THRESH = 0.4;

        var stickMap = [
            { key: 37, active: ax < -THRESH },  // left
            { key: 39, active: ax >  THRESH },  // right
            { key: 38, active: ay < -THRESH },  // up
            { key: 40, active: ay >  THRESH },  // down
        ];
        stickMap.forEach(function(m){
            var wasActive = !!this._gpAxis[m.key];
            if(m.active && !wasActive){
                this.currentKeys[m.key] = true;
                this.notifiy(m.key);
            } else if(!m.active && wasActive){
                this.currentKeys[m.key] = false;
                this.notifiy(null);
            }
            this._gpAxis[m.key] = m.active;
        }.bind(this));
    }
    calcCurrentlyPressed(){
        return Object.entries(this.currentKeys).filter(_=>{
            return _[1] == true;
        });
    }
    keydown(event){
        this.currentKeys[event.keyCode] = true;
        this.lastKeyCode = event.keyCode;
        this.notifiy(event.keyCode);
    }
    keyup(event){
        this.currentKeys[event.keyCode] = false;
        this.notifiy(null);
    }
    notifiy(keycode){
        var currentlyPressed = this.calcCurrentlyPressed();
        if(keycode == null){
            this.keyUpListeners.forEach(element => {
                element(keycode, currentlyPressed);
            });
        } else {
            this.keyDownListeners.forEach(element => {
                element(keycode, currentlyPressed);
            });
            if(this.inrange(keycode,37,40)){
                this.keyArrowListeners.forEach(element => {
                    element(keycode, currentlyPressed);
                });
            }
            if(this.inrange(keycode,65,90)){
                this.keyLetterListeneres.forEach(element => {
                    element(keycode, currentlyPressed);
                });
            } else {
                currentlyPressed.forEach(function(entry){
                    var heldKey = parseInt(entry[0]);
                    if(this.inrange(heldKey,65,90)){
                        this.keyLetterListeneres.forEach(element => {
                            element(heldKey, currentlyPressed);
                        });
                    }
                }.bind(this));
            }
        }
    }
    inrange(key,lower,upper){
        return (key >= lower && key <= upper);
    }
    on(eventname, func){
        switch(eventname){
            case "keyup":      this.keyUpListeners.push(func);      break;
            case "keydown":    this.keyDownListeners.push(func);    break;
            case "arrowKeys":  this.keyArrowListeners.push(func);   break;
            case "letterKeys": this.keyLetterListeneres.push(func); break;
        }
    }
}
