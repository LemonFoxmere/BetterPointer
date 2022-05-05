import anime from "animejs";

export default class cursor{
    readonly cursorWidth:string | undefined;
    readonly cursorHeight:string | undefined;
    readonly cursorMass:number | undefined;
    readonly cursorElement:HTMLElement | undefined;
    readonly trkPer:number | undefined;

    currentCursorWidth:string | undefined;
    currentCursorHeight:string | undefined;
    currentCursorRadius:string | undefined;

    private _lastSnapElmnt:HTMLElement | undefined;
    private _currentSnapElmnt:HTMLElement | undefined;

    private _lastHoverElmnt:HTMLElement | undefined;
    private _currentHoverElmnt:HTMLElement | undefined;

    snapped:boolean = false;

    dark:boolean = false;
    cx:number = 0; cy:number = 0;

    constructor(id:string, size:string="24px", mass:number=75, trackingPeriod:number=100){
        this.cursorElement = document.getElementById(id)!;
        if(!this.cursorElement){
            console.error(`Cursor with id:${id} does not exist.`);
            return;
        }
        // set corresponding attributes
        this.currentCursorWidth = this.cursorWidth = size;
        this.currentCursorHeight = this.cursorHeight = size;
        this.currentCursorRadius = "1000rem";
        this.cursorMass = mass;
        this.trkPer = trackingPeriod;

        // set up cursor with style
        {
            // position and behavior
            this.cursorElement.style.pointerEvents = "none"; // make the cursor uninteractable
            this.cursorElement.style.position = "fixed"; // make the cursor fixed on the screen
            this.cursorElement.style.zIndex = "999999"; // set z index to be on the top
            this.cursorElement.style.left = "0"; // fix the cursor to the top left of the screen
            this.cursorElement.style.top = "0";
            this.cursorElement.style.transition = `${this.cursorMass}ms ease`; // give the cursor some easing (mass)
            
            // size and shape
            this.cursorElement.style.width = this.currentCursorWidth; // set width
            this.cursorElement.style.height = this.currentCursorHeight; // set height
            this.cursorElement.style.borderRadius = this.currentCursorRadius; // set cursor radius
            
            // initial coloring
            this.cursorElement.style.backgroundColor = "hsla(0, 0%, 0%, 0.3)"; // background color
            this.cursorElement.style.border = "1px solid"; // border size
            this.cursorElement.style.borderColor = "hsla(0, 0%, 0%, 0.15)"; // border color
        }

        // start tracking the real cursor
        document.onmousemove = (e:MouseEvent):void => {
            this.cx=e.x; this.cy=e.y;
            
            // update positioning of the cursor
            this._updatePositioncycle(e);
        };

        // track colors
        setInterval(():void => {
            // track colors (contrasting elements)
            this._currentHoverElmnt = <HTMLElement> document.elementFromPoint(this.cx, this.cy)
            if(this._currentHoverElmnt != this._lastHoverElmnt && !!this._currentHoverElmnt){
                if(this._currentHoverElmnt!.hasAttribute("contrast")) this.dark ? this.setLight(false) : this.setDark(false);
                else this.dark ? this.setDark(false) : this.setLight(false);

                this._updateCursorState();
            }
            this._lastHoverElmnt = this._currentHoverElmnt
        }, this.trkPer)
    }

    private _updateCursorState = ():void => {
        if(this._currentHoverElmnt!.hasAttribute("snaptext")) this.setShape("text");
        else if (this._currentHoverElmnt!.hasAttribute("snapinput")) this.setShape("input");
        else if (this._currentHoverElmnt!.hasAttribute("snapbutton")) this.setShape("button");
        else if (this._currentHoverElmnt!.hasAttribute("bigsnapbutton")) this.setShape("button", this._currentHoverElmnt, true);
        else this.setShape("");
    }

    private _updatePositioncycle = (e:MouseEvent):void => {
        if(!this.snapped){ // if there is no snappable element, track the cursor as usual
            this.cursorElement!.style.transform = `translate3d(calc(${e.x}px - ${this.currentCursorWidth} / 2 - 2px), calc(${e.y}px - ${this.currentCursorHeight} / 2 - 2px),0)`; // border size
        } else { // if there is, then manipulate margins to offset the cursor
            // calculate the offset distance from cursor to the element's center
            let bbox = this._currentSnapElmnt!.getBoundingClientRect();
            const offsetX = e.x - bbox.x - bbox.width/2 + 4;
            const offsetY = e.y - bbox.y - bbox.height/2 + 4;
            
            this.cursorElement!.style.transform = `translate3d(${bbox.x + offsetX/(bbox.width/15)}px, ${bbox.y + offsetY/(bbox.height/15)}px, 0)`; // border size
            this._currentSnapElmnt!.style.transform = `translate3d(${offsetX/(bbox.width/5)}px, ${offsetY/(bbox.height/5)}px, 0)`; // border size
            
            setTimeout(() => {
                this._lastSnapElmnt!.style.transition = "0ms ease";
            }, 50);
        }

        // update frame
        requestAnimationFrame(()=>{});
    }

    setDark = (set:boolean = true):void => {
        if(set) this.dark = true;
        this.cursorElement!.style.backgroundColor = "hsla(0, 0%, 100%, 0.3)"; // background color
        this.cursorElement!.style.border = "1px solid"; // border size
        this.cursorElement!.style.borderColor = "hsla(0, 0%, 100%, 0.15)"; // border color
    }
    setLight = (set:boolean = true):void => {
        if(set) this.dark = false;
        this.cursorElement!.style.backgroundColor = "hsla(0, 0%, 0%, 0.3)"; // background color
        this.cursorElement!.style.border = "1px solid"; // border size
        this.cursorElement!.style.borderColor = "hsla(0, 0%, 0%, 0.15)"; // border color
    }
    
    setShape = (shape:string, elmnt:HTMLElement=this._currentHoverElmnt!, hideCursor:boolean=false) => {
        switch(shape){
            case "text":
                // set snapped state to true
                this.snapped = false

                this.currentCursorWidth = `1.5px`; // set width
                this.currentCursorHeight = window.getComputedStyle(elmnt).lineHeight; // set width

                if(hideCursor) this.cursorElement!.style.opacity = "0"; // hide cursor all together
                if(this.dark) this.cursorElement!.style.backgroundColor = "hsla(0, 0%, 100%, 0.7)"; // background color
                else this.cursorElement!.style.backgroundColor = "hsla(0, 0%, 0%, 0.7)"; // background color
                break;
            case "input":
                // set snapped state to true
                this.snapped = false;

                this.currentCursorWidth = `1.5px`; // set width
                this.currentCursorHeight = window.getComputedStyle(elmnt).height; // set width

                if(hideCursor) this.cursorElement!.style.opacity = "0"; // hide cursor all together
                if(this.dark) this.cursorElement!.style.backgroundColor = "hsla(0, 0%, 100%, 0.4)"; // background color
                else this.cursorElement!.style.backgroundColor = "hsla(0, 0%, 0%, 0.4)"; // background color
                break;
            case "button":
                // set snapped state to true
                this.snapped = true;

                this.currentCursorWidth = `${elmnt?.getBoundingClientRect().width}px`; // set width
                this.currentCursorHeight = `${elmnt?.getBoundingClientRect().height}px`; // set width
                this.currentCursorRadius = window.getComputedStyle(elmnt).borderRadius; // set radius

                this.cursorElement!.style.zIndex = "0"; // set z-index to the bottom (for highlighting)

                this._currentSnapElmnt = elmnt; // set the snapping element to the correct element
                
                // reset last snapped element offset and scale (if it exists)
                if(this._currentSnapElmnt != this._lastSnapElmnt && !!this._lastSnapElmnt){
                    this._lastSnapElmnt!.style.transition = "200ms ease";
                    this._lastSnapElmnt!.style.transform = "translate3d(0,0,0)"; // reset element scale            
                    this._lastSnapElmnt!.style.scale = "1";
                }  

                this._lastSnapElmnt = this._currentSnapElmnt; // set the last snapping element to the current element

                // set transition properties for easing
                this._currentSnapElmnt!.style.transitionProperty = "scale, transform";
                this._currentSnapElmnt!.style.transition = `${this.cursorMass || 0 + 100}ms ease`;
                // scale up the hovered over element
                this._currentSnapElmnt!.style.scale = "1.1";

                // if the client request to hide the cursor, hide it all togehter
                if(hideCursor){
                    this.cursorElement!.style.opacity = "0";
                    break;
                }
                // hide the border and background color
                this.cursorElement!.style.borderColor = "hsla(0, 0%, 0%, 0)";
                if(this.dark) this.cursorElement!.style.backgroundColor = "hsla(0, 0%, 100%, 0.2)"; // dark mode bgc
                else this.cursorElement!.style.backgroundColor = "hsla(0, 0%, 0%, 0.1)"; // light mode bgc
                break;
            default:
                this.snapped = false;

                this.currentCursorRadius = this.cursorWidth; // reset border radius
                this.currentCursorWidth = this.cursorWidth; // set width
                this.currentCursorHeight = this.cursorHeight; // set height
                
                this.cursorElement!.style.zIndex = "999999"; // reset z-index
                this.cursorElement!.style.marginLeft = "0"; // reset margin offsets    
                this.cursorElement!.style.marginTop = "0";
                

                if(this._currentSnapElmnt){
                    this._lastSnapElmnt!.style.transition = "200ms ease";
                    this._currentSnapElmnt!.style.transform = "translate3d(0,0,0)"; // reset element scale            
                    this._currentSnapElmnt!.style.scale = "1"; // reset element scale            
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