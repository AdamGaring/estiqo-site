/* ============================================================
   Estiqo — interactive app mock-up in the hero
   ------------------------------------------------------------
   Replaces the flat `img/portfolio-full.jpg` screenshot that used
   to sit inside the hero phone with a working reproduction of the
   app: four tabs, real scrolling, and portfolio tiles that open
   the property they name.

   Why a DOM rebuild and not an image with hotspots:
   an image plus absolutely-positioned <a> boxes was the cheap
   option, and it fails in exactly the way this feature can't
   afford. The hotspots drift the moment the phone changes width
   (300px / 250px / 228px across the breakpoints), a screenshot
   cannot scroll, and the tap targets are guesses laid over pixels
   rather than the controls themselves. Here every control IS a
   real element at the app's own measurements, so the click boxes
   are correct by construction and stay correct at any scale.

   Geometry: the mock is built at the iPhone's real point size,
   402 x 874, and scaled to fit the phone by a single transform in
   app-mock.css. Every number below is therefore a genuine iOS
   point value lifted from the app's source — DS.pagePadding = 20,
   DS.cardRadius = 19, StatTile's 13/12 padding, FloatingTabBar's
   73pt items — not an eyeballed approximation. A transform scales
   hit-testing along with the pixels, so accuracy at 402pt is
   accuracy at every width the page ever renders it.

   Content is the app's own demo portfolio (Models/SampleData.swift):
   the same two properties, figures, leases, loans, key dates,
   documents and contacts a visitor sees on first launch via
   Settings -> "Add demo properties". Nothing here is invented.

   Degradation: if this file is blocked or throws, the catch at the
   bottom puts the original screenshot back, and the page is
   exactly what it was before.
   ============================================================ */

(function () {
  "use strict";

  var root = document.getElementById("appMock");
  if (!root) return;

  /* The page's standing rule is that everything degrades. A mock-up
     that half-built and then threw would leave an empty phone in the
     hero — worse than the screenshot it replaced — so the whole thing
     runs inside a guard that restores that screenshot on any failure.
     `build()` writes the mock in one assignment, so there is no
     partially-rendered state to clean up. */
  try {
    run();
  } catch (err) {
    root.classList.remove("mock-host");
    root.innerHTML =
      '<img src="img/portfolio-full.jpg" width="598" height="1300" ' +
      'alt="Estiqo\u2019s Portfolio screen: two investment properties with photos, ' +
      'showing $1.44M estimated value, $670K total debt and +$536 a month cash flow.">';
    if (window.console && console.warn) console.warn("Estiqo app mock-up disabled:", err);
    return;
  }

  function run() {

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Icons ----------
     Simplified stand-ins for the SF Symbols the app uses, drawn on
     the same 24-unit grid so they share one stroke weight. Named
     after the symbol they stand for, so a row's icon can be traced
     back to the Swift that specifies it. */

  var S = {                                        // stroked
    chevronRight: "M9.5 5.5 16 12l-6.5 6.5",
    chevronDown: "M5.5 9.5 12 16l6.5-6.5",
    key: "M15.5 3a5.5 5.5 0 1 0-4.9 8L9 12.6V15H6.6L4 17.6V21h4l7.1-7.1a5.5 5.5 0 0 0 .4-10.9ZM16.8 7.2h.01",
    bank: "M3 10h18M4.5 10v8M9 10v8M15 10v8M19.5 10v8M2.5 21h19M12 2.5 21 7H3l9-4.5",
    calendar: "M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5ZM4 9h16M8 2.5V5M16 2.5V5M7.5 12.5h3M7.5 16h3M13.5 12.5h3M13.5 16h3",
    doc: "M14 2.5H7A2.5 2.5 0 0 0 4.5 5v14A2.5 2.5 0 0 0 7 21.5h10a2.5 2.5 0 0 0 2.5-2.5V8Zm0 0V8h5.5",
    person: "M12 12.4a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM4.6 20.8c.6-3.9 3.7-6.4 7.4-6.4s6.8 2.5 7.4 6.4",
    contactCard: "M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5ZM8 11.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-2.6 4.4c.3-1.5 1.4-2.4 2.6-2.4s2.3.9 2.6 2.4M14 9.5h4.5M14 13h3",
    offset: "M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19ZM9.5 7.5 6.5 10.5l3 3M6.8 10.5h10M14.5 16.5l3-3-3-3M17.2 13.5H7",
    bed: "M3 18v-7M3 13h11a4 4 0 0 1 4 4v1M3 18h18M18 18v-1M6.5 10.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z",
    shower: "M6 21v-7.5A5.5 5.5 0 0 1 11.5 8h1M12.5 4.5 16 8M12.5 4.5a2.5 2.5 0 0 1 4-.5M10 14.5h.01M13.5 16.5h.01M9.5 18.5h.01M13 12.5h.01",
    car: "M4 16.5v2.5M20 16.5v2.5M3 16.5h18v-4l-1.6-.6-2-4.4a2 2 0 0 0-1.8-1.1H8.4a2 2 0 0 0-1.8 1.1l-2 4.4L3 12.5ZM4.6 11.9h14.8M6.5 14.4h1.5M16 14.4h1.5",
    camera: "M3.5 8.5A2 2 0 0 1 5.5 6.5h1.8L8.6 4.2h6.8l1.3 2.3h1.8a2 2 0 0 1 2 2v8.3a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2ZM12 16.8a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z",
    checkCircle: "M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19ZM8 12.2l2.8 2.8L16.2 9.6",
    houseFill: "M12 3.2 2.8 10.6a1 1 0 0 0 .6 1.8h1.2v6.4a2.2 2.2 0 0 0 2.2 2.2h3v-5.2h4.4V21h3a2.2 2.2 0 0 0 2.2-2.2v-6.4h1.2a1 1 0 0 0 .6-1.8Z@fill",
    buildingFill: "M5 2.8h14v18.4h-5.4v-5h-3.2v5H5ZM8.2 6.2h2.4v2.4H8.2zM13.4 6.2h2.4v2.4h-2.4zM8.2 10.8h2.4v2.4H8.2zM13.4 10.8h2.4v2.4h-2.4z@fill",
    dollarSquare: "M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5ZM12 7v10M14.5 9.4H10.8a1.9 1.9 0 0 0 0 3.8h2.4a1.9 1.9 0 0 1 0 3.8H9.2",
    percent: "M6.8 9.6a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6ZM17.2 20a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6ZM19 5 5 19",
    barChart: "M3.5 20.5h17M6.6 20.5v-6.8M11 20.5V7.4M15.4 20.5v-9.6M19.8 20.5V4.2",
    binoculars: "M7 4.5h3v4h4v-4h3l2.5 9v4a3 3 0 0 1-6 0v-4h-3v4a3 3 0 0 1-6 0v-4ZM10 12.5h4",
    plus: "M12 5.5v13M5.5 12h13",
    magnifier: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM16 16l4.5 4.5",
    appearance: "M12 21.5a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19Z|M12 2.5a9.5 9.5 0 0 0 0 19Z@fill",
    bell: "M12 3a6 6 0 0 0-6 6c0 4-1.5 5.5-1.5 5.5h15S18 13 18 9a6 6 0 0 0-6-6ZM10.2 18a2 2 0 0 0 3.6 0",
    faceid: "M4 8.5V6.5A2.5 2.5 0 0 1 6.5 4h2M20 8.5V6.5A2.5 2.5 0 0 0 17.5 4h-2M4 15.5v2A2.5 2.5 0 0 0 6.5 20h2M20 15.5v2a2.5 2.5 0 0 1-2.5 2.5h-2M9 10v1.5M15 10v1.5M12 10v3.5h-1M9.5 16c1.6 1.2 3.4 1.2 5 0",
    shield: "M12 3 5 5.8v5.4c0 4.2 2.9 7.6 7 9.8 4.1-2.2 7-5.6 7-9.8V5.8Zm0 0v18",
    bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9v.2h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3Z",
    crown: "M4 18h16M4.5 15 3 7l5 3.5L12 4l4 6.5L21 7l-1.5 8Z",
    share: "M12 15.5V3.5M8 7l4-3.5L16 7M5 13v5.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V13",
    docDown: "M12 3.5v10M8.5 10 12 13.5 15.5 10M5 15v3.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V15",
    docUp: "M12 13.5v-10M8.5 7 12 3.5 15.5 7M5 15v3.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V15",
    hand: "M8.5 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-.5V6a1.5 1.5 0 0 1 3 0v7.5c0 4-2.6 7-6.3 7-2.6 0-4.2-1.3-5.4-3.4l-2.3-4a1.5 1.5 0 0 1 2.4-1.7l1.6 2",
    star: "m12 3.8 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 10l5.9-.9Z",
    envelope: "M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5ZM3.4 6.6l8.6 6 8.6-6",
    sparkles: "m12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9ZM18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z",
    gear: "M12 15.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z"
  };

  function icon(path, cls, fill) {
    var d = String(path).split("|");
    var out = '<svg class="mi ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"' +
      (fill ? ' data-fill="1"' : "") + ">";
    for (var i = 0; i < d.length; i++) {
      // A sub-path ending "@fill" is filled rather than stroked — what a
      // half-filled symbol like circle.lefthalf.filled needs, one outline
      // plus one solid half.
      var solid = d[i].slice(-5) === "@fill";
      out += '<path d="' + (solid ? d[i].slice(0, -5) : d[i]) + '"' +
        (solid ? ' class="solid"' : "") + "/>";
    }
    return out + "</svg>";
  }

  /* ---------- Tab bar glyphs ----------
     The four tab icons get their own artwork rather than going through
     the path table above, for two reasons. They are the most-looked-at
     graphics in the mock, and they are the only ones whose real size is
     measurable: the marketing capture is 598px wide for a 402pt screen,
     so a glyph in it can be measured to a tenth of a point.

     Measured off img/portfolio-full.jpg, at `scaledFont(size: 19)`:
         square.grid.2x2   17.5 x 17.5 pt
         house             22.2 x 19.5 pt
         folder            21.5 x 16.8 pt
         gearshape         20.2 x 19.5 pt
     — all centred on a common axis. An SF Symbol's drawn glyph is much
     larger than its nominal point size, which the first version of this
     missed: those four were being drawn at 12-15pt inside a 19px box,
     about a third too small, and that was the whole reason the tab bar
     read as "close, but not the app". Everything below is laid out on a
     24-unit grid where one unit is one point, so the numbers above can
     be read straight off the coordinates.

     Filled variants are genuinely different artwork, not the same path
     with a fill: the app swaps `icon` for `icon + ".fill"` on selection,
     and SF's filled symbols are drawn slightly larger to compensate for
     losing the stroke's outward half. */

  var TAB_ART = {
    // square.grid.2x2 — four 7.5pt squares, 2.5pt apart, spanning 3.25..20.75.
    portfolio: {
      off: '<rect x="4.1" y="4.1" width="5.8" height="5.8" rx="1.5"/>' +
           '<rect x="14.1" y="4.1" width="5.8" height="5.8" rx="1.5"/>' +
           '<rect x="4.1" y="14.1" width="5.8" height="5.8" rx="1.5"/>' +
           '<rect x="14.1" y="14.1" width="5.8" height="5.8" rx="1.5"/>',
      on: '<rect class="solid" x="3.25" y="3.25" width="7.5" height="7.5" rx="1.9"/>' +
          '<rect class="solid" x="13.25" y="3.25" width="7.5" height="7.5" rx="1.9"/>' +
          '<rect class="solid" x="3.25" y="13.25" width="7.5" height="7.5" rx="1.9"/>' +
          '<rect class="solid" x="13.25" y="13.25" width="7.5" height="7.5" rx="1.9"/>'
    },
    // house — eaves overhang the walls, and the door is a filled shape
    // even in the outline symbol.
    property: {
      off: '<path d="M1.75 11.5 12 3.1l10.25 8.4"/>' +
           '<path d="M4.45 9.3v9.4a2.2 2.2 0 0 0 2.2 2.2h10.7a2.2 2.2 0 0 0 2.2-2.2V9.3"/>' +
           '<path class="solid" d="M9.8 20.9v-3.2a2.2 2.2 0 0 1 4.4 0v3.2Z"/>',
      on: '<path class="solid" d="M12 2.25l10.9 8.95a1 1 0 0 1-.63 1.78H20.6v6.57a2.2 2.2 0 0 1-2.2 2.2H5.6a2.2 2.2 0 0 1-2.2-2.2v-6.57H1.73a1 1 0 0 1-.63-1.78ZM9.8 21.75v-4.6a2.2 2.2 0 0 1 4.4 0v4.6Z"/>'
    },
    // folder — the tab rises from the left of the top edge.
    documents: {
      off: '<path d="M2.1 17.15V6.85a2.4 2.4 0 0 1 2.4-2.4h4.55l2.2 2.6h8.25a2.4 2.4 0 0 1 2.4 2.4v7.7a2.4 2.4 0 0 1-2.4 2.4H4.5a2.4 2.4 0 0 1-2.4-2.4Z"/>',
      on: '<path class="solid" d="M1.25 17.6V6.4a2.6 2.6 0 0 1 2.6-2.6h4.9l2.35 2.8h8.75a2.6 2.6 0 0 1 2.6 2.6v8.4a2.6 2.6 0 0 1-2.6 2.6H3.85a2.6 2.6 0 0 1-2.6-2.6Z"/>'
    },
    // gearshape — eight teeth around a hub. Generated from the same
    // polar sweep for both weights so the two never drift apart.
    settings: {
      off: '<path d="M10.31 2.90 L13.69 2.90 L13.58 5.44 L15.53 6.24 L17.24 4.38 L19.62 6.76 L17.76 8.47 L18.56 10.42 L21.10 10.31 L21.10 13.69 L18.56 13.58 L17.76 15.53 L19.62 17.24 L17.24 19.62 L15.53 17.76 L13.58 18.56 L13.69 21.10 L10.31 21.10 L10.42 18.56 L8.47 17.76 L6.76 19.62 L4.38 17.24 L6.24 15.53 L5.44 13.58 L2.90 13.69 L2.90 10.31 L5.44 10.42 L6.24 8.47 L4.38 6.76 L6.76 4.38 L8.47 6.24 L10.42 5.44 Z"/>' +
           '<circle cx="12" cy="12" r="3.4"/>',
      on: '<path class="solid" d="M10.16 2.07 L13.84 2.07 L13.73 4.80 L15.87 5.69 L17.72 3.68 L20.32 6.28 L18.31 8.13 L19.20 10.27 L21.93 10.16 L21.93 13.84 L19.20 13.73 L18.31 15.87 L20.32 17.72 L17.72 20.32 L15.87 18.31 L13.73 19.20 L13.84 21.93 L10.16 21.93 L10.27 19.20 L8.13 18.31 L6.28 20.32 L3.68 17.72 L5.69 15.87 L4.80 13.73 L2.07 13.84 L2.07 10.16 L4.80 10.27 L5.69 8.13 L3.68 6.28 L6.28 3.68 L8.13 5.69 L10.27 4.80 ZM12 15.7a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4Z"/>'
    }
  };

  function tabIcon(inner, cls) {
    return '<svg class="mi ' + cls + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + inner + "</svg>";
  }

  /* ---------- Dates ----------
     Everything dated is computed from today rather than typed in, for
     the same reason SampleData.swift keeps having to be re-tuned: a
     hardcoded date is right on the day it's written and drifting from
     then on. A key date that has already passed would be filtered out
     by the app and must not appear here either, and an amber "due
     soon" pill on a date three months gone is worse than no pill.

     Rolling a past anniversary forward a year is not an invention:
     insurance renewals, rates notices, lease terms and smoke-alarm
     services all genuinely recur annually, which is why the app's
     Key Dates list only ever shows the next one. */

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June",
                     "July", "August", "September", "October", "November", "December"];
  var TODAY = new Date();
  var TODAY_MIDNIGHT = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());

  /* The demo's documents are created the moment "Add demo properties" is
     tapped, so their `addedAt` is always today. */
  var DOC_DATE = TODAY.getDate() + " " + MONTHS[TODAY.getMonth()] + " " + TODAY.getFullYear();
  var THIS_MONTH = MONTHS_LONG[TODAY.getMonth()];

  /* Next occurrence of a day/month on or after today. */
  function nextOccurrence(day, month) {
    var d = new Date(TODAY.getFullYear(), month - 1, day);
    if (d < TODAY_MIDNIGHT) d = new Date(TODAY.getFullYear() + 1, month - 1, day);
    return d;
  }

  /* KeyDate.isSoon — within 45 days, which is what tints the pill amber. */
  function keyDate(title, sub, day, month) {
    var d = nextOccurrence(day, month);
    var days = Math.round((d - TODAY_MIDNIGHT) / 86400000);
    return { title: title, sub: sub, date: d, when: d.getDate() + " " + MONTHS[d.getMonth()], soon: days <= 45 };
  }

  function longDate(d) {
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }

  /* ---------- Content ----------
     Straight from Models/SampleData.swift. The figures are the ones
     that file solves for by hand (see its comments): 4.9% and 4.3%
     gross yield on cost, +$417 and +$119 a month, $1.44M / $670K /
     +$536 across the portfolio. */

  var PROPERTIES = [
    {
      id: "banksia",
      name: "12 Banksia St",
      street: "12 Banksia Street",
      suburb: "Newcastle NSW 2300",
      spec: "4-2-2 House",
      type: "House",
      beds: 4, baths: 2, cars: 2,
      photo: "img/mock/banksia.jpg",
      photoAlt: "A double-storey brick and render house at dusk, the demo property 12 Banksia Street.",
      tags: "Positively geared · Renovating",
      value: "$820K",
      yield: "4.9%",
      cash: "+$417",
      purchasePrice: "$685,000",
      purchaseDate: "14 March 2022",
      balanceAsOf: "Mar 2022",
      cashflow: [
        { icon: S.key, title: "Rent", sub: "Automatic · tap to amend", amount: "+$2,817", tone: "pos", chevron: true },
        { icon: S.bank, title: "Loan repayment", sub: "Automatic", amount: "-$2,170", tone: "neg" },
        { icon: S.contactCard, title: "Management fee", sub: "5 " + MONTHS[TODAY.getMonth()], amount: "-$230", tone: "ink", open: true }
      ],
      loan: {
        lender: "ANZ",
        balance: "$395,000",
        rate: "6.14% variable",
        repayment: "$2,170/mo",
        offset: "$32,500",
        effective: "$362,500",
        saving: "$1,996/yr"
      },
      keyDates: [
        keyDate("Landlord insurance renewal", "AAMI · Policy 88-4021", 12, 8),
        keyDate("Council rates due", "City of Newcastle · Q1", 31, 8),
        keyDate("Lease expires", "Jake & Emily Turner", 30, 11),
        keyDate("Smoke alarm service", "Annual compliance check", 2, 2)
      ],
      // Both leases, newest first — the app lists every lease on the
      // property, not just the active one, so the previous tenancy that
      // covers the rest of the financial year stays visible.
      leases: [
        { tenants: "Jake & Emily Turner", rent: "$650", bond: "$2,600", ends: 30, endsMonth: 11 },
        { tenants: "Priya Nair", rent: "$620", bond: "$2,480", ends: 29, endsMonth: 11, lastYear: true }
      ],
      docs: [
        { title: "Council Rates Notice — Q4", cat: "Rates & levies" },
        { title: "Entry Condition Report", cat: "Inspection" },
        { title: "Lease Agreement — Turner", cat: "Lease" },
        { title: "Landlord Insurance Policy", cat: "Insurance" },
        { title: "Depreciation Schedule", cat: "Depreciation" },
        { title: "Loan Approval Letter", cat: "Loan" },
        { title: "Contract of Sale", cat: "Contract" }
      ],
      contacts: [
        { name: "Sarah Chen", role: "Property Manager · Ray White" },
        { name: "Mark Ellis", role: "Mortgage Broker · Loan Market" },
        { name: "Hannah Cole", role: "Accountant · HC Advisory" }
      ]
    },
    {
      id: "mainst",
      name: "12/150 Main St",
      street: "12/150 Main Street",
      suburb: "Brisbane QLD 4000",
      spec: "2-2-1 Apartment",
      type: "Apartment",
      beds: 2, baths: 2, cars: 1,
      photo: "img/mock/main-st.jpg",
      photoAlt: "A warm timber-lined apartment living room, the demo property 12/150 Main Street.",
      tags: "Positively geared · Strata",
      value: "$620K",
      yield: "4.3%",
      cash: "+$119",
      purchasePrice: "$545,000",
      purchaseDate: "20 June 2023",
      balanceAsOf: "Jun 2023",
      cashflow: [
        { icon: S.key, title: "Rent", sub: "Automatic · tap to amend", amount: "+$1,950", tone: "pos", chevron: true },
        { icon: S.bank, title: "Loan repayment", sub: "Automatic", amount: "-$1,831", tone: "neg" }
      ],
      loan: {
        lender: "Commonwealth Bank",
        balance: "$275,000",
        rate: "6.05% variable",
        repayment: "$1,831/mo",
        offset: null
      },
      keyDates: [
        keyDate("Landlord insurance renewal", "QBE · Policy 31207", 5, 9),
        keyDate("Body corporate AGM", "Main Street Apartments", 20, 10),
        keyDate("Lease expires", "Michael Osei", 30, 6)
      ],
      leases: [
        { tenants: "Michael Osei", rent: "$450", bond: "$1,800", ends: 30, endsMonth: 6 },
        { tenants: "Michael Osei", rent: "$430", bond: "$1,720", ends: 30, endsMonth: 6, lastYear: true }
      ],
      docs: [
        { title: "Council Rates Notice — Q4", cat: "Rates & levies" },
        { title: "Building & Pest Inspection", cat: "Inspection" },
        { title: "Entry Condition Report", cat: "Inspection" },
        { title: "Lease Agreement — Osei", cat: "Lease" },
        { title: "Landlord Insurance Policy", cat: "Insurance" },
        { title: "Loan Approval Letter", cat: "Loan" },
        { title: "Contract of Sale", cat: "Contract" }
      ],
      contacts: [
        { name: "Priya Desai", role: "Property Manager · Place Property" },
        { name: "Tom Reilly", role: "Mortgage Broker · Aussie Home Loans" }
      ]
    }
  ];

  var TABS = [
    { id: "portfolio", label: "Portfolio" },
    { id: "property", label: "Property" },
    { id: "documents", label: "Documents" },
    { id: "settings", label: "Settings" }
  ];

  /* ---------- Small builders ---------- */

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* DSRow (Theme.swift): 34pt tinted icon tile, title 15.5, subtitle
     12.5, 16/12 padding. `open` renders the small trailing button that
     is the row's only tap target in the app — deliberately not the whole
     row, so a tap can never be mistaken for the start of a scroll. */
  function row(o) {
    var trailing = "";
    if (o.amount) {
      trailing += '<span class="mrow-amt t-' + (o.tone || "ink") + '">' + esc(o.amount) + "</span>";
    }
    if (o.stack) {
      trailing += '<span class="mrow-stack"><b>' + esc(o.stack[0]) + "</b><i>" + esc(o.stack[1]) + "</i></span>";
    }
    if (o.pill) {
      trailing += '<span class="mrow-pill' + (o.soon ? " soon" : "") + '">' + esc(o.pill) + "</span>";
    }
    if (o.menu) {
      trailing += '<span class="mrow-menu">' + esc(o.menu) + icon(S.chevronDown) + "</span>";
    }
    if (typeof o.switchOn === "boolean") {
      trailing += '<span class="mswitch' + (o.switchOn ? " on" : "") + '"></span>';
    }
    var tail = o.open
      ? '<span class="mrow-open">' + icon(S.chevronRight) + "</span>"
      : (o.chevron ? '<span class="mrow-chev">' + icon(S.chevronRight) + "</span>" : "");
    return '<div class="mrow">' +
      '<span class="mrow-ic">' + icon(o.icon) + "</span>" +
      '<span class="mrow-txt"><b>' + esc(o.title) + "</b>" +
      (o.sub ? "<i>" + esc(o.sub) + "</i>" : "") + "</span>" +
      '<span class="mrow-trail">' + trailing + tail + "</span>" +
      "</div>";
  }

  function divider() { return '<div class="mdiv"></div>'; }

  function rows(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      out.push(row(list[i]));
      if (i < list.length - 1) out.push(divider());
    }
    return out.join("");
  }

  /* SectionHeader: 19pt bold, 5pt horizontal inset, 9pt below. */
  function header(title, action) {
    return '<div class="msec"><h3>' + esc(title) + "</h3>" +
      (action ? '<span class="msec-a">' + esc(action) + "</span>" : "") + "</div>";
  }

  /* StatTile: uppercase 10.5pt label reserving 27pt so siblings match
     height, then a 17.5pt rounded-bold figure with an optional suffix. */
  function stat(label, value, tone, suffix) {
    return '<div class="mstat"><span class="mstat-l">' + esc(label) + "</span>" +
      '<span class="mstat-v"><b class="t-' + (tone || "ink") + '">' + esc(value) + "</b>" +
      (suffix ? "<i>" + esc(suffix) + "</i>" : "") + "</span></div>";
  }

  /* ---------- Screens ---------- */

  function portfolioScreen() {
    var tiles = PROPERTIES.map(function (p, i) {
      return '<button class="mtile" type="button" data-open="' + p.id + '">' +
        // Neither tile is lazy: both sit in the hero, above the fold, and
        // the second one was painting as an empty white card while the
        // loader waited for a scroll that had already happened. They are
        // also the only two photos in the whole mock — the property hero
        // and the switcher sheet reuse these exact URLs from cache.
        '<span class="mtile-ph"><img src="' + p.photo + '" alt="' + esc(p.photoAlt) + '" width="800" height="600"' +
        (i === 0 ? ' fetchpriority="high"' : "") + "></span>" +
        '<span class="mtile-b">' +
        '<span class="mtile-l"><b>' + esc(p.name) + "</b><i>" + esc(p.spec + " · " + p.suburb) + "</i>" +
        '<em>' + esc(p.tags) + "</em></span>" +
        '<span class="mtile-r"><b>' + esc(p.value) + "</b>" +
        '<i><span>' + esc(p.yield) + ' on cost</span><span class="t-pos">' + esc(p.cash) + "/mo</span></i></span>" +
        "</span></button>";
    }).join("");

    // PortfolioView shows this row whenever there are tags to filter by
    // and more than one property — which the demo portfolio satisfies, so
    // the app really does draw it here. Leaving it out was also what let
    // the "Add a property" button sit on screen under the tab bar, where
    // the real screen has it comfortably below the fold.
    var chips = ["All", "Positively geared", "Renovating", "Strata"]
      .map(function (c, i) {
        return '<span class="mchip' + (i === 0 ? " on" : "") + '">' + esc(c) + "</span>";
      }).join("");

    return '<div class="mpad">' +
      '<div class="mhead"><h2>Portfolio</h2><p>2 properties</p></div>' +
      '<div class="mstats">' +
        stat("EST. VALUE", "$1.44M") +
        stat("TOTAL DEBT", "$670K") +
        stat("CASH FLOW", "+$536", "pos", "/mo") +
      "</div>" +
      '<button class="mcard mnext" type="button" data-next="1">' +
        '<span class="mnext-ic">' + icon(S.binoculars) + "</span>" +
        '<span class="mnext-t"><b>Next Property</b><i>Equity snapshot, due diligence &amp; calculators</i></span>' +
        '<span class="mrow-chev">' + icon(S.chevronRight) + "</span>" +
      "</button>" +
      '<div class="mchips">' + chips + "</div>" +
      '<div class="mtiles">' + tiles + "</div>" +
      '<button class="mbig" type="button">' + icon(S.plus) + "Add a property</button>" +
      "</div>";
  }

  function propertyScreen(p) {
    var loanRows = [{
      icon: S.bank, title: p.loan.lender, sub: "Balance · " + p.loan.balance,
      stack: [p.loan.rate, p.loan.repayment], open: true
    }];
    if (p.loan.offset) {
      loanRows.push({
        icon: S.offset,
        title: "Offset · " + p.loan.offset,
        sub: "Effective balance · " + p.loan.effective,
        stack: ["Est. saving", p.loan.saving], savingStack: true
      });
    }

    // Past dates are filtered out and the rest sorted, exactly as
    // `keyDatesSection` does — an expired date never reaches this list
    // in the app, so it must not reach it here.
    var keyDateRows = p.keyDates
      .filter(function (d) { return d.date >= TODAY_MIDNIGHT; })
      .sort(function (a, b) { return a.date - b.date; })
      .map(function (d) {
        return { icon: S.calendar, title: d.title, sub: d.sub, pill: d.when, soon: d.soon, open: true };
      });

    // Three, not all seven: `documentsSection` shows a `prefix(3)`
    // preview and sends you to the Documents tab for the rest.
    var docRows = p.docs.slice(0, 3).map(function (d) {
      return {
        icon: S.doc, title: d.title,
        sub: d.cat + " · " + MONTHS[TODAY.getMonth()] + " " + TODAY.getFullYear(),
        open: true
      };
    });

    // The current lease ends on the next occurrence of its day/month;
    // the one before it ended on the occurrence a year earlier. Deriving
    // the second from the first is what keeps the pair a year apart —
    // computing each independently is what put the active lease a year
    // further out than it should have been.
    var leaseEnd = nextOccurrence(p.leases[0].ends, p.leases[0].endsMonth);
    var leaseRows = p.leases.map(function (l) {
      var end = l.lastYear
        ? new Date(leaseEnd.getFullYear() - 1, l.endsMonth - 1, l.ends)
        : nextOccurrence(l.ends, l.endsMonth);
      return {
        icon: S.key, title: l.tenants,
        sub: l.rent + "/wk · Bond " + l.bond + " · Ends " + longDate(end),
        open: true
      };
    });

    var contactRows = p.contacts.map(function (c) {
      return { icon: S.person, title: c.name, sub: c.role, open: true };
    });

    return '<div class="mhero">' +
      '<img src="' + p.photo + '" alt="' + esc(p.photoAlt) + '" width="800" height="600" loading="lazy">' +
      '<span class="mhero-scrim"></span>' +
      '<span class="mhero-btns">' +
        '<span class="mhero-b">' + icon(S.camera) + "</span>" +
        '<span class="mhero-b"><span class="mdots"></span></span>' +
      "</span>" +
      '<span class="mhero-t"><b>' + esc(p.street) + "</b><i>" + esc(p.suburb) + "</i>" +
      '<span class="mspecs">' +
        '<span>' + icon(S.bed) + p.beds + "</span>" +
        '<span>' + icon(S.shower) + p.baths + "</span>" +
        '<span>' + icon(S.car) + p.cars + "</span>" +
        '<em>' + esc(p.type) + "</em>" +
      "</span></span>" +
      "</div>" +

      '<div class="mprice"><span><i>PURCHASE PRICE</i><b>' + esc(p.purchasePrice) + "</b></span>" +
      "<em>" + esc(p.purchaseDate) + "</em></div>" +

      '<div class="mpad mpad-flush">' +
        '<div class="mstats">' +
          stat("EST. VALUE", p.value) +
          stat("GROSS YIELD ON COST", p.yield) +
          stat("CASH FLOW", p.cash, "pos", "/mo") +
        "</div>" +

        '<div class="msection">' + header("Cash Flow — " + THIS_MONTH, "＋ Log") +
          '<div class="mcard mlist">' + rows(p.cashflow) + divider() +
          '<div class="mlink">See all transactions</div>' + divider() +
          '<div class="mlink">Import from a spreadsheet</div></div>' +
        "</div>" +

        '<div class="msection">' + header("Loan", "＋ Add") +
          '<div class="mcard mlist">' + rows(loanRows) + "</div>" +
          '<p class="mfoot">Balance falls automatically as repayments are made, estimated from today\u2019s rate and repayment held constant since ' +
          esc(p.balanceAsOf) + '. Confirm it against your lender\u2019s statement at least once a year.</p>' +
        "</div>" +

        '<div class="msection">' + header("Key Dates", "＋ Add") +
          '<div class="mcard mlist">' + rows(keyDateRows) + "</div>" +
        "</div>" +

        '<div class="msection">' + header("Leases", "＋ Add") +
          '<div class="mcard mlist">' + rows(leaseRows) + "</div>" +
        "</div>" +

        '<div class="msection">' + header("Documents", "＋ Add") +
          '<div class="mcard mlist">' + rows(docRows) + "</div>" +
        "</div>" +

        '<div class="msection">' + header("Contacts", "＋ Add") +
          '<div class="mcard mlist">' + rows(contactRows) + "</div>" +
        "</div>" +
      "</div>";
  }

  function documentsScreen(p, all) {
    var list;
    if (all) {
      list = [];
      PROPERTIES.forEach(function (q) {
        q.docs.forEach(function (d) {
          list.push({ icon: S.doc, title: d.title, sub: d.cat + " · " + DOC_DATE + " · " + q.name, open: true });
        });
      });
    } else {
      list = p.docs.map(function (d) {
        return { icon: S.doc, title: d.title, sub: d.cat + " · " + DOC_DATE, open: true };
      });
    }

    var banner = all ? "" :
      '<div class="meofy"><span class="meofy-t"><b>EOFY pack — FY 2025–26</b>' +
      "<i>Income, expenses &amp; receipts, ready for your accountant</i></span>" +
      '<span class="meofy-b">Export</span></div>';

    return '<div class="mpad mpad-docs">' +
      '<div class="mhead mhead-docs"><div><h2>Documents</h2><p>' +
      esc(all ? "All properties · 14 documents" : p.name + " · " + p.docs.length + " documents") +
      "</p></div><span class=\"mselect\">Select</span></div>" +
      banner +
      '<div class="mseg" role="group" aria-label="Document scope">' +
        '<button type="button" data-seg="this" class="' + (all ? "" : "on") + '" aria-pressed="' + (!all) + '">This property</button>' +
        '<button type="button" data-seg="all" class="' + (all ? "on" : "") + '" aria-pressed="' + (!!all) + '">All properties</button>' +
      "</div>" +
      '<div class="msearch">' + icon(S.magnifier) + "<span>Search documents</span></div>" +
      '<div class="mcard mlist mdoclist">' + rows(list) + "</div>" +
      '<button class="mbig mbig-doc" type="button">' + icon(S.plus) + "Add a document</button>" +
      "</div>";
  }

  /* ---------- Next Property ----------
     Presented as a `.fullScreenCover` from the Portfolio card, not as a
     fifth tab — deliberately, per the comment on `NextPropertyView`: the
     floating tab bar's four-item layout is tuned and a fifth item would
     break it. So this covers the tab bar entirely and leaves by its own
     Close button, exactly as it does on the phone.

     Shown in its unlocked (Premium) state throughout. Three of these
     four sections sit behind `PremiumGate`, and the honest choice is one
     state for the whole screen — a single customer is either Premium or
     they are not, and a screen mixing locked and unlocked sections is a
     state the app can never actually be in. The page's own pricing
     section is where Premium is explained. */

  function nextPropertyScreen() {
    var equityRows = [
      {
        icon: S.houseFill, title: "12 Banksia St",
        sub: "$820K value · $395K owing", amount: "$261K", tone: "pos"
      },
      {
        icon: S.buildingFill, title: "12/150 Main St",
        sub: "$620K value · $275K owing", amount: "$221K", tone: "pos"
      }
    ];

    // The app's own DueDiligenceTemplate.standardItems, in order.
    var checklist = [
      "Building & pest inspection booked or reviewed",
      "Contract of sale reviewed by a solicitor/conveyancer",
      "Comparable sales research completed",
      "Rental appraisal obtained from a property manager",
      "Finance pre-approval confirmed",
      "Strata / body corporate records search (if applicable)",
      "Title search and zoning check completed",
      "Insurance quote obtained",
      "Depreciation schedule estimate obtained",
      "Council rates and any special levies checked"
    ].map(function (item, i) {
      return '<div class="mcheck">' + icon(S.checkCircle) + "<span>" + esc(item) + "</span></div>" +
        (i < 9 ? '<div class="mdiv mdiv-check"></div>' : "");
    }).join("");

    var calcRows = [
      { icon: S.dollarSquare, title: "Purchase Cost Estimator", sub: "Stamp duty, legal fees & inspection costs", chevron: true },
      { icon: S.percent, title: "Loan Repayment Estimator", sub: "Repayments, balance chart & interest saved", chevron: true },
      { icon: S.barChart, title: "Rental Yield Estimator", sub: "Gross & net yield on a prospective purchase", chevron: true }
    ];

    return '<div class="mnp-pad">' +
      '<div class="mnp-head"><h2>Next Property</h2>' +
      "<p>Tools for finding and vetting your next investment</p></div>" +

      '<div class="msection">' + header("Equity & Borrowing Snapshot") +
        '<div class="mstats">' +
          stat("PORTFOLIO VALUE", "$1.44M") +
          stat("TOTAL DEBT", "$670K") +
          stat("PORTFOLIO LVR", "46.5%") +
        "</div>" +
        '<div class="mstats mstats-2">' +
          stat("TOTAL EQUITY", "$770K", "pos") +
          stat("USABLE EQUITY (80% LVR)", "$482K", "pos") +
        "</div>" +
        '<div class="mcard mlist mnp-gap">' + rows(equityRows) + "</div>" +
        '<p class="mfoot">Usable equity is an indicative rule of thumb — 80% of current value, less what’s owing — not a formal borrowing capacity or serviceability assessment. Your actual capacity also depends on income, expenses, other debts and lender policy. Talk to a mortgage broker before relying on this.</p>' +
      "</div>" +

      '<div class="msection">' + header("Common Due Diligence Tasks") +
        '<div class="mcard mchecklist">' + checklist + "</div>" +
        '<p class="mfoot mfoot-wide">A starting point, not an exhaustive list — every property and purchase is different. Do your own research and seek advice from a solicitor/conveyancer, accountant or financial adviser before proceeding.</p>' +
      "</div>" +

      '<div class="msection">' + header("Due Diligence Checklists", "＋ Add") +
        '<div class="mcard mempty"><b>No checklists yet</b>' +
        "<i>Considering a property? Start a checklist to track building &amp; pest, contract review, finance approval and more before you commit.</i></div>" +
        '<p class="mfoot">A starting point, not an exhaustive list — every property and purchase is different. Do your own research and seek advice from a solicitor/conveyancer, accountant or financial adviser before proceeding.</p>' +
      "</div>" +

      '<div class="msection">' + header("Calculators") +
        '<div class="mcard mlist">' + rows(calcRows) + "</div>" +
      "</div>" +
      "</div>";
  }

  function settingsScreen() {
    return '<div class="mpad">' +
      '<div class="mhead"><h2>Settings</h2></div>' +
      '<div class="mcard mlist">' + rows([
        { icon: S.appearance, title: "Appearance", sub: "Match system", menu: "System" },
        { icon: S.bell, title: "Reminders", sub: "On · key dates, EOFY & monthly check-ins", switchOn: true },
        { icon: S.faceid, title: "App Lock", sub: "Off", switchOn: false },
        { icon: S.shield, title: "Defence", sub: "Serving or ex-serving ADF?", switchOn: false },
        { icon: S.bulb, title: "Investor Tips", sub: "On · occasional tips on your Portfolio screen", switchOn: true }
      ]) + "</div>" +

      '<div class="msection">' +
        '<div class="mcard mlist">' + rows([
          { icon: S.crown, title: "Estiqo Premium", sub: "EOFY pack, insights & the full toolkit", open: true },
          { icon: S.share, title: "Export data", sub: "EOFY pack for your accountant", open: true },
          { icon: S.docDown, title: "Back up my data", sub: "One encrypted file, saved wherever you choose", open: true },
          { icon: S.docUp, title: "Restore from a backup", sub: "Adds anything missing — never overwrites or deletes", open: true }
        ]) + "</div>" +
      "</div>" +

      '<div class="msection">' +
        '<div class="mcard mlist">' + rows([
          { icon: S.sparkles, title: "Demo data", sub: "2 sample properties added", open: true },
          { icon: S.hand, title: "Legal & Privacy", sub: "Not financial advice · your data, your device", open: true },
          { icon: S.star, title: "Rate Estiqo", sub: "Enjoying it? A rating helps a lot", open: true },
          { icon: S.envelope, title: "Send Feedback", sub: "Report a bug or suggest something", open: true }
        ]) + "</div>" +
      "</div>" +
      '<p class="mversion">Estiqo 1.0 · Made in Australia</p>' +
      "</div>";
  }

  /* ---------- Chrome ---------- */

  function statusBar() {
    var now = new Date();
    var h = now.getHours() % 12; if (h === 0) h = 12;
    var m = now.getMinutes(); if (m < 10) m = "0" + m;
    return '<div class="mstatus" aria-hidden="true">' +
      '<span class="mtime">' + h + ":" + m + "</span>" +
      '<span class="misland"></span>' +
      '<span class="micons">' +
        '<svg class="msig" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0.5" width="3" height="11.5" rx="1"/></svg>' +
        '<svg class="mwifi" viewBox="0 0 20 14"><path d="M10 12.6 7.4 9.8a3.6 3.6 0 0 1 5.2 0Z"/><path d="M4.6 6.9a7.7 7.7 0 0 1 10.8 0" fill="none" stroke-width="2" stroke-linecap="round"/><path d="M1.6 3.6a12 12 0 0 1 16.8 0" fill="none" stroke-width="2" stroke-linecap="round"/></svg>' +
        '<svg class="mbatt" viewBox="0 0 27 13"><rect x="0.6" y="0.6" width="22" height="11.8" rx="3.4" fill="none" stroke-width="1.2" opacity="0.4"/><rect x="2.2" y="2.2" width="18.8" height="8.6" rx="2.2"/><path d="M24.4 4.4c1.1.4 1.6 1.2 1.6 2.1s-.5 1.7-1.6 2.1Z" opacity="0.4"/></svg>' +
      "</span></div>";
  }

  function tabBar() {
    var items = TABS.map(function (t, i) {
      return '<button class="mtab" type="button" role="tab" id="mocktab-' + t.id + '"' +
        ' aria-controls="mockpanel-' + t.id + '" aria-selected="' + (i === 0) + '"' +
        ' tabindex="' + (i === 0 ? "0" : "-1") + '" data-tab="' + t.id + '">' +
        '<span class="mtab-ic">' + tabIcon(TAB_ART[t.id].on, "on") + tabIcon(TAB_ART[t.id].off, "off") + "</span>" +
        '<span class="mtab-l">' + t.label + "</span></button>";
    }).join("");
    return '<div class="mtabbar" role="tablist" aria-label="Estiqo tabs">' + items + "</div>";
  }

  function switcherSheet() {
    var items = PROPERTIES.map(function (p) {
      return '<button class="msheet-row" type="button" data-pick="' + p.id + '">' +
        '<span class="msheet-ph"><img src="' + p.photo + '" alt="" width="800" height="600" loading="lazy"></span>' +
        '<span class="msheet-t"><b>' + esc(p.name) + "</b><i>" + esc(p.spec + " · " + p.suburb) + "</i></span>" +
        '<span class="msheet-v">' + esc(p.value) + "</span>" +
        '<span class="msheet-tick" aria-hidden="true"></span></button>';
    }).join("");
    return '<div class="mscrim" data-close="1"></div>' +
      '<div class="msheet" role="dialog" aria-modal="true" aria-label="Switch property" tabindex="-1">' +
      '<span class="msheet-grab"></span>' +
      '<h4>My Properties</h4>' +
      '<div class="msheet-list">' + items + "</div>" +
      '<button class="msheet-add" type="button">＋ Add a property</button>' +
      "</div>";
  }

  /* ---------- Assemble ---------- */

  var state = { tab: "portfolio", prop: PROPERTIES[0], docsAll: false, sheet: false, cover: false };

  function panel(id, label, html) {
    return '<section class="mscreen" id="mockpanel-' + id + '" data-screen="' + id + '"' +
      ' role="tabpanel" aria-labelledby="mocktab-' + id + '" aria-label="' + label + '">' + html + "</section>";
  }

  function build() {
    root.classList.add("mock-host");
    root.innerHTML =
      '<div class="mock" data-on="portfolio">' +
        '<div class="maura" aria-hidden="true"></div>' +
        '<div class="mscreens">' +
          panel("portfolio", "Portfolio", portfolioScreen()) +
          panel("property", "Property", propertyScreen(state.prop)) +
          panel("documents", "Documents", documentsScreen(state.prop, false)) +
          panel("settings", "Settings", settingsScreen()) +
        "</div>" +
        '<div class="mcover" role="dialog" aria-modal="true" aria-label="Next Property" aria-hidden="true">' +
          '<div class="maura maura-soft" aria-hidden="true"></div>' +
          '<section class="mcover-scroll" tabindex="-1">' + nextPropertyScreen() + "</section>" +
          '<div class="mnav"><button class="mnav-close" type="button" data-cover-close="1">Close</button></div>' +
        "</div>" +
        '<button class="mpill" type="button" aria-haspopup="dialog">' +
          '<span class="mpill-dot"></span><span class="mpill-n"></span>' + icon(S.chevronDown, "mpill-c") +
        "</button>" +
        statusBar() +
        tabBar() +
        switcherSheet() +
      "</div>";
  }

  build();

  var mock = root.querySelector(".mock");
  var screens = {};
  Array.prototype.forEach.call(root.querySelectorAll(".mscreens > .mscreen"), function (s) {
    screens[s.getAttribute("data-screen")] = s;
  });
  var tabButtons = Array.prototype.slice.call(root.querySelectorAll(".mtab"));
  var pill = root.querySelector(".mpill");
  var pillName = root.querySelector(".mpill-n");
  var sheet = root.querySelector(".msheet");
  var scrim = root.querySelector(".mscrim");
  var cover = root.querySelector(".mcover");
  var coverScroll = root.querySelector(".mcover-scroll");

  var TAB_ORDER = TABS.map(function (t) { return t.id; });

  /* ---------- Behaviour ---------- */

  function syncPill() {
    pillName.textContent = state.prop.name;
    var visible = state.tab === "property" || state.tab === "documents";
    mock.classList.toggle("has-pill", visible);
    pill.setAttribute("aria-hidden", String(!visible));
    pill.tabIndex = visible ? 0 : -1;
  }

  var booted = false;

  function setTab(id, focusTab) {
    if (!screens[id]) return;
    var from = TAB_ORDER.indexOf(state.tab);
    var to = TAB_ORDER.indexOf(id);
    if (booted) mock.setAttribute("data-dir", to > from ? "fwd" : "back");
    state.tab = id;
    mock.setAttribute("data-on", id);

    tabButtons.forEach(function (b) {
      var on = b.getAttribute("data-tab") === id;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focusTab) b.focus({ preventScroll: true });
    });
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle("on", k === id);
      // Inactive panels are removed from the a11y tree and from tab
      // order, so a keyboard user can't land inside a screen that
      // isn't showing.
      screens[k].setAttribute("aria-hidden", String(k !== id));
      screens[k].inert = k !== id;
      // Firefox makes overflow containers focusable on its own; Chrome
      // does not, so a keyboard user could reach the Property screen and
      // then have no way to scroll it.
      screens[k].tabIndex = k === id ? 0 : -1;
    });
    syncPill();
  }

  function renderProperty() {
    screens.property.innerHTML = propertyScreen(state.prop);
    screens.property.scrollTop = 0;
    screens.documents.innerHTML = documentsScreen(state.prop, state.docsAll);
    screens.documents.scrollTop = 0;
    syncPill();
  }

  function selectProperty(id, goToProperty) {
    var next = PROPERTIES.filter(function (p) { return p.id === id; })[0];
    if (!next) return;
    var changed = next !== state.prop;
    state.prop = next;
    if (changed) renderProperty();
    if (goToProperty) setTab("property");
  }

  var behind = [root.querySelector(".mscreens"), root.querySelector(".mtabbar"), pill];

  function openSheet(open) {
    state.sheet = open;
    mock.classList.toggle("sheet-open", open);
    // A sheet is modal in the app; a scrim alone only stops the mouse.
    // Everything behind it goes inert so Tab can't walk out of the
    // dialog and into a screen the visitor can't see.
    behind.forEach(function (el) { if (el) el.inert = open; });
    root.querySelectorAll("[data-pick]").forEach(function (b) {
      b.setAttribute("aria-current", String(b.getAttribute("data-pick") === state.prop.id));
      b.classList.toggle("picked", b.getAttribute("data-pick") === state.prop.id);
    });
    if (open) {
      sheet.focus({ preventScroll: true });
    } else if (pill.getAttribute("aria-hidden") !== "true") {
      pill.focus({ preventScroll: true });
    }
  }

  /* `.fullScreenCover` — it covers the tab bar and the switcher pill,
     which is why neither is merely dimmed here the way they are behind
     the switcher sheet. Everything underneath goes inert so focus can't
     walk out of a screen that is completely obscured. */
  function openCover(open) {
    state.cover = open;
    mock.classList.toggle("cover-open", open);
    cover.setAttribute("aria-hidden", String(!open));
    cover.inert = !open;
    behind.forEach(function (el) { if (el) el.inert = open; });
    // Cleared on the way in and on the way out: the nav bar's material
    // belongs to a scroll position that no longer exists once the cover
    // is dismissed, and leaving the class on is state that outlives the
    // screen it describes.
    mock.classList.remove("nav-solid");
    if (open) {
      coverScroll.scrollTop = 0;
      coverScroll.focus({ preventScroll: true });
    } else {
      var card = screens.portfolio.querySelector("[data-next]");
      if (card) card.focus({ preventScroll: true });
    }
  }

  /* An iOS inline nav bar is transparent over content at rest and picks
     up its material only once something has scrolled beneath it. */
  coverScroll.addEventListener("scroll", function () {
    mock.classList.toggle("nav-solid", coverScroll.scrollTop > 4);
  }, { passive: true });

  /* One delegated listener for the whole mock — every control inside
     is a real button, so the target tells us what was pressed. */
  root.addEventListener("click", function (e) {
    // Scoped to `.mtab`, not to `[data-tab]` on its own: the root
    // carries its own state attribute, and a bare attribute selector
    // walks straight past the control you pressed and matches that.
    var tab = e.target.closest(".mtab");
    if (tab) { setTab(tab.getAttribute("data-tab")); return; }

    var open = e.target.closest("[data-open]");
    if (open) { selectProperty(open.getAttribute("data-open"), true); return; }

    var pick = e.target.closest("[data-pick]");
    if (pick) { selectProperty(pick.getAttribute("data-pick"), false); openSheet(false); return; }

    if (e.target.closest(".mpill")) { openSheet(true); return; }
    if (e.target.closest("[data-close]")) { openSheet(false); return; }

    if (e.target.closest("[data-next]")) { openCover(true); return; }
    if (e.target.closest("[data-cover-close]")) { openCover(false); return; }

    var seg = e.target.closest("[data-seg]");
    if (seg) {
      state.docsAll = seg.getAttribute("data-seg") === "all";
      screens.documents.innerHTML = documentsScreen(state.prop, state.docsAll);
      screens.documents.scrollTop = 0;
      return;
    }
  });

  /* Arrow keys move between tabs the way a real tablist does. */
  root.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && state.sheet) { openSheet(false); return; }
    if (e.key === "Escape" && state.cover) { openCover(false); return; }
    if (!e.target.closest(".mtabbar")) return;
    var i = TAB_ORDER.indexOf(state.tab);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault(); setTab(TAB_ORDER[(i + 1) % TAB_ORDER.length], true);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault(); setTab(TAB_ORDER[(i + TAB_ORDER.length - 1) % TAB_ORDER.length], true);
    } else if (e.key === "Home") {
      e.preventDefault(); setTab(TAB_ORDER[0], true);
    } else if (e.key === "End") {
      e.preventDefault(); setTab(TAB_ORDER[TAB_ORDER.length - 1], true);
    }
  });

  /* The hero's pointer parallax drifts the whole phone by up to 7px
     over 1.3s (js/estiqo.js). Harmless while the phone is a picture;
     with a 40pt tap target inside it, it means the thing you are
     reaching for slides away as you reach. Frozen while the pointer
     is over the device, released when it leaves. */
  var heroSection = root.closest(".hero");
  var deviceEl = root.closest(".device");
  if (heroSection && deviceEl && !reduceMotion.matches) {
    deviceEl.addEventListener("pointerenter", function () {
      heroSection.classList.add("mock-engaged");
    });
    deviceEl.addEventListener("pointerleave", function () {
      heroSection.classList.remove("mock-engaged");
    });
  }

  setTab("portfolio");
  cover.inert = true;
  booted = true;

  }
})();
