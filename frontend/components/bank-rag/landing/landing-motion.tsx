"use client";

import { useEffect } from "react";

/**
 * Landing-page motion that needs JavaScript, kept to one job: the step list "boots" line by line
 * ([ .. ] turns into [ OK ]) the first time it scrolls into view.
 *
 * Progressive enhancement: the page is complete without this. It only arms the animation once it
 * is running, and with reduced motion it does nothing.
 */
export function LandingMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const groups = Array.from(document.querySelectorAll<HTMLElement>("[data-boot]"));
    if (!groups.length || !("IntersectionObserver" in window)) return;
    for (const g of groups) g.dataset.armed = "1";
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.on = "1";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    for (const g of groups) io.observe(g);
    return () => io.disconnect();
  }, []);
  return null;
}
