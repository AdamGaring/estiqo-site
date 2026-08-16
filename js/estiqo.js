/* ============================================================
   Estiqo — landing page behaviour
   ------------------------------------------------------------
   No dependencies. A marketing page that ships a 100KB animation
   library to move three blurred circles has spent its budget in
   the wrong place, and this one deploys to GitHub Pages with no
   build step, so a library would also mean introducing one.

   Rules this file follows:
   - Never read layout inside a scroll or pointer event. Handlers
     set a flag; a single rAF does the work.
   - Never write anything but CSS custom properties and classes.
     Every visual consequence is a compositor-only transform
     declared in the stylesheet.
   - Everything degrades. The page is fully readable with this
     file blocked, missing, or erroring on line one.
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Nav ---------- */

  var nav = document.querySelector(".nav");
  var navToggle = document.getElementById("navToggle");
  var mobileMenu = document.getElementById("mobileMenu");

  if (navToggle && mobileMenu) {
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      mobileMenu.classList.toggle("open", !open);
    });
    // Otherwise the menu stays open over the section you just jumped to.
    mobileMenu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        navToggle.setAttribute("aria-expanded", "false");
        mobileMenu.classList.remove("open");
      }
    });
  }

  /* ---------- FAQ ---------- */

  /* Animates an explicit pixel height, then releases to `auto` once the
     transition finishes — so an open answer still reflows correctly if
     the window is resized or the text wraps differently. Closing walks
     the same path in reverse (auto -> measured px -> 0), because a
     transition from `auto` animates nothing at all. */
  var faqList = document.getElementById("faqList");

  function closePanel(item) {
    var panel = item.querySelector(".faq-a");
    panel.style.height = panel.scrollHeight + "px";
    void panel.offsetHeight; // flush the measured height before collapsing
    item.classList.remove("open");
    item.querySelector(".faq-q").setAttribute("aria-expanded", "false");
    panel.style.height = "0px";
  }

  function openPanel(item) {
    var panel = item.querySelector(".faq-a");
    item.classList.add("open");
    item.querySelector(".faq-q").setAttribute("aria-expanded", "true");
    /* With motion reduced the height transition is removed, so no
       `transitionend` ever arrives to release the panel to `auto`. Going
       straight to `auto` keeps the answer correct if the text later
       rewraps taller — otherwise it would be pinned to whatever height it
       happened to need at the moment it was opened, and clip. */
    panel.style.height = reduceMotion.matches ? "auto" : panel.scrollHeight + "px";
  }

  if (faqList) {
    faqList.addEventListener("click", function (e) {
      var btn = e.target.closest(".faq-q");
      if (!btn) return;
      var item = btn.closest(".faq-item");
      var wasOpen = item.classList.contains("open");
      faqList.querySelectorAll(".faq-item.open").forEach(closePanel);
      if (!wasOpen) openPanel(item);
    });

    faqList.addEventListener("transitionend", function (e) {
      if (e.propertyName !== "height") return;
      var item = e.target.closest(".faq-item");
      if (item && item.classList.contains("open")) e.target.style.height = "auto";
    });
  }

  /* ---------- Scroll reveals ---------- */

  /* One-shot: each element is unobserved the moment it lands, so the
     observer empties itself out as the visitor scrolls rather than
     tracking sixty elements for the life of the session. */
  var revealables = document.querySelectorAll(".reveal, .scatter-chip");

  if (reduceMotion.matches) {
    revealables.forEach(function (el) { el.classList.add("in"); });
  } else if ("IntersectionObserver" in window) {
    /* The bottom margin is a fixed pixel value, not a percentage. As a
       percentage it scales with the viewport, so on a tall enough window
       the dead zone swallows the last section of the page and its content
       never reveals at all — there is no scrolling left to trigger it.
       80px behaves identically on a phone and on a 6K display. */
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -80px 0px", threshold: 0.05 });
    revealables.forEach(function (el) { revealObserver.observe(el); });

    /* Belt and braces for the same failure mode: anything already sitting
       inside the viewport once everything has loaded is shown regardless
       of what the observer thinks. A visitor must never be able to reach
       a resting scroll position with invisible content on screen. */
    var sweep = function () {
      revealables.forEach(function (el) {
        if (el.classList.contains("in")) return;
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("in");
          revealObserver.unobserve(el);
        }
      });
    };
    window.addEventListener("load", sweep);
    window.addEventListener("resize", sweep, { passive: true });
  } else {
    revealables.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Liquid fields: only animate what's on screen ---------- */

  /* Six sections carry a liquid field. Left alone, all eighteen blobs
     would animate for the whole visit, including the five sections
     nobody is looking at. This pauses every field that isn't in view,
     which on a typical scroll means one or two are ever running. */
  var fields = document.querySelectorAll("[data-liquid]");

  if (!reduceMotion.matches && "IntersectionObserver" in window) {
    var liveObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("is-live", entry.isIntersecting);
      });
    }, { rootMargin: "20% 0px 20% 0px" });
    fields.forEach(function (el) { liveObserver.observe(el); });
  } else {
    // No observer support: run them rather than freeze the page flat.
    fields.forEach(function (el) { el.classList.add("is-live"); });
  }

  /* ---------- Hero pointer + scroll response ---------- */

  /* Only the hero responds to the pointer and to scroll. Motion
     hierarchy for the page is deliberately top-heavy: HIGH in the
     hero, MEDIUM on section entrances, LOW everywhere else. */
  var hero = document.querySelector(".hero");
  var heroLiquid = hero && hero.querySelector(".liquid");
  var heroInner = hero && hero.querySelector(".liquid-inner");
  var device = hero && hero.querySelector(".device");

  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  var pending = false;
  var pointerX = 0, pointerY = 0;
  var heroVisible = true;

  function applyFrame() {
    pending = false;

    if (heroInner) {
      // Blobs drift further than the device — parallax depth, cheaply.
      heroInner.style.setProperty("--lx", (pointerX * 26).toFixed(2));
      heroInner.style.setProperty("--ly", (pointerY * 20).toFixed(2));
    }
    if (device) {
      device.style.setProperty("--dx", (pointerX * -7).toFixed(2));
      device.style.setProperty("--dy", (pointerY * -5).toFixed(2));
    }
  }

  function queueFrame() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(applyFrame);
  }

  if (hero && !reduceMotion.matches && finePointer.matches) {
    // Listener is on the hero, not the window: once the visitor has
    // scrolled past it, no pointer maths is happening at all.
    hero.addEventListener("pointermove", function (e) {
      var rect = hero.getBoundingClientRect();
      // -1..1 from the centre of the hero.
      pointerX = (e.clientX - rect.left) / rect.width * 2 - 1;
      pointerY = (e.clientY - rect.top) / rect.height * 2 - 1;
      queueFrame();
    }, { passive: true });

    // Settle back to centre when the pointer leaves — the 1.1s ease on
    // .liquid-inner turns this into a slow drift home, not a snap.
    hero.addEventListener("pointerleave", function () {
      pointerX = 0;
      pointerY = 0;
      queueFrame();
    }, { passive: true });
  }

  /* Scroll parallax on the hero field only. scrollY is a cheap read and
     nothing is measured alongside it, so this never forces a layout. */
  var scrollPending = false;

  function applyScroll() {
    scrollPending = false;
    if (!heroLiquid || !heroVisible) return;
    heroLiquid.style.setProperty("--sy", (window.scrollY * 0.16).toFixed(1));
  }

  if (heroLiquid && !reduceMotion.matches) {
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
      }).observe(hero);
    }
    window.addEventListener("scroll", function () {
      if (scrollPending) return;
      scrollPending = true;
      requestAnimationFrame(applyScroll);
    }, { passive: true });
  }

  /* ---------- Header hairline ---------- */

  /* The nav is borderless over the hero and gains a hairline once the
     page has moved — the same behaviour as a large-title iOS navigation
     bar collapsing. Uses a sentinel element rather than a scroll
     handler, so it costs nothing per frame. */
  if (nav && "IntersectionObserver" in window) {
    var sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;";
    document.body.prepend(sentinel);
    new IntersectionObserver(function (entries) {
      nav.classList.toggle("scrolled", !entries[0].isIntersecting);
    }, { threshold: 0 }).observe(sentinel);
  }

  /* ---------- Video: load on approach ---------- */

  /* The film is 3.1MB. With `autoplay` set in the markup the browser
     ignores `preload="metadata"` and fetches the whole thing on load —
     so every visitor, on any connection, used to pay for a video sitting
     well below the fold before they had read the headline. The <source>
     is held in a data attribute until the section is near, which is the
     single largest performance change on this page. */
  var video = document.querySelector("video[data-src]");

  if (video) {
    var loadVideo = function () {
      if (video.dataset.loaded) return;
      video.dataset.loaded = "1";
      var source = document.createElement("source");
      source.src = video.dataset.src;
      source.type = "video/mp4";
      video.appendChild(source);
      video.load();
      // Autoplay only where it's wanted; reduced-motion visitors get the
      // poster and a control bar, and choose for themselves.
      if (!reduceMotion.matches) {
        var attempt = video.play();
        if (attempt && attempt.catch) attempt.catch(function () { video.controls = true; });
      } else {
        video.controls = true;
      }
    };

    if ("IntersectionObserver" in window) {
      var videoObserver = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        loadVideo();
        videoObserver.disconnect();
      }, { rootMargin: "300px 0px" });
      videoObserver.observe(video);
    } else {
      loadVideo();
    }
  }

  /* ---------- Pricing carousel dots ---------- */

  /* The carousel itself is pure CSS — scroll-snap does the work, and it
     keeps working with this file blocked. All that's added here is telling
     the visitor where they are, and letting them tap to move.

     Position comes from an IntersectionObserver rooted on the scroller
     rather than a scroll handler, per the no-layout-reads-on-scroll rule at
     the top of this file: momentum scrolling on iOS fires scroll events far
     faster than a card can change. */

  var priceGrid = document.getElementById("priceGrid");
  var priceDots = document.getElementById("priceDots");

  if (priceGrid && priceDots && "IntersectionObserver" in window) {
    var priceCards = priceGrid.querySelectorAll(".price-card");
    var dots = priceDots.querySelectorAll(".price-dot");

    /* The hint and dots are gated on the scroller actually overflowing, not
       on the breakpoint: there's a band around 800–860px where the layout
       has already switched to flex but both cards still fit, and telling
       someone to swipe something that can't move is worse than showing
       nothing. Re-checked on resize, and on load because web fonts can
       change the card heights and widths after first paint. */
    var pricingSection = document.getElementById("pricing");

    var syncCarouselState = function () {
      var overflows = priceGrid.scrollWidth > priceGrid.clientWidth + 1;
      if (pricingSection) pricingSection.classList.toggle("is-carousel", overflows);
      return overflows;
    };

    var carouselActive = function () {
      return pricingSection ? pricingSection.classList.contains("is-carousel") : false;
    };

    syncCarouselState();

    /* ResizeObserver rather than a window resize listener: it also catches
       the reflows a resize event never fires for — a late web font changing
       the card text metrics, or a scrollbar appearing and taking width off
       the container. Falls back to the resize event where it's missing. */
    if ("ResizeObserver" in window) {
      new ResizeObserver(syncCarouselState).observe(priceGrid);
    } else {
      window.addEventListener("resize", syncCarouselState, { passive: true });
    }
    // Card widths can settle after the grid's own box has stopped changing.
    window.addEventListener("load", syncCarouselState);

    var setActiveDot = function (index) {
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle("is-active", i === index);
      }
    };

    if (priceCards.length === dots.length) {
      var priceObserver = new IntersectionObserver(function (entries) {
        if (!carouselActive()) return;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          setActiveDot([].indexOf.call(priceCards, entry.target));
        });
      }, { root: priceGrid, threshold: 0.6 });

      for (var c = 0; c < priceCards.length; c++) priceObserver.observe(priceCards[c]);

      priceDots.addEventListener("click", function (e) {
        var dot = e.target.closest(".price-dot");
        if (!dot) return;
        var index = [].indexOf.call(dots, dot);
        var card = priceCards[index];
        if (!card) return;
        /* scrollIntoView would also scroll the *page* to bring the section
           into view, which yanks it around when the visitor only asked to
           change card. Scrolling the container directly moves one axis of
           one element.

           Measured from the two rects rather than card.offsetLeft, which is
           relative to the nearest positioned ancestor — that's .container
           here, not the scroller, so it would be off by the carousel's
           negative margin and padding. Reading layout inside a click is
           fine; the rule at the top of this file is about scroll handlers. */
        var cardRect = card.getBoundingClientRect();
        var gridRect = priceGrid.getBoundingClientRect();
        priceGrid.scrollTo({
          left: priceGrid.scrollLeft + (cardRect.left - gridRect.left)
                - (priceGrid.clientWidth - cardRect.width) / 2,
          behavior: reduceMotion.matches ? "auto" : "smooth"
        });
        setActiveDot(index);
      });
    }
  }

  /* ---------- Launch waitlist ---------- */

  /* Progressive enhancement over a plain <form> that already works on its
     own: without this block the browser posts natively and the visitor
     lands on the provider's own confirmation page. All this adds is
     staying on the page. Consequently nothing here invents the endpoint or
     the field name — both come from the markup, so changing provider never
     means editing JavaScript. */

  var notifyForm = document.getElementById("notifyForm");

  if (notifyForm) {
    var notifyStatus = document.getElementById("notifyStatus");
    var notifyInput = document.getElementById("notifyEmail");
    var notifyTrap = document.getElementById("notifyCompany");
    var notifyBtn = notifyForm.querySelector(".notify-btn");
    var notifySent = false;

    /* Deliberately permissive. The only thing worth catching here is a
       genuine typo — no @, nothing after the dot — because the provider
       validates properly and a regex that tries to be clever rejects real
       addresses. */
    var looksLikeEmail = function (value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    };

    var setState = function (state, message) {
      notifyForm.classList.remove("is-sending", "is-error", "is-invalid", "is-done");
      if (state) notifyForm.classList.add(state);
      notifyStatus.textContent = message || "";
      var busy = state === "is-sending";
      notifyBtn.disabled = busy || state === "is-done";
      notifyInput.disabled = busy;
    };

    notifyForm.addEventListener("submit", function (e) {
      // The endpoint is a placeholder until the mailing-list account exists.
      // Submitting anyway would POST into nothing and lose the signup while
      // showing the visitor a success state, so refuse loudly instead.
      if (notifyForm.action.indexOf("PASTE_FORM_ENDPOINT_HERE") !== -1) {
        e.preventDefault();
        setState("is-error", "The signup form isn't connected yet — please check back shortly.");
        return;
      }

      if (notifySent) { e.preventDefault(); return; }

      // A filled honeypot is a bot. Drop it silently and show the same
      // success it would have got, so it has nothing to learn from.
      if (notifyTrap && notifyTrap.value) {
        e.preventDefault();
        notifySent = true;
        setState("is-done", "Thanks — you're on the list.");
        return;
      }

      var email = notifyInput.value.trim();
      if (!looksLikeEmail(email)) {
        e.preventDefault();
        setState("is-invalid", "That doesn't look like an email address.");
        notifyInput.focus();
        return;
      }

      // Everything below needs fetch + FormData. Where either is missing,
      // fall through to the browser's own submit rather than blocking it.
      if (!window.fetch || !window.FormData) return;

      e.preventDefault();

      /* Built before the sending state, not after: that state disables the
         input, and a disabled field is omitted from FormData entirely —
         which would post an empty address. */
      var data = new FormData(notifyForm);
      data.delete("hp_company");

      setState("is-sending", "Signing you up…");

      fetch(notifyForm.action, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" }
      })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          notifySent = true;
          setState("is-done", "You're on the list. We'll email you on launch day.");
        })
        .catch(function () {
          /* Either the network failed or the provider didn't send CORS
             headers — and from here those are indistinguishable, since a
             blocked response still means the POST may well have arrived.
             Handing it to a native submit is the recovery: worst case the
             address arrives twice, which every provider dedupes, and best
             case a signup that would have been silently lost is kept. */
          setState(null, "");
          notifyForm.submit();
        });
    });

    // Clear a validation complaint as soon as they start fixing it.
    notifyInput.addEventListener("input", function () {
      if (notifyForm.classList.contains("is-invalid") || notifyForm.classList.contains("is-error")) {
        setState(null, "");
      }
    });
  }
})();
