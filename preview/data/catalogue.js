/*
  TKX London — DEVELOPMENT FIXTURES (preview only)
  ------------------------------------------------
  Every product, price, stock level and colour below is a placeholder used to
  exercise the storefront. None of it is approved business data. Fields set to
  null are deliberately unfilled: they must come from the owner's confirmed
  garment specifications (fabric, measurements, model details) and are never
  invented. See docs/ASSET-CHECKLIST.md.

  Loaded as a plain script so the preview also works from file://.
*/
window.TKX_DATA = {
  fixture: true,

  settings: {
    // Owner switch — mirrors the Shopify theme setting "Store mode".
    // "prelaunch" | "live". Never flipped automatically by date.
    storeMode: "live",
    announcement: "Launching December 2026 — join the list for first access",
    launchDateLabel: "Target launch: 26 December 2026",
    social: [] // none supplied yet — footer hides the block when empty
  },

  colours: {
    black:     { label: "Black",     hex: "#151514" },
    chocolate: { label: "Chocolate", hex: "#4a3226" },
    olive:     { label: "Olive",     hex: "#5f6146" },
    taupe:     { label: "Taupe",     hex: "#a89a89" },
    charcoal:  { label: "Charcoal",  hex: "#3a3936" },
    ivory:     { label: "Ivory",     hex: "#ece5d8" }
  },

  sizes: ["XS", "S", "M", "L", "XL"],

  // Indicative preview-only rates against GBP. NOT live exchange rates.
  // In Shopify, Markets converts and rounds prices automatically.
  currencies: {
    GBP: { symbol: "£",   rate: 1,    decimals: 2, locale: "en-GB", country: "United Kingdom" },
    USD: { symbol: "$",   rate: 1.27, decimals: 2, locale: "en-US", country: "United States" },
    EUR: { symbol: "€",   rate: 1.17, decimals: 2, locale: "en-IE", country: "Euro area" },
    NGN: { symbol: "₦",   rate: 1900, decimals: 0, locale: "en-NG", country: "Nigeria" },
    CAD: { symbol: "CA$", rate: 1.74, decimals: 2, locale: "en-CA", country: "Canada" }
  },

  products: [
    {
      handle: "motion-rib-bra-top", title: "Motion Rib Bra Top", type: "Tops", price: 48,
      shape: "bra", colours: ["black", "chocolate", "olive"],
      stock: { black: { XS: 6, S: 12, M: 9, L: 4, XL: 0 }, chocolate: { XS: 3, S: 8, M: 2, L: 0, XL: 1 }, olive: { XS: 0, S: 5, M: 7, L: 3, XL: 2 } },
      summary: "A cropped rib top for days that move between the desk, the studio and the weekend.",
      fit: null, fabric: null, care: null, model: null, measurements: null, features: null
    },
    {
      handle: "motion-rib-legging", title: "Motion Rib Legging", type: "Bottoms", price: 68,
      shape: "legging", colours: ["black", "chocolate", "olive"],
      stock: { black: { XS: 5, S: 14, M: 11, L: 6, XL: 3 }, chocolate: { XS: 2, S: 6, M: 0, L: 4, XL: 0 }, olive: { XS: 1, S: 4, M: 6, L: 2, XL: 1 } },
      summary: "A high-rise rib legging designed to pair with the Motion Rib Bra Top.",
      fit: null, fabric: null, care: null, model: null, measurements: null, features: null
    },
    {
      handle: "everyday-wide-leg-trouser", title: "Everyday Wide-Leg Trouser", type: "Bottoms", price: 85,
      shape: "trouser", colours: ["charcoal", "taupe"],
      stock: { charcoal: { XS: 4, S: 7, M: 9, L: 5, XL: 2 }, taupe: { XS: 0, S: 3, M: 4, L: 2, XL: 0 } },
      summary: "A relaxed wide-leg trouser that dresses up for the office and down for the weekend.",
      fit: null, fabric: null, care: null, model: null, measurements: null, features: null
    },
    {
      handle: "studio-zip-jacket", title: "Studio Zip Jacket", type: "Tops", price: 95,
      shape: "jacket", colours: ["black", "taupe"],
      preorder: { taupe: "Pre-order — dispatch date to be confirmed by owner" },
      stock: { black: { XS: 3, S: 6, M: 6, L: 3, XL: 1 }, taupe: { XS: 0, S: 0, M: 0, L: 0, XL: 0 } },
      summary: "A clean, fitted zip jacket for the commute, travel days and everything between.",
      fit: null, fabric: null, care: null, model: null, measurements: null, features: null
    },
    {
      handle: "relaxed-crew-sweatshirt", title: "Relaxed Crew Sweatshirt", type: "Tops", price: 72,
      shape: "sweat", colours: ["ivory", "chocolate"],
      stock: { ivory: { XS: 4, S: 9, M: 8, L: 5, XL: 3 }, chocolate: { XS: 2, S: 5, M: 5, L: 3, XL: 0 } },
      summary: "An easy crew-neck sweatshirt with a relaxed shape and subtle tonal branding.",
      fit: null, fabric: null, care: null, model: null, measurements: null, features: null
    },
    {
      handle: "everyday-jogger", title: "Everyday Jogger", type: "Bottoms", price: 70,
      shape: "jogger", colours: ["charcoal", "olive"],
      stock: { charcoal: { XS: 3, S: 8, M: 10, L: 6, XL: 2 }, olive: { XS: 0, S: 0, M: 0, L: 0, XL: 0 } },
      summary: "A tapered jogger that pairs with the Relaxed Crew Sweatshirt.",
      fit: null, fabric: null, care: null, model: null, measurements: null, features: null
    },
    {
      handle: "fitted-long-sleeve-top", title: "Fitted Long-Sleeve Top", type: "Tops", price: 52,
      shape: "longsleeve", colours: ["black", "ivory"],
      stock: { black: { XS: 5, S: 10, M: 8, L: 4, XL: 2 }, ivory: { XS: 2, S: 4, M: 3, L: 1, XL: 0 } },
      summary: "A close-fitting long-sleeve layer for cooler mornings and lighter evenings.",
      fit: null, fabric: null, care: null, model: null, measurements: null, features: null
    },
    {
      handle: "flare-legging", title: "Flare Legging", type: "Bottoms", price: 72,
      shape: "flare", colours: ["black", "chocolate"],
      stock: { black: { XS: 4, S: 9, M: 7, L: 3, XL: 2 }, chocolate: { XS: 1, S: 3, M: 2, L: 0, XL: 0 } },
      summary: "A high-rise legging with a gentle flare from the knee.",
      fit: null, fabric: null, care: null, model: null, measurements: null, features: null
    }
  ],

  // Matching sets are presentations of two real products. Each component keeps
  // its own variants and stock — there is no separate "set" inventory.
  sets: [
    { handle: "motion-rib-set", title: "Motion Rib Set", components: ["motion-rib-bra-top", "motion-rib-legging"], colour: "chocolate",
      summary: "The Motion Rib Bra Top and Legging, worn together. Choose a separate size for each piece." },
    { handle: "everyday-lounge-set", title: "Everyday Lounge Set", components: ["relaxed-crew-sweatshirt", "everyday-jogger"], colour: null,
      summary: "The Relaxed Crew Sweatshirt and Everyday Jogger as an easy weekend pairing." },
    { handle: "studio-set", title: "Studio Set", components: ["studio-zip-jacket", "everyday-wide-leg-trouser"], colour: null,
      summary: "The Studio Zip Jacket over the Everyday Wide-Leg Trouser — from commute to dinner." }
  ],

  looks: [
    { id: "look-1", name: "Desk to studio", items: [["motion-rib-bra-top", "chocolate"], ["motion-rib-legging", "chocolate"], ["studio-zip-jacket", "black"]] },
    { id: "look-2", name: "Weekend plans", items: [["relaxed-crew-sweatshirt", "ivory"], ["everyday-jogger", "charcoal"]] },
    { id: "look-3", name: "Travel day", items: [["fitted-long-sleeve-top", "black"], ["everyday-wide-leg-trouser", "taupe"]] }
  ]
};
