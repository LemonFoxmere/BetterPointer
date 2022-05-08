import anime from "animejs";
import cursor from "./betterCursor";

export let menu_opened:boolean = false;
export let is_dark_mode:boolean = false;

const init_UI = (cur?:cursor):void => {
    // init side bar
    document.getElementById("side-menu-btn")!.addEventListener("click", (e:MouseEvent):void => {
        menu_opened = !menu_opened;
        anime({
            targets:"#side-menu",
            translateX: `${menu_opened ? 0 : -240}pt`,
            easing: "easeOutQuart",
            duration: 500
        });
        anime({
            targets:"#side-menu-control-container",
            translateX: `${menu_opened ? 175 : 0}pt`,
            easing: "easeOutQuart",
            duration: 450,
            delay: menu_opened ? 40 : 0
        });
        if(menu_opened){
            document.querySelector("body")!.classList.add("side-opened");
        } else {
            document.querySelector("body")!.classList.remove("side-opened");
        }
    });

    // init dark mode btn
    document.getElementById("dark-mode-btn")!.addEventListener("click", (e:MouseEvent):void => {
        is_dark_mode = !is_dark_mode;
        if(is_dark_mode){
            document.querySelector("body")!.classList.add("dark-mode");
            cur!.setDark();
        } else{
            document.querySelector("body")!.classList.remove("dark-mode");
            cur!.setLight();
        }
    });
}

window.onload = () => {
    init_UI(new cursor("custom-cursor"));
}