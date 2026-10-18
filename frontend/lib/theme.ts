export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "brg-theme";

/**
 * Runs before first paint (inlined in <head> by the root layout) so the page never flashes
 * the wrong theme. A saved choice wins; otherwise it follows the system setting.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t;if(localStorage.getItem("aegis-boot-seen")==="1")r.classList.add("boot-seen");if(localStorage.getItem("aegis-view")==="plain")r.classList.add("view-plain")}catch(e){document.documentElement.dataset.theme="dark"}})();`;
