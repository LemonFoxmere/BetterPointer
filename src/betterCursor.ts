import anime from "animejs";

interface configFormat{
    size?:string,
    mass?:number,
    trackingPeriod?:number
}

interface transProp{
    property:string[],
    duration:number
}

interface cursorLocation{
    x:number,
    y:number,
    ox:number,
    oy:number
}

export default class cursor{

    readonly cursorWidth:string | undefined;
    readonly cursorHeight:string | undefined;
    readonly cursorMass:number | undefined;
    readonly cursorElement:HTMLElement | undefined;
    readonly trkPer:number | undefined;

    currentCursorWidth:string | undefined;
    currentCursorHeight:string | undefined;
    currentCursorRadius:string | undefined;
    currentCursorGrowth:string | undefined;

    private _lastSnapElmnt:HTMLElement | undefined;
    private _currentSnapElmnt:HTMLElement | undefined;
    private _currentSnapBbox:any | undefined;

    private _lastHoverElmnt:HTMLElement | undefined;
    private _currentHoverElmnt:HTMLElement | undefined;
    private _transitionProperties:transProp[] | undefined;
    private _transitionSuppression:Set<string> | undefined;
    
    private _elementTransitionDelay:any | undefined;

    snappedX:boolean = false;
    snappedY:boolean = false;
    moveElmnt:boolean = true;
    hidden:boolean = false;

    dark:boolean = false;
    currentCursorLoc:cursorLocation = {
        x:0,
        y:0,
        ox:0,
        oy:0
    }
    snapCoef:number = 1;

    constructor(id:string, config:configFormat={}){
        this.cursorElement = document.getElementById(id)!;
        if(!this.cursorElement){
            console.error(`Cursor with id:${id} does not exist.`);
            return;
        }
        // set corresponding attributes
        this.currentCursorWidth = this.cursorWidth = config.size || "24px"; // default values
        this.currentCursorHeight = this.cursorHeight = config.size || "24px";
        this.currentCursorRadius = "1000rem";
        // this.cursorMass = config.mass || 75;
        this.cursorMass = config.mass || 0;
        this.trkPer = config.trackingPeriod || 50;

        // set up cursor with style
        {
            // position and behavior
            this.cursorElement.style.pointerEvents = "none"; // make the cursor uninteractable
            this.cursorElement.style.position = "fixed"; // make the cursor fixed on the screen
            this.cursorElement.style.zIndex = "999999"; // set z index to be on the top
            this.cursorElement.style.left = "0"; // fix the cursor to the top left of the screen
            this.cursorElement.style.top = "0";
            
            // set transitions
            this._transitionProperties = [
                {
                property: ["width", "height", "borderRadius", "opacity"],
                duration: 100,
                }
            ];
            this._transitionSuppression = new Set<string>();
            this._updateCursorTransition(); // update the transition properties

            // size and shape
            this.cursorElement.style.width = this.currentCursorWidth; // set width
            this.cursorElement.style.height = this.currentCursorHeight; // set height
            this.cursorElement.style.borderRadius = this.currentCursorRadius; // set cursor radius
            this.cursorElement.style.opacity = "0"; // set cursor radius
            
            // initial coloring
            this.cursorElement.style.backgroundColor = "hsla(0, 0%, 0%, 0.4)"; // background color
        }

        // make it so that the cursor hides when the real cursor leaves
        document.documentElement.addEventListener('mouseleave', () => this.cursorElement!.style.opacity = "0");
        document.documentElement.addEventListener('keydown', () => this.cursorElement!.style.opacity = "0");
        document.documentElement.addEventListener('mouseenter', () => this.cursorElement!.style.opacity = "1");

        // start updating positioning of the cursor
        requestAnimationFrame(this._updatePositioncycle);

        // start tracking the real cursor
        document.onmousemove = (e:MouseEvent):void => {
            if(!this.hidden) this.cursorElement!.style.opacity = "1";

            this.currentCursorLoc.x=e.x; this.currentCursorLoc.y=e.y;
        };

        // track colors
        setInterval(():void => {
            // track colors (contrasting elements)
            this._currentHoverElmnt = <HTMLElement> document.elementFromPoint(this.currentCursorLoc.x, this.currentCursorLoc.y)
            if(this._currentHoverElmnt != this._lastHoverElmnt){
                // check for contrast
                if(this._currentHoverElmnt!.hasAttribute("contrast")) this.dark ? this.setLight(false) : this.setDark(false);
                else this.dark ? this.setDark(false) : this.setLight(false);
                
                this._updateCursorState();
            }
            this._lastHoverElmnt = this._currentHoverElmnt

            this._updateCursorTransition(); // update the transition properties
        }, this.trkPer)
    }

    private _updateCursorTransition = ():void => {
        let transitionStr:string = "";
        for(let i:number = 0; i < this._transitionProperties!.length; i++){
            let propDur:number = this._transitionProperties![i].duration;
            this._transitionProperties![i].property.forEach((prop:string):void => {
                if(!this._transitionSuppression!.has(prop)){ // make sure that this transition property isn't supressed
                    transitionStr += `${prop} ${propDur}ms ease, `
                }
            })
        }
        this.cursorElement!.style.transition = transitionStr.substring(0,transitionStr.length-2);
    }

    private _updateCursorState = ():void => {
    
        if(this._currentHoverElmnt!.hasAttribute("snaptext")){ this.setShape("text"); this._offsetTransitioned = false; }
        else if (this._currentHoverElmnt!.hasAttribute("snapinput")){ this.setShape("input", this._currentHoverElmnt); this._offsetTransitioned = false; }
        else if (this._currentHoverElmnt!.hasAttribute("snapbutton")){ this.setShape("button"); this._offsetTransitioned = false; }
        else if (this._currentHoverElmnt!.hasAttribute("bigsnapbutton")){ this.setShape("button", this._currentHoverElmnt, true, 20); this._offsetTransitioned = false; }
        else this.setShape("");
    }

    private _offsetTransitioned:boolean = false;
    private _updatePositioncycle = ():void => {
        const cbbox = this.cursorElement!.getBoundingClientRect();
        if(!(this.snappedX || this.snappedY)){ // if there is no snappable element, track the cursor as usual            
            this.currentCursorLoc.ox = cbbox.width / -2;
            this.currentCursorLoc.oy = cbbox.height / -2;
        } else {     
            // calculate the offset distance from cursor to the element's center
            const offsetX = this.currentCursorLoc.x - this._currentSnapBbox.x - this._currentSnapBbox.width/2;
            const offsetY = this.currentCursorLoc.y - this._currentSnapBbox.y - this._currentSnapBbox.height/2;
            const newox = (this.snappedX ? -offsetX/(1.5 * (-0.6667*Math.tanh(this._currentSnapBbox.width/200)+1.3333)) : 0) + cbbox.width / -2
            const newoy = (this.snappedY ? -offsetY/(1.5 * (-0.6667*Math.tanh(this._currentSnapBbox.height/200)+1.3333)) : 0) + cbbox.height / -2

            if(!this._offsetTransitioned){
                anime({
                    targets:this.currentCursorLoc,
                    ox: newox,
                    oy: newoy,
                    easing: "easeOutCubic",
                    duration:33,
                    update: () => {
                        this.cursorElement!.style.transform = `translate3d(${this.currentCursorLoc.x + this.currentCursorLoc.ox }px, ${this.currentCursorLoc.y + this.currentCursorLoc.oy}px,0)`; // move the cursor accordingly
                    },
                    loop:3,
                    complete: () => {
                        this._offsetTransitioned = true;
                    }
                });
            } else{
                anime.set(this.currentCursorLoc, {
                    ox: newox,
                    oy: newoy,
                });
            }

            this._elementTransitionDelay = setTimeout(() => {
                if(!!this._currentSnapElmnt) this._currentSnapElmnt.style.transition = "0ms ease";
            }, 100);

            if(this.moveElmnt) this._currentSnapElmnt!.style.transform = `translate3d(${ this.snappedX ? offsetX/(this._currentSnapBbox.width/this.snapCoef) : 0 }px, ${ this.snappedY ? offsetY/(this._currentSnapBbox.height/this.snapCoef) : 0}px, 0)`; // border size
        }
        
        this.cursorElement!.style.transform = `translate3d(${this.currentCursorLoc.x + this.currentCursorLoc.ox }px, ${this.currentCursorLoc.y + this.currentCursorLoc.oy}px,0)`; // move the cursor accordingly

        // update frame
        requestAnimationFrame(this._updatePositioncycle);
    }

    setDark = (set:boolean = true):void => {
        if(set) this.dark = true;
        // if the cursor isn't snapped (aka normal state), change background color according to that
        this.cursorElement!.style.backgroundColor = (this.snappedX || this.snappedY) ? "hsla(0, 0%, 100%, 0.1)" : "hsla(0, 0%, 100%, 0.4)";

    }
    setLight = (set:boolean = true):void => {
        if(set) this.dark = false;
        // if the cursor isn't snapped (aka normal state), change background color according to that
        this.cursorElement!.style.backgroundColor = (this.snappedX || this.snappedY) ? "hsla(0, 0%, 0%, 0.1)" : "hsla(0, 0%, 0%, 0.4)";
    }
    
    setShape = (shape:string, elmnt:HTMLElement=this._currentHoverElmnt!, hideCursor:boolean=false, snapCoef=10) => {
        const reset_last_snap_pos = ():void => {
            if(!!this._lastSnapElmnt){
                this._lastSnapElmnt!.style.transition = "200ms ease";
                this._lastSnapElmnt!.style.transform = "translate3d(0,0,0)"; // reset element scale            
                this._lastSnapElmnt!.style.scale = "1";
            }
        }
        const set_snap = ():void => { // call this function whenever an element that is snappable is hovered over on
            this._currentSnapElmnt = elmnt; // set the snapping element to the correct element
            this._currentSnapBbox = elmnt.getBoundingClientRect(); // set the bounding box so it doesnt change

            // reset last snapped element offset and scale (if it exists)
            if(this._currentSnapElmnt != this._lastSnapElmnt){
                reset_last_snap_pos();
            }  

            this._lastSnapElmnt = this._currentSnapElmnt; // set the last snapping element to the current element
        }

        this.hidden = hideCursor;
        this.snapCoef = snapCoef;
        this.currentCursorGrowth = elmnt.getAttribute("growth") || "0px";

        switch(shape){
            case "text":
                // set snapped state to true
                this.snappedX = this.snappedY = false;
                this.moveElmnt = true;

                this.currentCursorWidth = `max(3px, calc(${window.getComputedStyle(elmnt).lineHeight} / 12))`; // set width
                this.currentCursorHeight = window.getComputedStyle(elmnt).lineHeight; // set width

                reset_last_snap_pos();

                if(hideCursor) this.cursorElement!.style.opacity = "0"; // hide cursor all together
                if(this.dark) this.cursorElement!.style.backgroundColor = "hsla(0, 0%, 100%, 0.7)"; // background color
                else this.cursorElement!.style.backgroundColor = "hsla(0, 0%, 0%, 0.7)"; // background color
                break;
            case "input":
                // set snapped state to true
                this.snappedX = this.moveElmnt = false;
                this.snappedY = true;
                
                
                this.currentCursorWidth = `3px`; // set width
                this.currentCursorHeight = `calc(${window.getComputedStyle(elmnt).height} - 2px)`; // set width
                
                set_snap();
                
                if(hideCursor) this.cursorElement!.style.opacity = "0"; // hide cursor all together
                if(this.dark) this.cursorElement!.style.backgroundColor = "hsla(0, 0%, 100%, 0.4)"; // background color
                else this.cursorElement!.style.backgroundColor = "hsla(0, 0%, 0%, 0.4)"; // background color
                
                break;
            case "button":
                // set snapped state to true
                this.snappedX = this.snappedY = true;
                this.moveElmnt = true;

                this.currentCursorWidth = `calc(${elmnt?.getBoundingClientRect().width}px + ${this.currentCursorGrowth})`; // set width
                this.currentCursorHeight = `calc(${elmnt?.getBoundingClientRect().height}px + ${this.currentCursorGrowth})`; // set width
                this.currentCursorRadius = window.getComputedStyle(elmnt).borderRadius; // set radius

                this.cursorElement!.style.zIndex = "0"; // set z-index to the bottom (for highlighting)
                
                set_snap();

                // set transition properties for easing
                this._currentSnapElmnt!.style.transitionProperty = "scale, transform, opacity";
                this._currentSnapElmnt!.style.transition = `200ms ease`;

                // if the client request to hide the cursor, hide it all togehter
                if(hideCursor){
                    this.cursorElement!.style.opacity = "0";
                    break;
                }
                // hide the border and background color
                if(this.dark) this.cursorElement!.style.backgroundColor = "hsla(0, 0%, 100%, 0.1)"; // dark mode bgc
                else this.cursorElement!.style.backgroundColor = "hsla(0, 0%, 0%, 0.1)"; // light mode bgc
                break;
            default:
                this.snappedX = this.snappedY = false;
                this.moveElmnt = true;

                this.currentCursorRadius = this.cursorWidth; // reset border radius
                this.currentCursorWidth = this.cursorWidth; // set width
                this.currentCursorHeight = this.cursorHeight; // set height
                this.currentCursorLoc.ox = this.currentCursorLoc.oy = 0; // reset cursor offsets

                this.cursorElement!.style.zIndex = "999999"; // reset z-index
                
                // remove timeout for snap delay removal
                if(!!this._elementTransitionDelay){
                    clearTimeout(this._elementTransitionDelay);
                }

                if(!!this._currentSnapElmnt){
                    reset_last_snap_pos();           
                }
                this._currentSnapElmnt = undefined; // reset snapping elements
                
                this.cursorElement!.style.opacity = "1"; // background color
                if(this.dark) this.setDark();
                else this.setLight();
        }

        // update the shape
        this.cursorElement!.style.width = this.currentCursorWidth!;
        this.cursorElement!.style.height = this.currentCursorHeight!;
        this.cursorElement!.style.borderRadius = this.currentCursorRadius!;
    }
}