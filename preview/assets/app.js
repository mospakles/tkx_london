/*
  TKX London — static storefront preview
  Mirrors the behaviour of the Shopify theme in theme/ so the design and
  shopping interactions can be reviewed before a store is connected.

  Honesty rules this file follows:
  - Nothing here takes payment. "Checkout" explains the hosted Shopify handoff.
  - Forms validate, then say plainly that the preview did not send anything.
  - Converted prices use indicative fixture rates and are labelled as such.
*/
(() => {
  'use strict';

  const D = window.TKX_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Storage (per-viewer conveniences only) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('tkx:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('tkx:' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
  };

  const MARKETS = [
    { code: 'GB', country: 'United Kingdom', currency: 'GBP' },
    { code: 'US', country: 'United States', currency: 'USD' },
    { code: 'IE', country: 'Ireland', currency: 'EUR' },
    { code: 'FR', country: 'France', currency: 'EUR' },
    { code: 'DE', country: 'Germany', currency: 'EUR' },
    { code: 'NG', country: 'Nigeria', currency: 'NGN' },
    { code: 'CA', country: 'Canada', currency: 'CAD' }
  ];
  const marketBy = (code) => MARKETS.find((m) => m.code === code) || MARKETS[0];

  const state = {
    mode: store.get('mode', D.settings.storeMode),
    country: store.get('country', 'GB'),
    cart: store.get('cart', []),
    consent: store.get('consent', null)
  };
  const saveCart = () => { store.set('cart', state.cart); renderBagCount(); };

  const P = Object.fromEntries(D.products.map((p) => [p.handle, p]));
  const SETS = Object.fromEntries(D.sets.map((s) => [s.handle, s]));

  // ---------- Money ----------
  const cur = () => marketBy(state.country).currency;
  function conv(gbp, code = cur()) {
    const c = D.currencies[code];
    const v = gbp * c.rate;
    if (code === 'GBP') return v;
    if (code === 'NGN') return Math.ceil(v / 100) * 100; // preview-only rounding
    return Math.ceil(v);                                  // preview-only rounding
  }
  function fmt(n, code = cur()) {
    const c = D.currencies[code];
    return c.symbol + n.toLocaleString('en-GB', { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals });
  }
  const money = (gbp) => fmt(conv(gbp));

  // ---------- Inventory ----------
  const qty = (p, c, s) => (p.stock?.[c]?.[s]) ?? 0;
  const isPre = (p, c) => Boolean(p.preorder?.[c]);
  const PREORDER_LIMIT = 10; // fixture cap for pre-order quantities
  const maxQty = (p, c, s) => qty(p, c, s) > 0 ? qty(p, c, s) : (isPre(p, c) ? PREORDER_LIMIT : 0);
  function variantStatus(p, c, s) {
    const q = qty(p, c, s);
    if (q > 0) return q <= 2 ? 'low' : 'in';
    return isPre(p, c) ? 'preorder' : 'out';
  }
  const colourAvailable = (p, c) => isPre(p, c) || D.sizes.some((s) => qty(p, c, s) > 0);
  const productAvailable = (p) => p.colours.some((c) => colourAvailable(p, c));
  const sizeAvailableAny = (p, s) => p.colours.some((c) => qty(p, c, s) > 0 || isPre(p, c));
  const cLabel = (c) => D.colours[c]?.label || c;

  // Unified catalogue items (products + sets) for grids, filters and search
  function setItem(s) {
    const comps = s.components.map((h) => P[h]);
    const colours = [...new Set(comps.flatMap((p) => p.colours))];
    return {
      handle: s.handle, title: s.title, isSet: true, type: 'Matching Sets', summary: s.summary,
      price: comps.reduce((a, p) => a + p.price, 0), colours, comps,
      shape: comps[0].shape, colour: s.colour || comps[0].colours[0],
      available: comps.every(productAvailable),
      hasSize: (sz) => comps.every((p) => sizeAvailableAny(p, sz)),
      inStock: comps.every((p) => p.colours.some((c) => D.sizes.some((sz) => qty(p, c, sz) > 0)))
    };
  }
  function productItem(p) {
    return {
      handle: p.handle, title: p.title, isSet: false, type: p.type, summary: p.summary, price: p.price,
      colours: p.colours, shape: p.shape, colour: p.colours[0], product: p,
      available: productAvailable(p),
      hasSize: (sz) => sizeAvailableAny(p, sz),
      inStock: p.colours.some((c) => D.sizes.some((sz) => qty(p, c, sz) > 0))
    };
  }
  const ALL_ITEMS = [...D.products.map(productItem), ...D.sets.map(setItem)];

  const COLLECTIONS = [
    { handle: 'all', title: 'Shop All', intro: 'The launch collection — everyday essentials and matching sets in black, charcoal, chocolate, taupe and olive.', items: () => ALL_ITEMS },
    { handle: 'matching-sets', title: 'Matching Sets', intro: 'Pieces designed to be worn together. Choose a separate size for each piece.', items: () => ALL_ITEMS.filter((i) => i.isSet) },
    { handle: 'tops', title: 'Tops', intro: 'Bra tops, layers and sweatshirts for every part of the day.', items: () => ALL_ITEMS.filter((i) => i.type === 'Tops') },
    { handle: 'bottoms', title: 'Bottoms', intro: 'Leggings, joggers and trousers cut for comfort and shape.', items: () => ALL_ITEMS.filter((i) => i.type === 'Bottoms') },
    // Future collections: listed here so they can be switched on, but hidden from navigation while empty.
    { handle: 'unisex', title: 'Unisex', intro: 'Selected unisex pieces.', items: () => [] }
  ];
  const collectionBy = (h) => COLLECTIONS.find((c) => c.handle === h);
  const NAV = () => [
    ...COLLECTIONS.filter((c) => c.items().length > 0).map((c) => ({ title: c.title, href: '#/collections/' + c.handle })),
    { title: 'Our Story', href: '#/pages/our-story' }
  ];

  // ---------- Icons ----------
  const I = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 8h18M3 16h18"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 8h14l-1.2 13H6.2L5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    filter: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>'
  };

  // ---------- Fixture artwork ----------
  // Simple garment silhouettes stand in for photography. They are labelled
  // on-image so nobody mistakes them for approved product imagery.
  const SHAPES = {
    bra: 'M62 40 Q100 62 138 40 L150 72 Q152 112 142 134 L58 134 Q48 112 50 72 Z',
    longsleeve: 'M70 30 Q100 46 130 30 L165 50 L184 172 L164 177 L148 92 L148 222 L52 222 L52 92 L36 177 L16 172 L35 50 Z',
    sweat: 'M64 30 Q100 50 136 30 L172 52 L190 182 L166 188 L152 102 L156 226 L44 226 L48 102 L34 188 L10 182 L28 52 Z',
    jacket: 'M68 28 Q100 40 132 28 L166 50 L186 176 L165 181 L149 94 L150 224 L50 224 L51 94 L35 181 L14 176 L34 50 Z',
    legging: 'M60 20 L140 20 L146 62 L131 246 L108 246 L100 92 L92 246 L69 246 L54 62 Z',
    flare: 'M62 20 L138 20 L144 62 L130 182 L152 246 L108 246 L100 96 L92 246 L48 246 L70 182 L56 62 Z',
    trouser: 'M58 20 L142 20 L151 72 L166 246 L108 246 L100 96 L92 246 L34 246 L49 72 Z',
    jogger: 'M58 20 L142 20 L149 72 L138 228 L141 246 L108 246 L106 228 L100 96 L94 228 L92 246 L59 246 L62 228 L51 72 Z'
  };
  const isBottom = (shape) => ['legging', 'flare', 'trouser', 'jogger'].includes(shape);
  const shade = (hex, amt) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
    return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
  };
  let uid = 0;
  function garment(shape, colour, view = 'front') {
    const hex = D.colours[colour]?.hex || '#777';
    const id = 'rib' + (++uid);
    const fill = view === 'back' ? shade(hex, 10) : hex;
    const details = isBottom(shape)
      ? `<path d="M${shape === 'trouser' ? 54 : 58} 34 H${shape === 'trouser' ? 146 : 142}" stroke="${shade(hex, 26)}" stroke-width="1.4"/>`
      : shape === 'jacket' && view === 'front' ? `<path d="M100 40 V224" stroke="${shade(hex, 30)}" stroke-width="1.6"/>` : '';
    const vb = view === 'detail' ? (isBottom(shape) ? '64 8 72 72' : '66 26 70 70') : '0 0 200 260';
    return `<svg class="${view === 'detail' ? 'detail' : 'silhouette'}" viewBox="${vb}" preserveAspectRatio="xMidYMid ${view === 'detail' ? 'slice' : 'meet'}" aria-hidden="true">
      <defs><pattern id="${id}" width="3" height="6" patternUnits="userSpaceOnUse"><rect width="1.2" height="6" fill="${shade(hex, 18)}" opacity=".55"/></pattern></defs>
      <path d="${SHAPES[shape]}" fill="${fill}" stroke="${shade(hex, -14)}" stroke-width=".8"/>
      <path d="${SHAPES[shape]}" fill="url(#${id})" opacity="${view === 'detail' ? 0.9 : 0.35}"/>${details}</svg>`;
  }
  // Abstract figures for campaign/look placeholders: varied skin tones and builds.
  function figures(list) {
    const w = 220;
    const g = list.map((f, i) => {
      const top = D.colours[f.top[1]].hex, bot = D.colours[f.bottom[1]].hex;
      return `<g transform="translate(${i * w + 110} 0) scale(${f.sx || 1} 1) translate(-110 0)">
        <path d="M74 100 L52 300 M146 100 L168 300" stroke="${f.skin}" stroke-width="17" stroke-linecap="round"/>
        <rect x="78" y="120" width="64" height="170" rx="20" fill="${f.skin}"/>
        <rect x="100" y="66" width="20" height="30" fill="${f.skin}"/>
        <ellipse cx="110" cy="52" rx="24" ry="28" fill="${f.skin}"/>
        <path d="M86 44 Q110 6 136 44 Q130 26 110 24 Q90 26 86 44Z" fill="${shade(f.skin, -40)}"/>
        <g transform="translate(10 290) scale(1 1.16)"><path d="${SHAPES[f.bottom[0]]}" fill="${bot}"/></g>
        <g transform="translate(10 66)"><path d="${SHAPES[f.top[0]]}" fill="${top}"/></g>
        <ellipse cx="84" cy="578" rx="17" ry="6" fill="#151514"/><ellipse cx="136" cy="578" rx="17" ry="6" fill="#151514"/>
      </g>`;
    }).join('');
    return `<svg class="figures" viewBox="0 0 ${list.length * w} 590" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${g}</svg>`;
  }
  const HERO_FIGS = [
    { top: ['bra', 'chocolate'], bottom: ['legging', 'chocolate'], skin: '#8a5a3c', sx: 1 },
    { top: ['sweat', 'ivory'], bottom: ['jogger', 'charcoal'], skin: '#e2b896', sx: 1.14 },
    { top: ['jacket', 'black'], bottom: ['trouser', 'taupe'], skin: '#5a3a28', sx: 0.95 }
  ];
  const SKINS = ['#8a5a3c', '#e2b896', '#5a3a28', '#c99878'];

  function ph({ label, art = '', tag = 'Dev fixture', ratio = 'ratio-portrait', dark = false, bg, eager = false, extra = '' }) {
    return `<div class="media ${ratio}">${phLayer({ label, art, tag, dark, bg })}${extra}</div>`;
  }
  function phLayer({ label, art = '', tag = 'Dev fixture', dark = false, bg }) {
    return `<div class="placeholder${dark ? ' placeholder--dark' : ''}" role="img" aria-label="${esc(label)} (placeholder image)"${bg ? ` style="--ph-bg:${bg}"` : ''}>${art}<span class="placeholder__tag">${esc(tag)}</span><span class="placeholder__label" aria-hidden="true">${esc(label)}</span></div>`;
  }
  function itemArt(item, view = 'front', colour) {
    if (item.isSet) {
      const [a, b] = item.comps;
      const c = colour || item.colour;
      const ca = a.colours.includes(c) ? c : a.colours[0];
      const cb = b.colours.includes(c) ? c : b.colours[0];
      return figures([{ top: [a.shape, ca], bottom: [b.shape, cb], skin: SKINS[item.title.length % 4], sx: 1 }]);
    }
    return garment(item.shape, colour || item.colour, view);
  }

  // ---------- Shared fragments ----------
  const devNote = (t) => `<p class="dev-note">${t}</p>`;
  const ownerMark = (t) => `<span class="owner-review">OWNER TO CONFIRM: ${t}</span>`;
  const swatches = (colours) => `<ul class="swatches" role="list" aria-label="Colours: ${esc(colours.map(cLabel).join(', '))}">${colours.map((c) => `<li class="swatch" style="--swatch:${D.colours[c].hex}" aria-hidden="true"></li>`).join('')}</ul>`;

  function card(item) {
    let badge = '';
    if (item.isSet) badge = '<span class="product-card__badge">Matching set</span>';
    if (!item.available) badge = '<span class="product-card__badge product-card__badge--dark">Sold out</span>';
    else if (!item.isSet && item.colours.some((c) => isPre(item.product, c))) badge = '<span class="product-card__badge">Pre-order available</span>';
    const frontLbl = item.isSet ? `${item.title} — worn together` : `${item.title} — front`;
    return `<article class="product-card">
      ${badge}
      <a class="product-card__media zoom-on-hover" href="#/products/${item.handle}" tabindex="-1" aria-hidden="true">
        <div class="media ratio-tall">${phLayer({ label: frontLbl, art: itemArt(item) })}${phLayer({ label: item.isSet ? 'Detail' : `${item.title} — back`, art: item.isSet ? garment(item.comps[1].shape, item.comps[1].colours[0], 'detail') : itemArt(item, 'back') })}</div>
      </a>
      <div class="product-card__info">
        <div class="product-card__meta">
          <a class="product-card__title" href="#/products/${item.handle}">${esc(item.title)}</a>
          <span class="price">${item.isSet ? '' : ''}${money(item.price)}</span>
        </div>
        <div class="product-card__meta">
          <span class="product-card__colours">${item.colours.length} colour${item.colours.length > 1 ? 's' : ''}${item.isSet ? ' · price for both pieces' : ''}</span>
          <span class="product-card__swatches">${swatches(item.colours)}</span>
        </div>
      </div>
    </article>`;
  }

  // ---------- Global chrome ----------
  function renderAnnouncement() {
    const text = state.mode === 'live' ? D.settings.announcement : D.settings.announcement;
    $('#announcement').innerHTML = text ? `<div class="announcement" role="region" aria-label="Announcement"><a href="#/" data-scroll="signup">${esc(text)}</a></div>` : '';
  }

  function renderHeader() {
    const m = marketBy(state.country);
    const path = location.hash.split('?')[0];
    $('#header').innerHTML = `<div class="page-width header__inner">
      <div class="header__left">
        <button class="icon-btn menu-toggle" type="button" aria-expanded="false" aria-controls="menu-drawer" data-open="menu-drawer">${I.menu}<span class="visually-hidden">Menu</span></button>
        <button class="icon-btn" type="button" data-open="search-panel" aria-controls="search-panel" aria-expanded="false">${I.search}<span class="visually-hidden">Search</span></button>
      </div>
      <a class="header__logo" href="#/" aria-label="TKX London — home">
        <!-- Temporary text wordmark: replace with the approved TKX LONDON artwork (theme setting: Logo). -->
        <span class="wordmark" aria-hidden="true">TKX<span>London</span></span>
      </a>
      <nav class="header__nav" aria-label="Main">
        <ul role="list">${NAV().map((n) => `<li><a href="${n.href}"${path === n.href ? ' aria-current="page"' : ''}>${esc(n.title)}</a></li>`).join('')}</ul>
      </nav>
      <div class="header__actions">
        <button class="locale-trigger header__locale" type="button" data-open="locale-modal" aria-controls="locale-modal" aria-expanded="false">
          <span class="visually-hidden">Country and currency: </span>${m.code} · ${esc(D.currencies[m.currency].symbol)} ${m.currency}</button>
        <button class="icon-btn desktop-only" type="button" data-open="search-panel" aria-controls="search-panel" aria-expanded="false">${I.search}<span class="visually-hidden">Search</span></button>
        <button class="icon-btn" type="button" data-open="cart-drawer" aria-controls="cart-drawer" aria-expanded="false" id="bag-btn">${I.bag}<span class="visually-hidden" id="bag-label"></span><span class="bag-count" id="bag-count" aria-hidden="true"></span></button>
      </div>
    </div>`;
    renderBagCount();
  }
  function renderBagCount() {
    const n = state.cart.reduce((a, l) => a + l.qty, 0);
    const c = $('#bag-count');
    if (!c) return;
    c.textContent = n; c.hidden = n === 0;
    $('#bag-label').textContent = `Bag, ${n} item${n === 1 ? '' : 's'}`;
  }

  function signupForm(id, dark = true) {
    return `<form class="js-signup" novalidate data-id="${id}">
      <div class="inline-form">
        <label for="${id}-email" class="visually-hidden">Email address</label>
        <input id="${id}-email" type="email" name="email" autocomplete="email" placeholder="Email address" required aria-describedby="${id}-consent-text">
        <button type="submit">Sign up</button>
      </div>
      <div class="hp-field" aria-hidden="true"><label>Leave blank<input type="text" name="company" tabindex="-1" autocomplete="off"></label></div>
      <label class="checkbox consent" style="margin-top:14px">
        <input type="checkbox" name="consent" required>
        <span id="${id}-consent-text">Yes, email me TKX London launch news and future collections. I can unsubscribe at any time using the link in every email. See the <a href="#/pages/privacy-cookies">Privacy &amp; Cookies policy</a>.</span>
      </label>
      <div class="js-form-status" role="status" aria-live="polite"></div>
    </form>`;
  }

  function renderFooter() {
    if (state.mode === 'prelaunch') { $('#footer').innerHTML = ''; $('#footer').hidden = true; return; }
    $('#footer').hidden = false;
    const m = marketBy(state.country);
    const social = D.settings.social;
    $('#footer').innerHTML = `
      <section class="page-width newsletter" id="signup" aria-labelledby="signup-title" style="padding-bottom:64px;border-bottom:1px solid rgba(250,247,241,.14)">
        <div>
          <span class="eyebrow">The launch list</span>
          <h2 class="h2" id="signup-title" style="margin-top:14px">Be first in motion.</h2>
          <p class="muted" style="margin-top:14px;max-width:44ch">Launch news, first access and future collections — straight to your inbox.</p>
        </div>
        ${signupForm('footer-signup')}
      </section>
      <div class="page-width" style="padding-top:56px">
        <div class="footer__grid">
          <div class="footer__brand">
            <span class="wordmark">TKX<span>London</span></span>
            <p class="muted" style="margin-top:16px;max-width:34ch">Considered comfort. Confident style. Womenswear for everyday plans, travel and movement.</p>
            ${social.length ? `<ul role="list" class="footer__links" style="display:flex;gap:16px;margin-top:16px">${social.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.name)}</a></li>`).join('')}</ul>` : devNote('Social links: none supplied yet. Block hides automatically when empty.')}
          </div>
          <nav aria-label="Shop"><h2 class="footer__heading">Shop</h2><ul role="list" class="footer__links">${NAV().filter((n) => n.href.includes('collections')).map((n) => `<li><a href="${n.href}">${esc(n.title)}</a></li>`).join('')}</ul></nav>
          <nav aria-label="Help"><h2 class="footer__heading">Help</h2><ul role="list" class="footer__links">
            <li><a href="#/pages/contact">Contact</a></li><li><a href="#/pages/size-guide">Size Guide</a></li><li><a href="#/pages/delivery-returns">Delivery &amp; Returns</a></li><li><a href="#/pages/faqs">FAQs</a></li></ul></nav>
          <nav aria-label="About and legal"><h2 class="footer__heading">TKX London</h2><ul role="list" class="footer__links">
            <li><a href="#/pages/our-story">Our Story</a></li><li><a href="#/pages/privacy-cookies">Privacy &amp; Cookies</a></li><li><a href="#/pages/terms">Terms &amp; Conditions</a></li></ul></nav>
        </div>
        <div class="footer__bottom">
          <span>© 2026 TKX London</span>
          <span style="display:flex;gap:20px;flex-wrap:wrap">
            <button type="button" data-open="locale-modal" aria-controls="locale-modal">${esc(m.country)} (${m.currency} ${esc(D.currencies[m.currency].symbol)})</button>
            <button type="button" data-cookie-prefs>Cookie preferences</button>
          </span>
        </div>
        <div class="footer__wordmark wordmark" aria-hidden="true">TKX London</div>
      </div>`;
  }

  // ---------- Layers: drawers, modals, search ----------
  function renderLayers() {
    $('#layers').innerHTML = `
      <div class="overlay" id="overlay" hidden data-close></div>
      <div class="drawer drawer--left" id="menu-drawer" role="dialog" aria-modal="true" aria-labelledby="menu-title" hidden>
        <div class="drawer__head"><h2 id="menu-title">Menu</h2><button class="icon-btn" type="button" data-close>${I.close}<span class="visually-hidden">Close menu</span></button></div>
        <div class="drawer__body">
          <nav aria-label="Mobile"><ul role="list" class="mobile-nav" id="mobile-nav"></ul></nav>
          <ul role="list" class="mobile-nav mobile-nav__secondary" style="margin-top:24px">
            <li><a href="#/pages/contact">Contact</a></li><li><a href="#/pages/size-guide">Size Guide</a></li>
            <li><a href="#/pages/delivery-returns">Delivery &amp; Returns</a></li><li><a href="#/pages/faqs">FAQs</a></li></ul>
        </div>
        <div class="drawer__foot"><button class="btn btn--secondary btn--block" type="button" data-open="locale-modal" aria-controls="locale-modal" id="menu-locale"></button></div>
      </div>
      <div class="drawer drawer--right" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" hidden></div>
      <div class="drawer drawer--right" id="filter-drawer" role="dialog" aria-modal="true" aria-labelledby="filter-title" hidden></div>
      <div class="search-panel" id="search-panel" role="dialog" aria-modal="true" aria-label="Search" hidden>
        <div class="page-width" style="padding:0">
          <form class="search-field" role="search" id="search-form">
            <label for="search-input" class="visually-hidden">Search products and pages</label>
            ${I.search}
            <input id="search-input" type="search" name="q" placeholder="Search" autocomplete="off" aria-controls="search-live" aria-describedby="search-hint">
            <button class="icon-btn" type="button" data-close>${I.close}<span class="visually-hidden">Close search</span></button>
          </form>
          <p id="search-hint" class="visually-hidden">Results update as you type. Press Enter to see all results.</p>
          <div id="search-live" aria-live="polite"></div>
        </div>
      </div>
      <div class="modal" id="locale-modal" role="dialog" aria-modal="true" aria-labelledby="locale-title" hidden></div>
      <div class="modal" id="info-modal" role="dialog" aria-modal="true" aria-labelledby="info-title" hidden></div>
      <div id="cookie-slot"></div>`;
  }
  function refreshMobileNav() {
    $('#mobile-nav').innerHTML = NAV().map((n) => `<li><a href="${n.href}">${esc(n.title)}</a></li>`).join('');
    const m = marketBy(state.country);
    $('#menu-locale').textContent = `${m.country} · ${D.currencies[m.currency].symbol} ${m.currency}`;
  }

  let active = null; let returnFocus = null;
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function openLayer(id, trigger) {
    if (active) closeLayer(true);
    const el = document.getElementById(id);
    if (!el) return;
    if (id === 'cart-drawer') renderCartDrawer();
    if (id === 'locale-modal') renderLocaleModal();
    if (id === 'menu-drawer') refreshMobileNav();
    returnFocus = trigger || document.activeElement;
    active = el;
    const ov = $('#overlay');
    el.hidden = false; ov.hidden = false;
    $$(`[aria-controls="${id}"]`).forEach((b) => b.setAttribute('aria-expanded', 'true'));
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => {
      el.classList.add('is-open'); ov.classList.add('is-open');
      const first = el.querySelector('[data-autofocus]') || el.querySelector(FOCUSABLE);
      first && first.focus();
    });
  }
  function closeLayer(instant = false) {
    if (!active) return;
    const el = active; active = null;
    const ov = $('#overlay');
    el.classList.remove('is-open'); ov.classList.remove('is-open');
    $$(`[aria-controls="${el.id}"]`).forEach((b) => b.setAttribute('aria-expanded', 'false'));
    document.body.classList.remove('no-scroll');
    const done = () => { if (active !== el) { el.hidden = true; if (!active) ov.hidden = true; } };
    instant || reduceMotion ? done() : setTimeout(done, 320);
    if (!instant && returnFocus && document.contains(returnFocus)) returnFocus.focus();
  }
  document.addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLayer(); return; }
    if (e.key === 'Tab') {
      const f = $$(FOCUSABLE, active).filter((x) => x.offsetParent !== null || x === document.activeElement);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  function infoModal(title, html) {
    const m = $('#info-modal');
    m.innerHTML = `<button class="icon-btn modal__close" type="button" data-close>${I.close}<span class="visually-hidden">Close</span></button>
      <h2 class="h3" id="info-title" style="margin-bottom:16px;padding-right:40px">${title}</h2>${html}`;
    openLayer('info-modal');
  }

  // ---------- Country / currency ----------
  function renderLocaleModal() {
    $('#locale-modal').innerHTML = `
      <button class="icon-btn modal__close" type="button" data-close>${I.close}<span class="visually-hidden">Close</span></button>
      <h2 class="h3" id="locale-title">Country / region</h2>
      <p class="small muted" style="margin-top:8px">Choose where you're shopping from to see prices in that currency.</p>
      <form id="locale-form">
        <fieldset style="border:0;padding:0;margin:0"><legend class="visually-hidden">Country or region</legend>
        <div class="locale-list">${MARKETS.map((m) => `<label><input type="radio" name="country" value="${m.code}"${m.code === state.country ? ' checked' : ''}> ${esc(m.country)} <span class="code">${m.currency} ${esc(D.currencies[m.currency].symbol)}</span></label>`).join('')}</div>
        </fieldset>
        <p class="xsmall muted">Your choice changes the display currency only — it doesn't confirm delivery to that country. See <a href="#/pages/delivery-returns">Delivery &amp; Returns</a> for where we ship. The payment currency is confirmed at checkout before you pay.</p>
        ${devNote('Preview uses indicative fixed rates. Live store: Shopify Markets converts prices and applies rounding; country list = markets the owner activates.')}
        <button class="btn btn--block" type="submit" style="margin-top:8px">Update</button>
      </form>`;
  }
  function setCountry(code) {
    state.country = code; store.set('country', code);
    store.set('suggestDismissed', true);
    renderLocaleSuggest(); renderHeader(); renderFooter(); route();
    announce(`Prices now shown in ${marketBy(code).currency}.`);
  }
  // Suggest — never force — a country from the browser's time zone.
  function suggestedCountry() {
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* ignore */ }
    if (tz === 'Africa/Lagos') return 'NG';
    if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Montreal)/.test(tz)) return 'CA';
    if (/^America\//.test(tz)) return 'US';
    if (tz === 'Europe/Dublin') return 'IE';
    if (tz === 'Europe/Paris') return 'FR';
    if (tz === 'Europe/Berlin') return 'DE';
    return null;
  }
  function renderLocaleSuggest() {
    const s = suggestedCountry();
    const el = $('#locale-suggest');
    if (!s || s === state.country || store.get('suggestDismissed', false) || state.mode === 'prelaunch') { el.innerHTML = ''; return; }
    const m = marketBy(s);
    el.innerHTML = `<div class="locale-suggest" role="region" aria-label="Country suggestion">
      <span>Shopping from ${esc(m.country)}? View prices in ${m.currency}.</span>
      <button class="btn" type="button" data-set-country="${m.code}">Switch to ${m.currency}</button>
      <button class="btn btn--secondary" type="button" data-dismiss-suggest>Stay in ${marketBy(state.country).currency}</button></div>`;
  }

  // ---------- Bag ----------
  const lineKey = (l) => [l.handle, l.colour, l.size, l.set || ''].join('|');
  function addToCart(items) {
    // All-or-nothing: validate every piece before adding any.
    const next = state.cart.map((l) => ({ ...l }));
    for (const it of items) {
      const p = P[it.handle];
      const existing = next.find((l) => lineKey(l) === lineKey(it));
      const already = next.filter((l) => l.handle === it.handle && l.colour === it.colour && l.size === it.size).reduce((a, l) => a + l.qty, 0);
      const max = maxQty(p, it.colour, it.size);
      if (already + it.qty > max) {
        return { ok: false, error: max === 0 ? `${p.title} in ${cLabel(it.colour)}, size ${it.size} is sold out.` : `Only ${max} of ${p.title} (${cLabel(it.colour)}, ${it.size}) available — your bag already has ${already}.` };
      }
      if (existing) existing.qty += it.qty; else next.push({ ...it });
    }
    state.cart = next; saveCart();
    return { ok: true };
  }
  function cartTotals() {
    const sub = state.cart.reduce((a, l) => a + conv(P[l.handle].price) * l.qty, 0);
    return { sub };
  }
  function currencyNote() {
    const c = cur();
    let note = '';
    if (c !== 'GBP') note += `<p class="currency-note">Prices are shown in ${c}. If ${c} can't be used for payment, checkout will show the amount in GBP before you pay.</p>`;
    if (c !== 'GBP') note += devNote(`Preview rates are indicative fixtures. ${c === 'NGN' ? 'NGN is on Shopify\'s supported presentment-currency list, but naira checkout and payment-method coverage for Nigerian cards must be tested on the live store before this note is relaxed.' : 'Live store: Shopify Payments converts at market rates (2% conversion fee applies for UK stores).'}`);
    return note;
  }
  function cartLinesHTML(context) {
    return state.cart.map((l, i) => {
      const p = P[l.handle];
      const st = variantStatus(p, l.colour, l.size);
      const max = maxQty(p, l.colour, l.size);
      const id = `${context}-q-${i}`;
      return `<li class="cart-line" data-key="${esc(lineKey(l))}">
        <a href="#/products/${p.handle}?colour=${l.colour}" tabindex="-1" aria-hidden="true">${ph({ label: p.title, art: garment(p.shape, l.colour), ratio: 'ratio-tall', tag: 'Fixture' })}</a>
        <div>
          <div class="cart-line__top"><a class="cart-line__title" href="#/products/${p.handle}?colour=${l.colour}">${esc(p.title)}</a><span class="price">${fmt(conv(p.price) * l.qty)}</span></div>
          <p class="cart-line__opts">${esc(cLabel(l.colour))} · Size ${esc(l.size)}${l.set ? ` · Part of ${esc(SETS[l.set]?.title || 'set')}` : ''}</p>
          ${st === 'preorder' ? `<p class="cart-line__opts">Pre-order — ${esc(p.preorder[l.colour])}</p>` : ''}
          <div class="cart-line__bottom">
            <div class="qty" role="group" aria-label="Quantity for ${esc(p.title)}">
              <button type="button" data-qty="-1" aria-label="Decrease quantity">−</button>
              <label for="${id}" class="visually-hidden">Quantity</label>
              <input id="${id}" type="number" inputmode="numeric" min="0" max="${max}" value="${l.qty}" data-qty-input>
              <button type="button" data-qty="1" aria-label="Increase quantity"${l.qty >= max ? ' aria-disabled="true"' : ''}>+</button>
            </div>
            <button type="button" class="remove-btn" data-remove>Remove<span class="visually-hidden"> ${esc(p.title)}</span></button>
          </div>
          <p class="xsmall" data-line-msg role="status" style="color:var(--c-error)"></p>
        </div></li>`;
    }).join('');
  }
  function checkoutBlock() {
    const { sub } = cartTotals();
    const disabled = state.mode !== 'live';
    return `<div class="cart-totals">
        <div class="cart-totals__row cart-totals__row--total"><span>Subtotal</span><span class="price">${fmt(sub)}</span></div>
        <div class="cart-totals__row small muted"><span>Delivery</span><span>Calculated at checkout</span></div>
      </div>
      <p class="xsmall muted" style="margin-top:6px">Taxes, delivery charges and any import duties are shown at checkout before you pay.</p>
      ${devNote('Owner to confirm: VAT-inclusive pricing, duties treatment (DDP/DAP) and shipping rates. Nothing is promised here until confirmed.')}
      ${currencyNote()}
      <button class="btn btn--block" type="button" data-checkout${disabled ? ' aria-disabled="true"' : ''}>${disabled ? 'Checkout opens at launch' : 'Checkout'}</button>
      <p class="xsmall muted text-center" style="margin-top:10px">Secure checkout hosted by Shopify. Guest checkout available.</p>`;
  }
  function renderCartDrawer() {
    const n = state.cart.reduce((a, l) => a + l.qty, 0);
    $('#cart-drawer').innerHTML = `
      <div class="drawer__head"><h2 id="cart-title">Bag (${n})</h2><button class="icon-btn" type="button" data-close>${I.close}<span class="visually-hidden">Close bag</span></button></div>
      ${n ? `<div class="drawer__body" data-cart-context="drawer"><ul role="list">${cartLinesHTML('drawer')}</ul><a class="link-arrow mt-16" href="#/cart">View full bag</a></div>
             <div class="drawer__foot">${checkoutBlock()}</div>`
        : `<div class="drawer__body"><div class="empty-state"><p class="h3">Your bag is empty</p><p>Start with the launch collection — everyday pieces and matching sets.</p><a class="btn" href="#/collections/all">Shop the collection</a></div></div>`}`;
  }
  function refreshCartViews() {
    if (active?.id === 'cart-drawer') {
      const focusedKey = document.activeElement?.closest('[data-key]')?.dataset.key;
      const which = document.activeElement?.matches('[data-qty="1"]') ? '[data-qty="1"]' : document.activeElement?.matches('[data-qty="-1"]') ? '[data-qty="-1"]' : '[data-qty-input]';
      renderCartDrawer();
      const line = focusedKey && $(`#cart-drawer [data-key="${CSS.escape(focusedKey)}"]`);
      (line ? $(which, line) : $('#cart-drawer [data-close]'))?.focus();
    }
    if (location.hash.startsWith('#/cart')) route({ keepFocus: true });
  }
  function changeLine(key, newQty, msgEl) {
    const idx = state.cart.findIndex((l) => lineKey(l) === key);
    if (idx < 0) return;
    const l = state.cart[idx]; const p = P[l.handle];
    const otherSame = state.cart.filter((x, j) => j !== idx && x.handle === l.handle && x.colour === l.colour && x.size === l.size).reduce((a, x) => a + x.qty, 0);
    const max = maxQty(p, l.colour, l.size) - otherSame;
    let msg = '';
    if (newQty > max) { newQty = max; msg = `Only ${maxQty(p, l.colour, l.size)} available in this size.`; }
    if (newQty <= 0) { state.cart.splice(idx, 1); announce(`${p.title} removed from bag.`); }
    else { l.qty = newQty; announce(`${p.title} quantity ${newQty}.`); }
    saveCart(); refreshCartViews();
    if (msg) { const line = $$(`[data-key="${CSS.escape(key)}"] [data-line-msg]`); line.forEach((m) => { m.textContent = msg; }); }
  }

  // ---------- Search ----------
  const PAGE_INDEX = [
    ['our-story', 'Our Story'], ['contact', 'Contact'], ['size-guide', 'Size Guide'], ['delivery-returns', 'Delivery & Returns'],
    ['faqs', 'FAQs'], ['privacy-cookies', 'Privacy & Cookies'], ['terms', 'Terms & Conditions']
  ];
  function searchItems(q) {
    const t = q.trim().toLowerCase();
    if (!t) return { items: [], pages: [] };
    const words = t.split(/\s+/);
    const hay = (i) => [i.title, i.type, i.summary, ...i.colours.map(cLabel), i.isSet ? 'set matching' : ''].join(' ').toLowerCase();
    return {
      items: ALL_ITEMS.filter((i) => words.every((w) => hay(i).includes(w))),
      pages: PAGE_INDEX.filter(([, title]) => words.every((w) => title.toLowerCase().includes(w)))
    };
  }
  function searchResultsHTML(q, limit) {
    const { items, pages } = searchItems(q);
    if (!items.length && !pages.length) return `<div class="empty-state" style="padding:32px 0"><p>No results for “${esc(q)}”.</p><p class="small">Try a product type (“legging”), a colour (“olive”) or browse <a href="#/collections/all">Shop All</a>.</p></div>`;
    return `<div class="search-results">
      <div><h3>Products (${items.length})</h3><div class="search-results__products">${items.slice(0, limit || items.length).map(card).join('')}</div>
      ${limit && items.length > limit ? `<a class="link-arrow mt-16" href="#/search?q=${encodeURIComponent(q)}">See all ${items.length} results</a>` : ''}</div>
      <div><h3>Pages</h3>${pages.length ? `<ul role="list">${pages.map(([h, t]) => `<li><a href="#/pages/${h}">${esc(t)}</a></li>`).join('')}</ul>` : '<p class="small muted">No matching pages.</p>'}</div>
    </div>`;
  }

  // ---------- Multi-piece picker (Shop the Look + Matching Sets) ----------
  function multiPicker(id, pieces, { colourSelectable = false, setHandle = null } = {}) {
    const rows = pieces.map(([handle, colour], idx) => {
      const p = P[handle];
      const c = p.colours.includes(colour) ? colour : p.colours.find((x) => colourAvailable(p, x)) || p.colours[0];
      return `<div class="look-item" data-idx="${idx}" data-handle="${handle}" data-colour="${c}">
        <a href="#/products/${handle}?colour=${c}" tabindex="-1" aria-hidden="true" data-thumb>${ph({ label: p.title, art: garment(p.shape, c), ratio: 'ratio-tall', tag: 'Fixture' })}</a>
        <div>
          <div class="look-item__head"><a class="look-item__name" href="#/products/${handle}?colour=${c}">${esc(p.title)}</a><span class="price">${money(p.price)}</span></div>
          ${colourSelectable ? `<fieldset class="option-group" style="margin-bottom:12px"><legend>Colour <span class="selected-value" data-colour-label>${esc(cLabel(c))}</span></legend><div class="option-row">
            ${p.colours.map((x) => `<input type="radio" id="${id}-${idx}-c-${x}" name="${id}-${idx}-colour" value="${x}"${x === c ? ' checked' : ''} data-colour-input><label class="swatch-btn" for="${id}-${idx}-c-${x}" style="min-height:40px;padding:4px 12px 4px 6px"><span class="swatch" style="--swatch:${D.colours[x].hex};width:22px;height:22px"></span>${esc(cLabel(x))}${colourAvailable(p, x) ? '' : ' — sold out'}</label>`).join('')}
          </div></fieldset>` : `<p class="small muted" style="margin:-4px 0 10px">${esc(cLabel(c))}</p>`}
          <fieldset class="option-group" style="margin-bottom:6px"><legend>Size <span class="selected-value" data-size-label>Select a size</span></legend><div class="option-row" data-sizes></div></fieldset>
          <p class="xsmall" data-item-msg role="status"></p>
          <label class="checkbox look-item__include"><input type="checkbox" checked data-include> Include ${esc(p.title)}</label>
        </div></div>`;
    }).join('');
    const live = state.mode === 'live';
    return `<div class="multi" id="${id}" data-multi${setHandle ? ` data-set="${setHandle}"` : ''}>
      ${rows}
      <div class="look__total"><span data-total-label>Total</span><strong class="price" data-total></strong></div>
      <p class="small" data-summary></p>
      <div data-error role="alert"></div>
      ${live ? `<button class="btn btn--block" type="button" data-multi-add>Add to bag</button>`
        : `<a class="btn btn--block" href="#/" data-scroll="signup">Join the Launch List</a><p class="xsmall muted mt-16">Shopping opens at launch.</p>`}
    </div>`;
  }
  function sizesHTML(id, idx, p, colour, selected) {
    return D.sizes.map((s) => {
      const st = variantStatus(p, colour, s);
      const out = st === 'out';
      return `<input type="radio" id="${id}-${idx}-s-${s}" name="${id}-${idx}-size" value="${s}"${out ? ' disabled' : ''}${selected === s && !out ? ' checked' : ''} data-size-input>
        <label class="size-btn${out ? ' is-unavailable' : ''}" for="${id}-${idx}-s-${s}">${s}<span class="visually-hidden">${out ? ' — sold out' : st === 'low' ? ' — low stock' : st === 'preorder' ? ' — pre-order' : ''}</span></label>`;
    }).join('');
  }
  function initMulti(root) {
    const id = root.id;
    $$('.look-item', root).forEach((row) => {
      const p = P[row.dataset.handle];
      $('[data-sizes]', row).innerHTML = sizesHTML(id, row.dataset.idx, p, row.dataset.colour, null);
    });
    updateMulti(root);
  }
  function multiState(root) {
    return $$('.look-item', root).map((row) => {
      const p = P[row.dataset.handle];
      const colour = row.dataset.colour;
      const size = $('[data-size-input]:checked', row)?.value || null;
      return { row, p, colour, size, include: $('[data-include]', row).checked, colourOk: colourAvailable(p, colour) };
    });
  }
  function updateMulti(root) {
    const items = multiState(root);
    let total = 0; const included = items.filter((i) => i.include);
    items.forEach((i) => {
      const msg = $('[data-item-msg]', i.row);
      $('[data-size-label]', i.row).textContent = i.size ? i.size : 'Select a size';
      if (!i.colourOk) { msg.textContent = `Sold out in ${cLabel(i.colour)}. Choose another colour or untick to add the other pieces.`; msg.style.color = 'var(--c-error)'; }
      else if (i.size) {
        const st = variantStatus(i.p, i.colour, i.size);
        msg.textContent = st === 'low' ? `Only ${qty(i.p, i.colour, i.size)} left in ${i.size}` : st === 'preorder' ? `Pre-order — ${i.p.preorder[i.colour]}` : 'In stock';
        msg.style.color = st === 'in' ? 'var(--c-success)' : '';
      } else { msg.textContent = ''; }
      i.row.style.opacity = i.include ? '' : '.55';
      if (i.include) total += conv(i.p.price);
    });
    $('[data-total]', root).textContent = fmt(total);
    $('[data-total-label]', root).textContent = `Total for ${included.length} of ${items.length} piece${items.length > 1 ? 's' : ''}`;
    const excluded = items.filter((i) => !i.include);
    $('[data-summary]', root).innerHTML = excluded.length
      ? `<strong>Not included:</strong> ${excluded.map((i) => esc(i.p.title)).join(', ')}. Only the ticked pieces will be added.`
      : '';
    const btn = $('[data-multi-add]', root);
    if (btn) {
      btn.textContent = included.length === items.length ? `Add ${root.dataset.set ? 'set' : 'look'} to bag — ${fmt(total)}` : included.length ? `Add ${included.length} of ${items.length} pieces — ${fmt(total)}` : 'Select at least one piece';
      const blocked = !included.length || included.some((i) => !i.colourOk);
      btn.setAttribute('aria-disabled', String(blocked));
    }
  }
  function submitMulti(root) {
    const items = multiState(root);
    const err = $('[data-error]', root);
    const included = items.filter((i) => i.include);
    const soldOut = included.filter((i) => !i.colourOk);
    if (!included.length) { err.innerHTML = '<p class="status-msg status-msg--error">Tick at least one piece to add.</p>'; return; }
    if (soldOut.length) { err.innerHTML = `<p class="status-msg status-msg--error">${soldOut.map((i) => esc(i.p.title)).join(', ')} is sold out in the chosen colour. Choose another colour or untick it — nothing has been added.</p>`; return; }
    const missing = included.filter((i) => !i.size);
    if (missing.length) {
      err.innerHTML = `<p class="status-msg status-msg--error">Choose a size for: ${missing.map((i) => esc(i.p.title)).join(', ')}. Nothing has been added yet.</p>`;
      $('[data-size-input]:not(:disabled)', missing[0].row)?.focus();
      return;
    }
    const res = addToCart(included.map((i) => ({ handle: i.p.handle, colour: i.colour, size: i.size, qty: 1, set: root.dataset.set || null })));
    if (!res.ok) { err.innerHTML = `<p class="status-msg status-msg--error">${esc(res.error)} Nothing has been added.</p>`; return; }
    err.innerHTML = '';
    announce(`${included.length} piece${included.length > 1 ? 's' : ''} added to bag.`);
    openLayer('cart-drawer', $('[data-multi-add]', root));
  }

  // ---------- Pages ----------
  const main = () => $('#main');

  function homePage() {
    const live = state.mode === 'live';
    const products = ALL_ITEMS.filter((i) => !i.isSet);
    const look = D.looks[0];
    return `
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero__media">
        <div class="placeholder" role="img" aria-label="Campaign placeholder: three women of different builds and skin tones wearing the collection, full length" style="--ph-bg:#8f8170">
          ${figures(HERO_FIGS)}
          <span class="placeholder__tag">Dev fixture — campaign photo or muted video pending</span>
        </div>
        <div class="hero__scrim"></div>
      </div>
      <div class="hero__content page-width">
        <h1 class="h-display hero__title" id="hero-title">Everyday<br>in motion.</h1>
        <div class="hero__aside">
          <p class="hero__sub">Considered comfort. Confident style.</p>
          <div class="hero__ctas">${live ? '<a class="btn btn--light" href="#/collections/all">Shop the Collection</a>' : '<a class="btn btn--light" href="#/" data-scroll="signup">Join the Launch List</a>'}</div>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="launch-title">
      <div class="page-width">
        <div class="section__head" data-reveal>
          <div><span class="eyebrow">The launch collection</span><h2 class="h1" id="launch-title">Made for the<br>whole day</h2></div>
          <a class="link-arrow" href="#/collections/all">Shop all</a>
        </div>
        <div class="product-grid product-grid--4">${products.map(card).join('')}</div>
      </div>
    </section>

    <section class="section color-scheme-paper" aria-labelledby="look-title">
      <div class="page-width">
        <div class="section__head" data-reveal><div><span class="eyebrow">Shop the look</span><h2 class="h1" id="look-title">Styled to<br>go together</h2></div>
          <p class="muted" style="max-width:36ch">Pick a size for each piece. Untick anything you already own — the total updates as you go.</p></div>
        <div class="look__tabs" role="tablist" aria-label="Looks">${D.looks.map((l, i) => `<button type="button" role="tab" id="tab-${l.id}" aria-selected="${i === 0}" aria-controls="panel-look" tabindex="${i === 0 ? 0 : -1}" data-look="${l.id}">${esc(l.name)}</button>`).join('')}</div>
        <div id="panel-look" role="tabpanel" aria-labelledby="tab-${look.id}">${lookPanel(look)}</div>
      </div>
    </section>

    <section class="section" aria-labelledby="details-title">
      <div class="page-width">
        <div class="section__head" data-reveal><div><span class="eyebrow">Considered details</span><h2 class="h1" id="details-title">Up close</h2></div>
          <p class="muted" style="max-width:38ch">Fabric, seams, pockets and tonal branding — the small decisions that make everyday pieces feel right.</p></div>
        <div class="details-grid">
          ${[['Fabric texture', 'motion-rib-legging', 'chocolate', 'Close-up of the knit surface and how it catches light.'],
             ['Waistband', 'flare-legging', 'black', 'The waistband construction, photographed flat and worn.'],
             ['Pockets', 'everyday-jogger', 'charcoal', 'Pocket placement and finishing on the jogger.'],
             ['Tonal branding', 'relaxed-crew-sweatshirt', 'chocolate', 'Subtle tonal TKX branding near the hem.']]
            .map(([h, handle, c, t]) => `<figure class="detail-card" data-reveal>
              ${ph({ label: `${h} — macro detail`, art: garment(P[handle].shape, c, 'detail'), ratio: 'ratio-square' })}
              <figcaption><h3>${h}</h3><p>${t}</p>${devNote('Replace with verified feature copy from the garment spec. No performance claims.')}</figcaption></figure>`).join('')}
        </div>
      </div>
    </section>

    <section class="section section--flush-top" aria-labelledby="editorial-title">
      <div class="page-width">
        <div class="section__head" data-reveal><div><span class="eyebrow">In motion</span><h2 class="h1" id="editorial-title">Wherever<br>the day goes</h2></div></div>
        <div class="editorial">
          ${[['Everyday plans', 'ratio-landscape', '#b3a493', [HERO_FIGS[1], { top: ['longsleeve', 'black'], bottom: ['flare', 'black'], skin: '#c99878', sx: 1.05 }]],
             ['Travel days', 'ratio-tall', '#6e6656', [HERO_FIGS[2]]],
             ['Relaxed work', 'ratio-portrait', '#cfc4b4', [{ top: ['longsleeve', 'ivory'], bottom: ['trouser', 'charcoal'], skin: '#8a5a3c', sx: 1.1 }]],
             ['Studio to street', 'ratio-landscape', '#4f4a3c', [HERO_FIGS[0], { top: ['bra', 'olive'], bottom: ['legging', 'olive'], skin: '#e2b896', sx: 0.95 }]],
             ['Weekend', 'ratio-landscape', '#9a8a78', [{ top: ['sweat', 'chocolate'], bottom: ['jogger', 'charcoal'], skin: '#5a3a28', sx: 1.15 }]]]
            .map(([cap, ratio, bg, figs]) => `<figure class="editorial__item" data-reveal>${ph({ label: `Lifestyle: ${cap}`, art: figures(figs), ratio, bg })}<figcaption>${cap}</figcaption></figure>`).join('')}
        </div>
      </div>
    </section>

    <section class="section color-scheme-paper" aria-labelledby="story-title">
      <div class="page-width story">
        ${ph({ label: 'Our Story: founder or studio image', art: figures([{ top: ['jacket', 'taupe'], bottom: ['trouser', 'taupe'], skin: '#8a5a3c', sx: 1 }]), ratio: 'ratio-portrait', bg: '#d8cfc1' })}
        <div class="story__text" data-reveal>
          <div class="placeholder__tag" style="position:static;justify-self:start;border:1px dashed #b39500">Approved emblem goes here</div>
          <span class="eyebrow">Our story</span>
          <h2 class="h1" id="story-title">Comfort first.<br>Confidence always.</h2>
          ${storyCopy()}
          <a class="link-arrow" href="#/pages/our-story">Read our story</a>
        </div>
      </div>
    </section>`;
  }
  const storyCopy = () => `<p>TKX London designs for the in-between: the commute, the desk, the class after work and the dinner after that. We start with comfort, then shape it into pieces you feel confident wearing all day.</p>
    <p>Our first collection is womenswear: considered essentials and matching sets in black, charcoal, chocolate, taupe and olive, made to be mixed, layered and worn on repeat.</p>
    ${devNote('Draft copy written from the brief — owner to approve or replace.')}`;

  function lookPanel(look) {
    return `<div class="look">
      ${ph({ label: `Shop the look: ${look.name} — full-length outfit`, ratio: 'ratio-portrait', bg: '#cdc2b2',
        art: figures([{ top: [P[look.items[0][0]].shape, look.items[0][1]], bottom: [P[look.items[1][0]].shape, look.items[1][1]], skin: SKINS[look.id.length % 4], sx: 1 }]) })}
      <div>${multiPicker('m-' + look.id, look.items)}</div></div>`;
  }

  // Collection page with storefront-style filtering
  function collectionPage(handle, q) {
    const col = collectionBy(handle);
    if (!col) return null;
    const items = col.items();
    if (!items.length) {
      return `<div class="page-width"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/">Home</a> / ${esc(col.title)}</nav>
        <div class="collection-hero"><h1 class="h1">${esc(col.title)}</h1></div>
        <div class="empty-state"><p class="h3">Coming soon</p><p>There's nothing in ${esc(col.title)} just yet. This collection stays out of the menu until it has products.</p><a class="btn" href="#/collections/all">Shop all</a></div></div>`;
    }
    return `<div class="page-width" data-collection="${handle}">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/">Home</a> / ${esc(col.title)}</nav>
      <div class="collection-hero"><h1 class="h1">${esc(col.title)}</h1><p class="lede muted">${esc(col.intro)}</p></div>
      <div class="collection-toolbar">
        <button class="chip chip--plain mobile-only" type="button" data-open="filter-drawer" aria-controls="filter-drawer" aria-expanded="false">${I.filter} Filter</button>
        <p class="small" id="result-count" aria-live="polite"></p>
        <label class="small" style="display:flex;align-items:center;gap:6px">Sort <select class="select" id="sort">
          <option value="featured">Featured</option><option value="price-asc">Price, low to high</option><option value="price-desc">Price, high to low</option><option value="title">Name, A–Z</option></select></label>
      </div>
      <div class="collection-layout">
        <aside class="facets" aria-label="Filters">${facetsHTML('d')}</aside>
        <div><div class="active-filters" id="active-filters"></div><div class="product-grid" id="grid"></div></div>
      </div>
    </div>`;
  }
  let filters = null;
  const emptyFilters = () => ({ size: [], colour: [], inStock: false, min: '', max: '', sort: 'featured' });
  function filtersFromQuery(q) {
    const f = emptyFilters();
    f.size = (q.get('size') || '').split(',').filter(Boolean);
    f.colour = (q.get('colour') || '').split(',').filter(Boolean);
    f.inStock = q.get('stock') === '1';
    f.min = q.get('min') || ''; f.max = q.get('max') || '';
    f.sort = q.get('sort') || 'featured';
    return f;
  }
  function facetsHTML(prefix) {
    const col = collectionBy(currentCollection());
    const items = col ? col.items() : [];
    const colours = [...new Set(items.flatMap((i) => i.colours))];
    const count = (fn) => items.filter(fn).length;
    const f = filters || emptyFilters();
    return `<form data-facets="${prefix}" onsubmit="return false">
      <details class="facet" open><summary>Size</summary><div class="facet__list">${D.sizes.map((s) => `<label><input type="checkbox" name="size" value="${s}"${f.size.includes(s) ? ' checked' : ''}> ${s} <span class="count">(${count((i) => i.hasSize(s))})</span></label>`).join('')}</div></details>
      <details class="facet" open><summary>Colour</summary><div class="facet__list">${colours.map((c) => `<label><input type="checkbox" name="colour" value="${c}"${f.colour.includes(c) ? ' checked' : ''}><span class="swatch" style="--swatch:${D.colours[c].hex}" aria-hidden="true"></span>${esc(cLabel(c))} <span class="count">(${count((i) => i.colours.includes(c))})</span></label>`).join('')}</div></details>
      <details class="facet" open><summary>Availability</summary><div class="facet__list"><label><input type="checkbox" name="stock" value="1"${f.inStock ? ' checked' : ''}> In stock only <span class="count">(${count((i) => i.inStock)})</span></label></div></details>
      <details class="facet"><summary>Price (${cur()})</summary><div class="facet__price">
        <div class="field"><label for="${prefix}-min">From</label><input class="input" id="${prefix}-min" name="min" type="number" inputmode="numeric" min="0" value="${esc(f.min)}" placeholder="${D.currencies[cur()].symbol}0"></div>
        <div class="field"><label for="${prefix}-max">To</label><input class="input" id="${prefix}-max" name="max" type="number" inputmode="numeric" min="0" value="${esc(f.max)}" placeholder="${D.currencies[cur()].symbol}${Math.ceil(conv(Math.max(...items.map((i) => i.price))))}"></div>
      </div></details>
      <button type="button" class="btn btn--secondary btn--block mt-16" data-reset-filters>Reset filters</button>
    </form>`;
  }
  const currentCollection = () => (location.hash.match(/^#\/collections\/([^?]+)/) || [])[1];
  function applyFilters() {
    const col = collectionBy(currentCollection());
    if (!col) return [];
    const f = filters;
    let list = col.items().filter((i) =>
      (!f.size.length || f.size.some((s) => i.hasSize(s))) &&
      (!f.colour.length || f.colour.some((c) => i.colours.includes(c))) &&
      (!f.inStock || i.inStock) &&
      (f.min === '' || conv(i.price) >= Number(f.min)) &&
      (f.max === '' || conv(i.price) <= Number(f.max)));
    if (f.sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (f.sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    if (f.sort === 'title') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }
  function renderResults() {
    const list = applyFilters();
    const f = filters;
    $('#grid').innerHTML = list.length ? list.map(card).join('')
      : `<div class="empty-state" style="grid-column:1/-1"><p class="h3">No matches</p><p>No products match these filters. Try removing one, or reset to see everything.</p><button class="btn" type="button" data-reset-filters>Reset filters</button></div>`;
    $('#result-count').textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
    const chips = [
      ...f.size.map((s) => [`Size: ${s}`, 'size', s]), ...f.colour.map((c) => [`Colour: ${cLabel(c)}`, 'colour', c]),
      ...(f.inStock ? [['In stock only', 'stock', '1']] : []),
      ...(f.min !== '' ? [[`From ${D.currencies[cur()].symbol}${f.min}`, 'min', '']] : []), ...(f.max !== '' ? [[`To ${D.currencies[cur()].symbol}${f.max}`, 'max', '']] : [])];
    $('#active-filters').innerHTML = chips.length ? chips.map(([l, k, v]) => `<button type="button" class="chip" data-remove-filter="${k}" data-value="${esc(v)}" aria-label="Remove filter ${esc(l)}">${esc(l)}</button>`).join('') + '<button type="button" class="chip chip--plain" data-reset-filters>Clear all</button>' : '';
    $('#sort').value = f.sort;
    const fd = $('#filter-drawer');
    if (fd && !fd.hidden) { const b = $('[data-show-results]', fd); if (b) b.textContent = `Show ${list.length} product${list.length === 1 ? '' : 's'}`; }
    // Keep the URL shareable without triggering a re-render
    const p = new URLSearchParams();
    if (f.size.length) p.set('size', f.size.join(','));
    if (f.colour.length) p.set('colour', f.colour.join(','));
    if (f.inStock) p.set('stock', '1');
    if (f.min !== '') p.set('min', f.min);
    if (f.max !== '') p.set('max', f.max);
    if (f.sort !== 'featured') p.set('sort', f.sort);
    const qs = p.toString();
    history.replaceState(null, '', `#/collections/${currentCollection()}${qs ? '?' + qs : ''}`);
  }
  function readFacetForm(form) {
    filters.size = $$('[name="size"]:checked', form).map((x) => x.value);
    filters.colour = $$('[name="colour"]:checked', form).map((x) => x.value);
    filters.inStock = Boolean($('[name="stock"]:checked', form));
    filters.min = $('[name="min"]', form).value.trim();
    filters.max = $('[name="max"]', form).value.trim();
  }
  function syncFacetForms(except) {
    const d = $('.facets');
    if (d && except !== 'd') d.innerHTML = facetsHTML('d');
    const m = $('#filter-drawer [data-facet-slot]');
    if (m && except !== 'm') m.innerHTML = facetsHTML('m');
  }
  function renderFilterDrawer() {
    $('#filter-drawer').innerHTML = `<div class="drawer__head"><h2 id="filter-title">Filter</h2><button class="icon-btn" type="button" data-close>${I.close}<span class="visually-hidden">Close filters</span></button></div>
      <div class="drawer__body" data-facet-slot>${facetsHTML('m')}</div>
      <div class="drawer__foot"><button class="btn btn--block" type="button" data-close data-show-results>Show results</button></div>`;
  }

  // Product page
  function productPage(handle, q) {
    if (SETS[handle]) return setPage(SETS[handle]);
    const p = P[handle];
    if (!p) return null;
    const colour = p.colours.includes(q.get('colour')) ? q.get('colour') : (p.colours.find((c) => colourAvailable(p, c)) || p.colours[0]);
    const live = state.mode === 'live';
    const related = relatedFor(handle);
    return `<div class="page-width">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/">Home</a> / <a href="#/collections/${p.type.toLowerCase()}">${esc(p.type)}</a> / ${esc(p.title)}</nav>
      <div class="product" data-product="${handle}">
        <div class="product__gallery" aria-label="Product images" role="region" tabindex="0" id="gallery">${galleryHTML(p, colour)}</div>
        <div class="product__info">
          <span class="eyebrow muted">${esc(p.type)}</span>
          <h1 class="h2 product__title" style="margin-top:10px">${esc(p.title)}</h1>
          <p class="product__price price">${money(p.price)}</p>
          ${cur() !== 'GBP' ? `<p class="price-note">Indicative ${cur()} price. Payment currency confirmed at checkout.</p>` : ''}
          <p class="small muted" style="margin-top:14px;max-width:46ch">${esc(p.summary)}</p>
          <form id="product-form" novalidate style="margin-top:24px">
            <fieldset class="option-group"><legend>Colour <span class="selected-value" id="colour-label">${esc(cLabel(colour))}</span></legend>
              <div class="option-row">${p.colours.map((c) => `<input type="radio" id="pc-${c}" name="colour" value="${c}"${c === colour ? ' checked' : ''}><label class="swatch-btn" for="pc-${c}"><span class="swatch" style="--swatch:${D.colours[c].hex}"></span>${esc(cLabel(c))}${colourAvailable(p, c) ? (isPre(p, c) && !D.sizes.some((s) => qty(p, c, s) > 0) ? ' — pre-order' : '') : ' — sold out'}</label>`).join('')}</div>
            </fieldset>
            <fieldset class="option-group"><legend>Size <span><span class="selected-value" id="size-label">Select a size</span></span></legend>
              <div class="option-row" id="size-row"></div>
              <button type="button" class="size-guide-link" data-size-guide style="margin-top:8px">Size guide</button>
            </fieldset>
            <div class="stock-line" id="stock-line" role="status" aria-live="polite"></div>
            <div id="atc-error" role="alert"></div>
            <div class="product__cta">
              ${live ? '<button class="btn btn--block" type="submit" id="atc">Add to Bag</button>'
                : '<a class="btn btn--block" href="#/" data-scroll="signup" id="atc">Join the Launch List</a><p class="xsmall muted">Shopping opens at launch. Join the list for first access.</p>'}
            </div>
          </form>
          <ul role="list" class="product__assurances">
            <li><span aria-hidden="true">→</span><span>Dispatch: ${ownerMark('dispatch estimate')}</span></li>
            <li><span aria-hidden="true">→</span><span><a href="#/pages/delivery-returns">Delivery &amp; returns information</a></span></li>
          </ul>
          <div class="product__fit">
            <p><strong>Model:</strong> ${p.model ? esc(p.model) : ownerMark('model height and size worn (from photoshoot)')}</p>
            <p><strong>Fit:</strong> ${p.fit ? esc(p.fit) : ownerMark('fit notes (e.g. true to size / relaxed)')}</p>
          </div>
          <div class="accordion">
            <details><summary>Details &amp; features</summary><div class="accordion__body"><p>${esc(p.summary)}</p><p>Pockets, waistband and fastenings: ${p.features ? esc(p.features) : ownerMark('verified pocket, waistband and fastening details')}</p></div></details>
            <details><summary>Fabric &amp; care</summary><div class="accordion__body"><p>Composition: ${p.fabric ? esc(p.fabric) : ownerMark('fabric composition from supplier spec')}</p><p>Care: ${p.care ? esc(p.care) : ownerMark('care instructions from garment label')}</p></div></details>
            <details><summary>Garment measurements</summary><div class="accordion__body">${measurementsTable(p)}</div></details>
            <details><summary>Delivery &amp; returns</summary><div class="accordion__body"><p>Delivery options and charges are shown at checkout for your address. Returns: ${ownerMark('returns window and process')}</p><p><a href="#/pages/delivery-returns">Full delivery &amp; returns information</a></p></div></details>
          </div>
        </div>
      </div>
      ${related.length ? `<section class="section section--flush-top" aria-labelledby="ctl-title"><div class="section__head"><h2 class="h2" id="ctl-title">Complete the look</h2></div><div class="product-grid product-grid--4">${related.map(card).join('')}</div></section>` : ''}
    </div>
    ${live ? `<div class="sticky-atc" id="sticky-atc" aria-hidden="true"><div class="sticky-atc__info"><strong>${esc(p.title)}</strong><span id="sticky-sel"></span></div><button class="btn" type="button" tabindex="-1" data-sticky-atc>Add to Bag</button></div>` : ''}`;
  }
  function galleryHTML(p, colour) {
    return [['front', 'Front'], ['back', 'Back'], ['detail', 'Fabric detail']].map(([v, l], i) =>
      `<figure>${ph({ label: `${p.title}, ${cLabel(colour)} — ${l}`, art: garment(p.shape, colour, v), ratio: 'ratio-tall', eager: i === 0 })}<figcaption class="gallery-caption">${l}</figcaption></figure>`).join('')
      + `<figure>${ph({ label: `${p.title} — movement video (muted, with controls)`, ratio: 'ratio-tall', dark: true, tag: 'Video slot — awaiting footage' })}<figcaption class="gallery-caption">Movement video</figcaption></figure>`;
  }
  function measurementsTable(p) {
    if (p.measurements) return '';
    return `<div class="table-scroll"><table class="spec-table"><thead><tr><th scope="col">Size</th>${D.sizes.map((s) => `<th scope="col">${s}</th>`).join('')}</tr></thead>
      <tbody>${(isBottom(p.shape) ? ['Waist (flat)', 'Hip', 'Inside leg'] : ['Chest (flat)', 'Length', 'Sleeve']).map((r) => `<tr><th scope="row">${r}</th>${D.sizes.map(() => '<td>—</td>').join('')}</tr>`).join('')}</tbody></table></div>
      <p class="xsmall">${ownerMark('garment measurements in cm from the graded spec sheet')}</p>`;
  }
  function relatedFor(handle) {
    const out = new Set();
    D.sets.filter((s) => s.components.includes(handle)).forEach((s) => { s.components.forEach((h) => h !== handle && out.add(h)); out.add(s.handle); });
    D.looks.filter((l) => l.items.some(([h]) => h === handle)).forEach((l) => l.items.forEach(([h]) => h !== handle && out.add(h)));
    return [...out].slice(0, 4).map((h) => ALL_ITEMS.find((i) => i.handle === h));
  }
  function initProduct(root, q) {
    const p = P[root.dataset.product];
    const form = $('#product-form');
    const preferredSize = q.get('size');
    const draw = (keepSize) => {
      const colour = $('[name="colour"]:checked', form).value;
      const prevSize = keepSize || $('[name="size"]:checked', form)?.value || null;
      $('#size-row').innerHTML = sizesHTML('ps', 0, p, colour, prevSize).replaceAll('name="ps-0-size"', 'name="size"');
      $('#colour-label').textContent = cLabel(colour);
      $('#gallery').innerHTML = galleryHTML(p, colour);
      update();
    };
    const update = () => {
      const colour = $('[name="colour"]:checked', form).value;
      const size = $('[name="size"]:checked', form)?.value;
      $('#size-label').textContent = size || 'Select a size';
      const line = $('#stock-line');
      const atc = $('#atc');
      let label = 'Add to Bag'; let disabled = false;
      if (!colourAvailable(p, colour)) { line.innerHTML = `<span class="stock-dot stock-dot--out"></span>Sold out in ${esc(cLabel(colour))}`; label = 'Sold out'; disabled = true; }
      else if (!size) { line.innerHTML = '<span class="muted">Select a size to see availability</span>'; }
      else {
        const st = variantStatus(p, colour, size);
        line.innerHTML = st === 'in' ? '<span class="stock-dot"></span>In stock'
          : st === 'low' ? `<span class="stock-dot stock-dot--low"></span>Low stock — ${qty(p, colour, size)} left`
          : `<span class="stock-dot stock-dot--preorder"></span>Pre-order — ${esc(p.preorder[colour])}`;
        if (st === 'preorder') label = 'Pre-order';
      }
      if (atc && atc.tagName === 'BUTTON') { atc.textContent = label; atc.setAttribute('aria-disabled', String(disabled)); }
      const sticky = $('#sticky-sel'); if (sticky) sticky.textContent = `${cLabel(colour)}${size ? ' · ' + size : ''} · ${money(p.price)}`;
      const sb = $('[data-sticky-atc]'); if (sb) { sb.textContent = label; sb.setAttribute('aria-disabled', String(disabled)); }
      const qs = new URLSearchParams({ colour }); if (size) qs.set('size', size);
      history.replaceState(null, '', `#/products/${p.handle}?${qs}`);
      $('#atc-error').innerHTML = '';
    };
    form.addEventListener('change', (e) => { if (e.target.name === 'colour') draw(); else update(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (state.mode !== 'live') return;
      const colour = $('[name="colour"]:checked', form).value;
      const size = $('[name="size"]:checked', form)?.value;
      const err = $('#atc-error');
      if (!colourAvailable(p, colour)) { err.innerHTML = `<p class="status-msg status-msg--error">This colour is sold out. Please choose another colour.</p>`; return; }
      if (!size) { err.innerHTML = '<p class="status-msg status-msg--error">Please select a size.</p>'; $('[name="size"]:not(:disabled)', form)?.focus(); return; }
      const res = addToCart([{ handle: p.handle, colour, size, qty: 1, set: null }]);
      if (!res.ok) { err.innerHTML = `<p class="status-msg status-msg--error">${esc(res.error)}</p>`; return; }
      announce(`${p.title}, ${cLabel(colour)}, size ${size} added to bag.`);
      openLayer('cart-drawer', $('#atc'));
    });
    const s0 = preferredSize && D.sizes.includes(preferredSize) ? preferredSize : null;
    draw(s0);
    // Sticky mobile add-to-bag appears once the main button scrolls away
    const sticky = $('#sticky-atc');
    if (sticky) {
      document.body.classList.add('has-sticky-atc');
      let ticking = false;
      const check = () => {
        ticking = false;
        const show = $('#atc').getBoundingClientRect().bottom < 0;
        if (show === sticky.classList.contains('is-visible')) return;
        sticky.classList.toggle('is-visible', show);
        sticky.setAttribute('aria-hidden', String(!show));
        $('[data-sticky-atc]').tabIndex = show ? 0 : -1;
      };
      const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(check); } };
      window.addEventListener('scroll', onScroll, { passive: true });
      check();
      cleanup.push(() => { window.removeEventListener('scroll', onScroll); document.body.classList.remove('has-sticky-atc'); });
    }
    injectJsonLd(p);
  }
  function injectJsonLd(p) {
    // Mirrors snippets/structured-data.liquid. Availability is aggregated across variants.
    const s = document.createElement('script');
    s.type = 'application/ld+json'; s.id = 'jsonld';
    s.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'ProductGroup', name: p.title, description: p.summary, brand: { '@type': 'Brand', name: 'TKX London' },
      productGroupID: p.handle, variesBy: ['https://schema.org/color', 'https://schema.org/size'],
      hasVariant: p.colours.flatMap((c) => D.sizes.map((sz) => ({ '@type': 'Product', name: `${p.title} — ${cLabel(c)} / ${sz}`, color: cLabel(c), size: sz,
        offers: { '@type': 'Offer', priceCurrency: cur(), price: conv(p.price).toFixed(D.currencies[cur()].decimals), availability: `https://schema.org/${variantStatus(p, c, sz) === 'out' ? 'OutOfStock' : variantStatus(p, c, sz) === 'preorder' ? 'PreOrder' : 'InStock'}` } })))
    });
    $('#jsonld')?.remove(); document.head.appendChild(s);
    cleanup.push(() => s.remove());
  }

  function setPage(s) {
    const item = setItem(s);
    return `<div class="page-width">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/">Home</a> / <a href="#/collections/matching-sets">Matching Sets</a> / ${esc(s.title)}</nav>
      <div class="product">
        <div class="product__gallery" role="region" aria-label="Set images" tabindex="0">
          <figure>${ph({ label: `${s.title} — worn together, full length`, art: itemArt(item), ratio: 'ratio-tall', bg: '#cdc2b2' })}<figcaption class="gallery-caption">Worn together</figcaption></figure>
          ${item.comps.map((p) => `<figure>${ph({ label: `${p.title} — front`, art: garment(p.shape, s.colour && p.colours.includes(s.colour) ? s.colour : p.colours[0]), ratio: 'ratio-tall' })}<figcaption class="gallery-caption">${esc(p.title)}</figcaption></figure>`).join('')}
        </div>
        <div class="product__info">
          <span class="eyebrow muted">Matching set · ${item.comps.length} pieces</span>
          <h1 class="h2 product__title" style="margin-top:10px">${esc(s.title)}</h1>
          <p class="small muted" style="max-width:46ch">${esc(s.summary)}</p>
          <p class="small" style="margin:14px 0 18px">Each piece is priced, sized and stocked separately, so you can choose a different size for the top and bottom.</p>
          ${multiPicker('set-' + s.handle, item.comps.map((p) => [p.handle, s.colour || null]), { colourSelectable: true, setHandle: s.handle })}
          <ul role="list" class="product__assurances">
            <li><span aria-hidden="true">→</span><button type="button" class="size-guide-link" data-size-guide>Size guide</button></li>
            <li><span aria-hidden="true">→</span><span><a href="#/pages/delivery-returns">Delivery &amp; returns information</a></span></li>
          </ul>
        </div>
      </div>
    </div>`;
  }

  function cartPage() {
    const n = state.cart.length;
    return `<div class="page-width"><div class="page-hero"><h1 class="h1">Your bag</h1></div>
      ${n ? `<div class="cart-page"><div data-cart-context="page"><ul role="list">${cartLinesHTML('page')}</ul></div>
        <aside class="cart-summary" aria-label="Order summary">${checkoutBlock()}</aside></div>`
      : `<div class="empty-state"><p class="h3">Your bag is empty</p><p>Start with the launch collection — everyday pieces and matching sets.</p><a class="btn" href="#/collections/all">Shop the collection</a></div>`}</div>`;
  }

  function searchPage(q) {
    const term = q.get('q') || '';
    return `<div class="page-width" style="padding-bottom:var(--space-section)"><div class="page-hero"><h1 class="h1">Search</h1></div>
      <form class="search-field" role="search" id="search-page-form" style="max-width:640px"><label for="sp-q" class="visually-hidden">Search</label>${I.search}<input id="sp-q" name="q" type="search" value="${esc(term)}" placeholder="Search products and pages"><button class="btn" type="submit" style="min-height:44px">Search</button></form>
      ${term ? `<p class="small muted mt-16" aria-live="polite">${searchItems(term).items.length + searchItems(term).pages.length} results for “${esc(term)}”</p>${searchResultsHTML(term)}` : '<p class="muted mt-16">Search by product, type or colour.</p>'}</div>`;
  }

  // Content pages — operational details are marked for owner review, never invented.
  const PAGES = {
    'our-story': { title: 'Our Story', body: () => `<div class="story" style="padding-bottom:var(--space-section)">${ph({ label: 'Studio / founder portrait', ratio: 'ratio-portrait', bg: '#d8cfc1', art: figures([HERO_FIGS[0]]) })}
      <div class="story__text rte"><p class="lede">Everyday in motion.</p>${storyCopy()}
      <p>We design womenswear first, with selected unisex pieces and seasonal collections to follow. Every piece is meant to work as hard on a Tuesday as it does on a Saturday.</p>
      ${devNote('Owner: add founder story, design approach and any verified sourcing facts. No sustainability claims without evidence.')}</div></div>` },
    contact: { title: 'Contact', body: () => `<div class="page-layout"><div class="rte small"><p>We aim to help with sizing, orders and anything else.</p><p>Email: ${ownerMark('customer service address')}</p><p>Response time: ${ownerMark('typical reply time')}</p></div>
      <form id="contact-form" novalidate style="max-width:560px">
        <div class="field"><label for="cf-name">Name</label><input class="input" id="cf-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="cf-email">Email</label><input class="input" id="cf-email" name="email" type="email" autocomplete="email" required aria-describedby="cf-email-err"><span class="field__error" id="cf-email-err"></span></div>
        <div class="field"><label for="cf-order">Order number <span class="muted">(optional)</span></label><input class="input" id="cf-order" name="order"></div>
        <div class="field"><label for="cf-msg">Message</label><textarea class="textarea" id="cf-msg" name="message" required minlength="10" aria-describedby="cf-msg-err"></textarea><span class="field__error" id="cf-msg-err"></span></div>
        <div class="hp-field" aria-hidden="true"><label>Leave blank<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
        <p class="xsmall muted">We'll use your details only to reply to this message. See our <a href="#/pages/privacy-cookies">Privacy &amp; Cookies policy</a>.</p>
        <button class="btn mt-16" type="submit">Send message</button>
        <div class="js-form-status" role="status" aria-live="polite"></div>
      </form></div>` },
    'size-guide': { title: 'Size Guide', body: () => `<div class="rte" style="max-width:860px;padding-bottom:var(--space-section)">
      <p>Find your size using your body measurements. If you're between sizes, check each product's fit notes.</p>
      <div class="table-scroll"><table class="size-guide-table"><caption class="visually-hidden">Body measurements by size</caption><thead><tr><th scope="col">Size</th><th scope="col">UK</th><th scope="col">US</th><th scope="col">EU</th><th scope="col">Bust (cm)</th><th scope="col">Waist (cm)</th><th scope="col">Hips (cm)</th></tr></thead>
      <tbody>${D.sizes.map((s) => `<tr><th scope="row">${s}</th>${Array(6).fill('<td class="tbc">TBC</td>').join('')}</tr>`).join('')}</tbody></table></div>
      <p>${ownerMark('size chart from the pattern grading spec — UK/US/EU conversions and cm/in measurements')}</p>
      <h2>How to measure</h2><ul><li><strong>Bust:</strong> measure around the fullest part of your chest, keeping the tape level.</li><li><strong>Waist:</strong> measure around your natural waistline, the narrowest part of your torso.</li><li><strong>Hips:</strong> stand with feet together and measure around the fullest part of your hips.</li></ul>
      <p>Garment measurements for each piece are listed on its product page.</p></div>` },
    'delivery-returns': { title: 'Delivery & Returns', body: () => `<div class="rte" style="padding-bottom:var(--space-section)">
      <h2>Where we deliver</h2><p>${ownerMark('shipping destinations (Shopify Settings → Shipping and delivery)')}</p>
      <p>Choosing a currency on our site doesn't mean we deliver to that country. Checkout only offers delivery to addresses we ship to.</p>
      <h2>Delivery charges and times</h2><p>Delivery options and charges for your address are shown at checkout before you pay.</p><p>${ownerMark('rates and estimated delivery times per zone; dispatch time for in-stock and pre-order items')}</p>
      <h2>Duties and taxes</h2><p>${ownerMark('whether prices include VAT, and whether international orders are shipped duties-paid (DDP) or duties-unpaid (DAP)')}</p>
      <h2>Pre-orders</h2><p>Pre-order items show an expected dispatch window on the product page. ${ownerMark('pre-order policy, including split shipments and cancellation')}</p>
      <h2>Returns and exchanges</h2><p>${ownerMark('returns window, condition requirements, how to start a return, who pays return postage, refund timing')}</p>
      <p>Your statutory rights as a consumer are not affected.</p></div>` },
    faqs: { title: 'FAQs', body: () => `<div class="accordion" style="max-width:860px;margin-bottom:var(--space-section)">
      ${[['When do you launch?', `We're targeting 26 December 2026. Join the launch list for first access and confirmation of the date.`],
         ['How do I choose my size?', 'Use our <a href="#/pages/size-guide">Size Guide</a> and the fit notes and garment measurements on each product page.'],
         ['Can I buy different sizes in a matching set?', 'Yes. Each piece in a set is chosen separately, so you can pick one size for the top and another for the bottom.'],
         ['Which currencies can I shop in?', 'You can view prices in GBP, USD, EUR, NGN and CAD. The currency you pay in is confirmed at checkout before you pay.'],
         ['Do I need an account to order?', 'No. You can check out as a guest.'],
         ['Which payment methods do you accept?', 'Available payment methods are shown at checkout and can depend on your country.'],
         ['Where do you deliver?', `See <a href="#/pages/delivery-returns">Delivery &amp; Returns</a>. ${ownerMark('confirm destinations')}`],
         ['How do returns work?', `${ownerMark('returns policy summary')}`]]
        .map(([q, a]) => `<details><summary>${q}</summary><div class="accordion__body"><p>${a}</p></div></details>`).join('')}</div>` },
    'privacy-cookies': { title: 'Privacy & Cookies', body: () => `<div class="rte" style="padding-bottom:var(--space-section)">
      ${devNote('Template structure only. Owner/legal adviser must complete this. Shopify can generate a starting template (Settings → Policies). The native cookie banner requires a published privacy policy.')}
      <h2>Who we are</h2><p>${ownerMark('legal entity name, registered address, company number, ICO registration (if applicable), contact email')}</p>
      <h2>What we collect and why</h2><p>${ownerMark('order, account, marketing and analytics data; lawful bases')}</p>
      <h2>Email marketing</h2><p>We only send marketing emails if you've opted in. Every email includes an unsubscribe link, and you can also contact us to unsubscribe.</p>
      <h2>Cookies</h2><p>We use essential cookies to run the shop (for example, your bag). Analytics and marketing cookies are used only with your consent, which you can change at any time via <button type="button" class="size-guide-link" data-cookie-prefs>Cookie preferences</button>.</p><p>${ownerMark('list of cookies and third parties after apps are chosen')}</p>
      <h2>Your rights</h2><p>${ownerMark('UK GDPR rights and how to exercise them')}</p></div>` },
    terms: { title: 'Terms & Conditions', body: () => `<div class="rte" style="padding-bottom:var(--space-section)">
      ${devNote('Template structure only — owner/legal adviser to complete. Shopify can generate a starting template (Settings → Policies).')}
      <h2>About us</h2><p>${ownerMark('trading name, legal entity, registered address')}</p>
      <h2>Orders and contract</h2><p>${ownerMark('when a contract is formed; order acceptance')}</p>
      <h2>Prices and payment</h2><p>Prices may be displayed in several currencies. The amount and currency you'll pay are confirmed at checkout before you pay. ${ownerMark('VAT and duties statement')}</p>
      <h2>Pre-orders</h2><p>${ownerMark('pre-order terms')}</p>
      <h2>Delivery, cancellations and returns</h2><p>${ownerMark('consumer cancellation rights (14-day period under UK Consumer Contracts Regulations) and returns terms')}</p>
      <h2>Governing law</h2><p>${ownerMark('governing law and jurisdiction')}</p></div>` }
  };
  function contentPage(slug) {
    const pg = PAGES[slug];
    if (!pg) return null;
    return `<div class="page-width"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/">Home</a> / ${esc(pg.title)}</nav>
      <div class="page-hero"><h1 class="h1">${esc(pg.title)}</h1></div>${pg.body()}</div>`;
  }

  function notFound() {
    return `<div class="page-width"><div class="empty-state" style="padding:120px 0"><span class="eyebrow">404</span><h1 class="h1">This page has moved on</h1><p>The link may be old or mistyped. Try the collection or search instead.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center"><a class="btn" href="#/collections/all">Shop all</a><button class="btn btn--secondary" type="button" data-open="search-panel" aria-controls="search-panel">Search</button></div></div></div>`;
  }

  function prelaunchPage() {
    return `<div class="prelaunch">
      <header class="prelaunch__header"><span class="wordmark" aria-label="TKX London">TKX<span>London</span></span>
        <button class="btn btn--secondary" type="button" data-password style="min-height:40px;padding:8px 16px;color:var(--c-paper)">Enter with password</button></header>
      <div class="prelaunch__main">
        <div class="prelaunch__media">${phLayer({ label: 'Campaign preview: three women wearing the collection', art: figures(HERO_FIGS), tag: 'Dev fixture — campaign preview', bg: '#8f8170' })}</div>
        <div class="prelaunch__body">
          <span class="prelaunch__date">${esc(D.settings.launchDateLabel)}</span>
          <h1 class="h-display" style="font-size:clamp(44px,8vw,112px)">Everyday<br>in motion.</h1>
          <p class="hero__sub">Considered comfort. Confident style.</p>
          <p class="muted" style="max-width:44ch">TKX London is womenswear for the whole day — elegant everyday comfort with a sporty edge. Our first collection is almost here.</p>
          <div><h2 class="eyebrow" style="margin-bottom:10px">Join the launch list</h2>${signupForm('pl-signup')}</div>
          ${D.settings.social.length ? '' : devNote('Social links: none supplied — hidden until added in theme settings.')}
        </div>
      </div>
      <footer class="prelaunch__footer"><span>© 2026 TKX London</span><span>Launch date may change — we'll confirm by email.</span></footer>
    </div>`;
  }

  // ---------- Forms (honest states) ----------
  function handleSignup(form) {
    const status = $('.js-form-status', form);
    const email = $('[name="email"]', form);
    const consent = $('[name="consent"]', form);
    email.removeAttribute('aria-invalid');
    if ($('[name="company"]', form).value) { status.innerHTML = ''; return; } // honeypot: silently drop
    if (!email.value.trim() || !email.validity.valid) { email.setAttribute('aria-invalid', 'true'); status.innerHTML = '<p class="status-msg status-msg--error">Please enter a valid email address.</p>'; email.focus(); return; }
    if (!consent.checked) { status.innerHTML = '<p class="status-msg status-msg--error">Please tick the box to confirm you\'d like to receive emails.</p>'; consent.focus(); return; }
    status.innerHTML = '<p class="status-msg status-msg--info"><strong>Preview only — you have not been signed up.</strong> In the live store this form creates a Shopify customer with email-marketing consent and the tag “launch-list”, and only shows “You’re on the list” once Shopify confirms it.</p>';
  }
  function handleContact(form) {
    const status = $('.js-form-status', form);
    let ok = true;
    const setErr = (el, msg) => { el.setAttribute('aria-invalid', msg ? 'true' : 'false'); const e = el.getAttribute('aria-describedby') && $('#' + el.getAttribute('aria-describedby')); if (e) e.textContent = msg; if (msg && ok) { el.focus(); ok = false; } };
    const name = $('#cf-name'), email = $('#cf-email'), msg = $('#cf-msg');
    setErr(name, name.value.trim() ? '' : 'Enter your name');
    setErr(email, email.value.trim() && email.validity.valid ? '' : 'Enter a valid email address');
    setErr(msg, msg.value.trim().length >= 10 ? '' : 'Write a message of at least 10 characters');
    if (!ok) { status.innerHTML = '<p class="status-msg status-msg--error">Please fix the highlighted fields.</p>'; return; }
    if (form.website.value) return; // honeypot
    status.innerHTML = '<p class="status-msg status-msg--info"><strong>Preview only — your message has not been sent.</strong> In the live store, Shopify\'s contact form emails the store (with hCaptcha spam protection) and confirms only after a successful submission.</p>';
  }

  // ---------- Cookie consent ----------
  function renderCookieBanner() {
    const slot = $('#cookie-slot');
    if (state.consent) { slot.innerHTML = ''; document.documentElement.style.setProperty('--cookie-offset', '0px'); return; }
    slot.innerHTML = `<div class="cookie-banner" role="region" aria-label="Cookie consent">
      <p>We use essential cookies to run this shop. With your permission, we'd also use analytics cookies to understand how the site is used. <a href="#/pages/privacy-cookies">Privacy &amp; Cookies</a></p>
      <div class="cookie-banner__actions"><button class="btn" type="button" data-consent="all">Accept all</button><button class="btn" type="button" data-consent="essential">Reject non-essential</button><button class="btn btn--secondary" type="button" data-cookie-prefs>Manage</button></div></div>`;
    requestAnimationFrame(() => document.documentElement.style.setProperty('--cookie-offset', $('.cookie-banner').offsetHeight + 'px'));
  }
  function cookiePrefs() {
    const c = state.consent || { analytics: false, marketing: false };
    infoModal('Cookie preferences', `<form id="cookie-form" class="stack-16">
      <label class="checkbox"><input type="checkbox" checked disabled> <span><strong>Essential</strong> — required for the bag and checkout. Always on.</span></label>
      <label class="checkbox"><input type="checkbox" name="analytics"${c.analytics ? ' checked' : ''}> <span><strong>Analytics</strong> — helps us understand how the site is used.</span></label>
      <label class="checkbox"><input type="checkbox" name="marketing"${c.marketing ? ' checked' : ''}> <span><strong>Marketing</strong> — lets us measure campaigns.</span></label>
      ${devNote('Preview loads no analytics or marketing scripts. Live store: Shopify\'s Customer Privacy API gates Shopify analytics and any pixels on these choices.')}
      <button class="btn btn--block" type="submit">Save preferences</button></form>`);
  }
  function setConsent(v) { state.consent = v; store.set('consent', v); renderCookieBanner(); announce('Cookie preferences saved.'); }

  // ---------- Checkout handoff ----------
  function checkoutHandoff() {
    const { sub } = cartTotals();
    infoModal('Checkout handoff', `<p class="small">In the live store, this button sends your bag to <strong>Shopify's hosted checkout</strong>. This preview can't take payment and has no card form.</p>
      <ol class="handoff-steps"><li>Bag lines (exact variant IDs and quantities) are posted to Shopify's cart.</li><li>Shopify checkout opens: guest checkout, address, delivery options for that address.</li><li>Shopify shows taxes, delivery and the final amount in the payment currency before payment.</li><li>Shopify sends the order confirmation email.</li></ol>
      <div class="cart-totals"><div class="cart-totals__row"><span>Preview subtotal</span><strong class="price">${fmt(sub)}</strong></div></div>
      ${currencyNote()}
      <button class="btn btn--block mt-16" type="button" data-close>Back to the bag</button>`);
  }

  // ---------- Router ----------
  let cleanup = [];
  function announce(t) { const l = $('#live'); l.textContent = ''; setTimeout(() => { l.textContent = t; }, 30); }

  function route(opts = {}) {
    cleanup.forEach((f) => f()); cleanup = [];
    const raw = location.hash.startsWith('#/') ? location.hash.slice(1) : '/';
    const [path, qs] = raw.split('?');
    const q = new URLSearchParams(qs || '');
    const parts = path.split('/').filter(Boolean);
    const m = $('#main');
    let html = null; let title = 'TKX London';
    const chrome = state.mode !== 'prelaunch';
    $('#header').hidden = !chrome; $('#announcement').hidden = !chrome;
    renderFooter();
    if (!chrome) { html = prelaunchPage(); title = 'TKX London — Coming soon'; }
    else if (!parts.length) { html = homePage(); title = 'TKX London — Everyday in motion'; }
    else if (parts[0] === 'collections' && parts[1]) {
      filters = filtersFromQuery(q);
      html = collectionPage(parts[1], q); title = `${collectionBy(parts[1])?.title || ''} — TKX London`;
    }
    else if (parts[0] === 'products' && parts[1]) { html = productPage(parts[1], q); title = `${(P[parts[1]] || SETS[parts[1]])?.title || ''} — TKX London`; }
    else if (parts[0] === 'cart') { html = cartPage(); title = 'Your bag — TKX London'; }
    else if (parts[0] === 'search') { html = searchPage(q); title = 'Search — TKX London'; }
    else if (parts[0] === 'pages' && parts[1]) { html = contentPage(parts[1]); title = `${PAGES[parts[1]]?.title || ''} — TKX London`; }
    if (html == null) { html = notFound(); title = 'Page not found — TKX London'; }
    m.innerHTML = html;
    document.title = title;
    if (chrome) renderHeader();

    // Page initialisers
    if ($('[data-collection]', m)) { renderResults(); renderFilterDrawer(); }
    const prod = $('[data-product]', m); if (prod) initProduct(prod, q);
    $$('[data-multi]', m).forEach(initMulti);
    initReveal();

    if (!opts.initial && !opts.keepFocus) { window.scrollTo(0, 0); m.focus({ preventScroll: true }); }
  }

  function initReveal() {
    const els = $$('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    els.forEach((e) => e.classList.add('reveal'));
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((e) => io.observe(e));
    cleanup.push(() => io.disconnect());
  }

  // ---------- Global event delegation ----------
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a, [data-close]');
    if (!t) return;
    if (t.matches('[data-skip]')) { e.preventDefault(); $('#main').focus(); return; }
    if (t.dataset.open) { e.preventDefault(); openLayer(t.dataset.open, t); return; }
    if (t.matches('[data-close]')) { closeLayer(); if (!t.matches('a')) return; }
    if (t.dataset.scroll) {
      e.preventDefault();
      if (active) closeLayer(true);
      const target = document.getElementById(t.dataset.scroll === 'signup' && state.mode === 'prelaunch' ? 'pl-signup-email' : 'footer-signup-email');
      if (target) { target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); target.focus({ preventScroll: true }); }
      return;
    }
    if (t.dataset.setCountry) { setCountry(t.dataset.setCountry); return; }
    if (t.matches('[data-dismiss-suggest]')) { store.set('suggestDismissed', true); renderLocaleSuggest(); return; }
    if (t.matches('[data-size-guide]')) {
      infoModal('Size guide', `<p class="small">Body measurements by size. Garment measurements are on each product page.</p><div class="table-scroll mt-16"><table class="spec-table"><thead><tr><th>Size</th><th>UK</th><th>Bust</th><th>Waist</th><th>Hips</th></tr></thead><tbody>${D.sizes.map((s) => `<tr><th>${s}</th><td>TBC</td><td>TBC</td><td>TBC</td><td>TBC</td></tr>`).join('')}</tbody></table></div>${devNote('Size chart awaiting the grading spec.')}<a class="link-arrow mt-16" href="#/pages/size-guide" data-close>Full size guide &amp; how to measure</a>`);
      return;
    }
    if (t.matches('[data-cookie-prefs]')) { cookiePrefs(); return; }
    if (t.dataset.consent) { setConsent({ analytics: t.dataset.consent === 'all', marketing: t.dataset.consent === 'all' }); return; }
    if (t.matches('[data-checkout]')) {
      if (state.mode !== 'live') { announce('Checkout opens at launch.'); return; }
      checkoutHandoff(); return;
    }
    if (t.matches('[data-password]')) {
      infoModal('Store password', `<p class="small">In Shopify this form unlocks the password-protected store for the owner and invited testers.</p><div class="field mt-16"><label for="pw">Password</label><input class="input" id="pw" type="password" autocomplete="current-password"></div>${devNote('Preview: use the "Store mode" switch in the yellow bar instead.')}`);
      return;
    }
    if (t.matches('[data-qty]')) {
      const line = t.closest('[data-key]'); const input = $('[data-qty-input]', line);
      changeLine(line.dataset.key, Number(input.value) + Number(t.dataset.qty));
      return;
    }
    if (t.matches('[data-remove]')) { changeLine(t.closest('[data-key]').dataset.key, 0); return; }
    if (t.matches('[data-multi-add]')) { submitMulti(t.closest('[data-multi]')); return; }
    if (t.matches('[data-sticky-atc]')) { if (t.getAttribute('aria-disabled') !== 'true') $('#product-form').requestSubmit(); else $('#atc').scrollIntoView({ block: 'center' }); return; }
    if (t.matches('[data-reset-filters]')) { const s = filters.sort; filters = emptyFilters(); filters.sort = s; syncFacetForms(); renderResults(); announce('Filters reset.'); $('#result-count').focus?.(); return; }
    if (t.dataset.removeFilter) {
      const k = t.dataset.removeFilter, v = t.dataset.value;
      if (k === 'size' || k === 'colour') filters[k] = filters[k].filter((x) => x !== v);
      else if (k === 'stock') filters.inStock = false; else filters[k] = '';
      syncFacetForms(); renderResults(); announce('Filter removed.');
      return;
    }
    if (t.dataset.look) {
      const look = D.looks.find((l) => l.id === t.dataset.look);
      $$('[data-look]').forEach((b) => { const on = b === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      const panel = $('#panel-look'); panel.setAttribute('aria-labelledby', t.id); panel.innerHTML = lookPanel(look);
      initMulti($('[data-multi]', panel));
    }
  });
  // Arrow-key navigation for look tabs
  document.addEventListener('keydown', (e) => {
    const t = e.target.closest?.('[role="tab"]');
    if (!t || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tabs = $$('[role="tab"]', t.parentElement); let i = tabs.indexOf(t);
    i = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[i].focus(); tabs[i].click(); e.preventDefault();
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    const multi = t.closest('[data-multi]');
    if (multi) {
      let lostSize = null;
      if (t.matches('[data-colour-input]')) {
        const row = t.closest('.look-item'); row.dataset.colour = t.value;
        const p = P[row.dataset.handle];
        const prev = $('[data-size-input]:checked', row)?.value;
        $('[data-sizes]', row).innerHTML = sizesHTML(multi.id, row.dataset.idx, p, t.value, prev);
        $('[data-colour-label]', row).textContent = cLabel(t.value);
        $('[data-thumb]', row).innerHTML = ph({ label: p.title, art: garment(p.shape, t.value), ratio: 'ratio-tall', tag: 'Fixture' });
        if (prev && !$('[data-size-input]:checked', row) && colourAvailable(p, t.value)) lostSize = [row, `${prev} isn't available in ${cLabel(t.value)} — choose another size.`];
      }
      updateMulti(multi); $('[data-error]', multi).innerHTML = '';
      if (lostSize) $('[data-item-msg]', lostSize[0]).textContent = lostSize[1];
      return;
    }
    const facetForm = t.closest('[data-facets]');
    if (facetForm) {
      // Skip no-op changes (e.g. blur after typing a price) so a re-render can't swallow the next click.
      const before = JSON.stringify(filters);
      readFacetForm(facetForm);
      if (JSON.stringify(filters) !== before) { syncFacetForms(facetForm.dataset.facets); renderResults(); }
      return;
    }
    if (t.id === 'sort') { filters.sort = t.value; renderResults(); return; }
    if (t.matches('[data-qty-input]')) { const line = t.closest('[data-key]'); changeLine(line.dataset.key, Math.max(0, parseInt(t.value, 10) || 0)); }
  });

  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.matches('.js-signup')) { e.preventDefault(); handleSignup(f); }
    if (f.id === 'contact-form') { e.preventDefault(); handleContact(f); }
    if (f.id === 'locale-form') { e.preventDefault(); const v = $('[name="country"]:checked', f)?.value; closeLayer(); if (v) setCountry(v); }
    if (f.id === 'cookie-form') { e.preventDefault(); closeLayer(); setConsent({ analytics: f.analytics.checked, marketing: f.marketing.checked }); }
    if (f.id === 'search-form' || f.id === 'search-page-form') {
      e.preventDefault(); const v = $('input', f).value.trim(); if (active) closeLayer(true);
      location.hash = `#/search?q=${encodeURIComponent(v)}`;
    }
  });

  let searchTimer;
  document.addEventListener('input', (e) => {
    if (e.target.id === 'search-input') {
      clearTimeout(searchTimer);
      const v = e.target.value;
      searchTimer = setTimeout(() => { $('#search-live').innerHTML = v.trim() ? searchResultsHTML(v, 4) : ''; }, 180);
    }
  });

  $('#mode-select').addEventListener('change', (e) => {
    state.mode = e.target.value; store.set('mode', state.mode);
    renderAnnouncement(); renderLocaleSuggest(); route();
    announce(`Store mode: ${e.target.selectedOptions[0].textContent}`);
  });

  window.addEventListener('hashchange', () => { if (active) closeLayer(true); if (location.hash.startsWith('#/') || location.hash === '') route(); });

  // ---------- Boot ----------
  $('#mode-select').value = state.mode;
  renderLayers();
  renderAnnouncement();
  renderLocaleSuggest();
  renderCookieBanner();
  route({ initial: true });
})();
