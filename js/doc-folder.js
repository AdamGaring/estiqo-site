/* ============================================================
   Estiqo — the document folder
   ------------------------------------------------------------
   react-bits' Folder held one boolean and three mouse offsets in
   React state. Here the boolean is the button's own
   `aria-expanded` — the accessibility attribute and the state
   are the same thing, so they can never disagree — and the
   offsets are two custom properties per paper, read by the
   transforms in the stylesheet.

   Everything visual lives in CSS: with this file blocked the
   folder still opens on hover and still reads correctly, it
   simply doesn't latch open or follow the pointer.
   ============================================================ */

(function () {
  "use strict";

  var folder = document.querySelector(".doc-folder");
  if (!folder) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var papers = [].slice.call(folder.querySelectorAll(".paper"));

  function isOpen() {
    return folder.getAttribute("aria-expanded") === "true";
  }

  function clearOffsets() {
    papers.forEach(function (p) {
      p.style.removeProperty("--mx");
      p.style.removeProperty("--my");
    });
  }

  /* A real <button> already fires click for Enter and Space, so there is
     no keydown handler here — the original component needed one only
     because it was a <div> wearing role="button". */
  folder.addEventListener("click", function () {
    var open = !isOpen();
    folder.setAttribute("aria-expanded", String(open));
    folder.setAttribute("aria-label", open ? "Close the document folder" : "Open the document folder");
    if (!open) clearOffsets();
  });

  /* Papers drift slightly toward the pointer while the folder is open —
     the "magnet" in the original. Skipped entirely on touch and with
     motion reduced. */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduce.matches) {
    papers.forEach(function (paper) {
      var pending = false, mx = 0, my = 0;

      paper.addEventListener("pointermove", function (e) {
        if (!isOpen()) return;
        var r = paper.getBoundingClientRect();
        mx = (e.clientX - (r.left + r.width / 2)) * 0.14;
        my = (e.clientY - (r.top + r.height / 2)) * 0.14;
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () {
          pending = false;
          if (!isOpen()) return;
          paper.style.setProperty("--mx", mx.toFixed(1) + "px");
          paper.style.setProperty("--my", my.toFixed(1) + "px");
        });
      }, { passive: true });

      paper.addEventListener("pointerleave", function () {
        paper.style.removeProperty("--mx");
        paper.style.removeProperty("--my");
      }, { passive: true });
    });
  }

  /* Touch has no hover to reveal the papers, so the folder arrives open
     on small screens — closed, it is just a green rectangle. Tapping
     still closes it. */
  if (window.matchMedia("(max-width: 860px)").matches) {
    folder.setAttribute("aria-expanded", "true");
    folder.setAttribute("aria-label", "Close the document folder");
  }
})();
