"use client";

import { useEffect, useRef } from "react";

/**
 * A terminal block cursor that replaces the mouse pointer on devices with a mouse.
 *
 * - It inverts whatever is under it (mix-blend-mode: difference), so it reads as a white block on
 *   the black screen and turns text under it black.
 * - Over a link or button it grows to cover the whole element, like a highlighted field on an
 *   operator terminal. Over text fields it hides, so the normal text cursor shows.
 * - It blinks after the pointer rests. With reduced motion it follows the pointer exactly and does
 *   not blink. On touch screens it is never shown.
 *
 * Everything runs in effects and requestAnimationFrame; nothing re-renders while the mouse moves.
 */
export function TermCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia("(pointer: fine)");
    if (!fine.matches) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    root.classList.add("has-term-cursor");

    const cell = { w: 10, h: 20 };
    const target = { x: -100, y: -100, w: cell.w, h: cell.h };
    const pos = { ...target };
    let over: Element | null = null;
    let lastTarget: EventTarget | null = null;
    let visible = false;
    let raf = 0;
    let restTimer = 0;

    const measureCell = () => {
      const probe = document.createElement("span");
      probe.textContent = "M";
      probe.style.cssText = "position:absolute;visibility:hidden;font:inherit";
      el.parentElement?.appendChild(probe);
      const r = probe.getBoundingClientRect();
      cell.w = Math.max(6, r.width);
      cell.h = Math.max(14, r.height * 1.1);
      probe.remove();
    };
    measureCell();

    const interactive = (node: EventTarget | null): Element | null => {
      if (!(node instanceof Element)) return null;
      return node.closest("a[href], button:not(:disabled), [role='button'], summary, label[for]");
    };
    const typing = (node: EventTarget | null) =>
      node instanceof Element && Boolean(node.closest("input, textarea, select, [contenteditable='true']"));

    const tick = () => {
      const k = still ? 1 : 0.28;
      pos.x += (target.x - pos.x) * k;
      pos.y += (target.y - pos.y) * k;
      pos.w += (target.w - pos.w) * k;
      pos.h += (target.h - pos.h) * k;
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      el.style.width = `${pos.w}px`;
      el.style.height = `${pos.h}px`;
      const settled =
        Math.abs(target.x - pos.x) < 0.3 && Math.abs(target.y - pos.y) < 0.3 && Math.abs(target.w - pos.w) < 0.3;
      raf = settled ? 0 : requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const place = (x: number, y: number) => {
      if (over && over.isConnected) {
        const r = over.getBoundingClientRect();
        target.x = r.left - 2;
        target.y = r.top - 1;
        target.w = r.width + 4;
        target.h = r.height + 2;
      } else {
        target.x = x - cell.w / 2;
        target.y = y - cell.h / 2;
        target.w = cell.w;
        target.h = cell.h;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const hideForText = typing(e.target);
      el.dataset.hidden = hideForText ? "1" : "";
      over = interactive(e.target);
      el.dataset.over = over ? "1" : "";
      // Over text, the block is one character cell of that text (IBM Plex Mono is 0.6em wide).
      if (!over && e.target !== lastTarget && e.target instanceof Element) {
        lastTarget = e.target;
        const fs = parseFloat(getComputedStyle(e.target).fontSize) || 14;
        cell.w = Math.max(6, fs * 0.6);
        cell.h = Math.max(14, fs * 1.18);
      }
      if (!visible) {
        visible = true;
        place(e.clientX, e.clientY);
        Object.assign(pos, target);
        el.dataset.on = "1";
      }
      place(e.clientX, e.clientY);
      el.dataset.rest = "";
      window.clearTimeout(restTimer);
      if (!still) restTimer = window.setTimeout(() => (el.dataset.rest = "1"), 900);
      kick();
    };
    const onLeave = () => {
      visible = false;
      el.dataset.on = "";
    };
    const onDown = () => (el.dataset.down = "1");
    const onUp = () => (el.dataset.down = "");
    const onScroll = () => {
      if (over) {
        place(0, 0);
        kick();
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(restTimer);
      root.classList.remove("has-term-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  return <div ref={ref} aria-hidden className="term-pointer" />;
}
