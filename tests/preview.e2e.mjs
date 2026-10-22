// End-to-end checks for the TKX London static preview.
import { chromium } from 'playwright';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new globalThis.URL(import.meta.url).pathname), '..');
const URL = 'file://' + path.join(ROOT, 'preview/index.html');
const SHOTS = process.argv[2] || './shots';
const results = [];
const check = (name, cond, detail = '') => { results.push({ name, pass: Boolean(cond), detail }); };

const browser = await chromium.launch({ channel: 'chrome' });

async function newPage(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce', timezoneId: opts.tz || 'Europe/London' });
  const page = await ctx.newPage(); page.setDefaultTimeout(5000);
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  await page.goto(URL + (opts.hash || ''));
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('tkx:mode', '"live"'); localStorage.setItem('tkx:consent', '{"analytics":false,"marketing":false}'); });
  await page.reload();
  await page.waitForTimeout(400);
  return page;
}
const go = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(250); };

// ---------- Desktop ----------
const d = await newPage({ width: 1440, height: 900 });
await d.screenshot({ path: `${SHOTS}/desktop-home.png` });
await d.screenshot({ path: `${SHOTS}/desktop-home-full.png`, fullPage: true });
check('Home: hero headline', (await d.textContent('#hero-title')).toLowerCase().includes('everyday'));
check('Home: live CTA = Shop the Collection', await d.isVisible('text=Shop the Collection'));
const navItems = await d.$$eval('.header__nav a', (as) => as.map((a) => a.textContent.trim()));
check('Nav: brief order, empty Unisex hidden', JSON.stringify(navItems) === JSON.stringify(['Shop All', 'Matching Sets', 'Tops', 'Bottoms', 'Our Story']), navItems.join(', '));
check('Home: 8 launch products', (await d.$$('.product-grid--4 .product-card')).length >= 8);

// Shop the look: missing size prevents add
await d.click('#m-look-1 [data-multi-add]');
check('Look: missing sizes blocks add', (await d.textContent('#m-look-1 [data-error]')).includes('Choose a size'));
check('Look: bag still empty', (await d.evaluate(() => JSON.parse(localStorage.getItem('tkx:cart') || '[]').length)) === 0);
// choose sizes for all 3 items, untick one
const rows = await d.$$('#m-look-1 .look-item');
for (const r of rows) { const lbl = await r.$('[data-size-input]:not(:disabled) + label'); await lbl.click(); }
await d.uncheck('#m-look-1 .look-item[data-idx="2"] [data-include]');
const btnText = await d.textContent('#m-look-1 [data-multi-add]');
check('Look: partial label explicit', btnText.includes('Add 2 of 3 pieces'), btnText);
check('Look: excluded piece summarised', (await d.textContent('#m-look-1 [data-summary]')).includes('Studio Zip Jacket'));
const total = await d.textContent('#m-look-1 [data-total]');
check('Look: combined total = 48 + 68', total === '£116.00', total);
await d.click('#m-look-1 [data-multi-add]');
await d.waitForTimeout(400);
check('Look: drawer opens with 2 lines', (await d.$$('#cart-drawer .cart-line')).length === 2);
await d.screenshot({ path: `${SHOTS}/desktop-cart-drawer.png` });
// qty update
const subBefore = await d.textContent('#cart-drawer .cart-totals__row--total .price');
await d.click('#cart-drawer .cart-line:first-child [data-qty="1"]');
await d.waitForTimeout(150);
const subAfter = await d.textContent('#cart-drawer .cart-totals__row--total .price');
check('Bag: qty + updates subtotal', subBefore === '£116.00' && subAfter === '£164.00', `${subBefore} → ${subAfter}`);
check('Bag: focus kept in drawer after qty change', await d.evaluate(() => document.activeElement.closest('#cart-drawer') !== null));
await d.click('#cart-drawer .cart-line:first-child [data-remove]');
await d.waitForTimeout(150);
check('Bag: remove line', (await d.$$('#cart-drawer .cart-line')).length === 1);
await d.keyboard.press('Escape');
await d.waitForTimeout(400);
check('Drawer: Esc closes', await d.isHidden('#cart-drawer'));

// Checkout handoff
await go(d, '#/cart');
await d.click('[data-checkout]');
await d.waitForTimeout(200);
check('Checkout: handoff explainer, no card fields', (await d.textContent('#info-modal')).includes("hosted checkout") && (await d.$$('#info-modal input')).length === 0);
await d.keyboard.press('Escape');

// Product page: variants & unavailable
await go(d, '#/products/motion-rib-legging?colour=chocolate');
await d.screenshot({ path: `${SHOTS}/desktop-product.png` });
check('PDP: sold-out size M disabled in Chocolate', await d.$eval('#size-row input[value="M"]', (i) => i.disabled));
await d.click('#atc');
check('PDP: no size → error', (await d.textContent('#atc-error')).includes('select a size'));
await d.click('label[for="ps-0-s-S"]');
check('PDP: URL keeps variant', d.url().includes('colour=chocolate') && d.url().includes('size=S'));
await d.click('#atc'); await d.waitForTimeout(300);
const cart = await d.evaluate(() => JSON.parse(localStorage.getItem('tkx:cart')));
check('PDP: selected variant preserved in bag', cart.some((l) => l.handle === 'motion-rib-legging' && l.colour === 'chocolate' && l.size === 'S'));
await d.keyboard.press('Escape'); await d.waitForTimeout(300);
// over-stock: chocolate XS has 2
await d.click('label[for="ps-0-s-XS"]');
await d.click('#atc'); await d.waitForTimeout(250); await d.keyboard.press('Escape'); await d.waitForTimeout(300);
await d.click('#atc'); await d.waitForTimeout(250); await d.keyboard.press('Escape'); await d.waitForTimeout(300);
await d.click('#atc'); await d.waitForTimeout(250);
check('PDP: cannot exceed stock', (await d.textContent('#atc-error')).includes('Only 2'));
// Fully sold-out colour
await go(d, '#/products/everyday-jogger?colour=olive');
check('PDP: sold-out colour disables ATC', (await d.getAttribute('#atc', 'aria-disabled')) === 'true' && (await d.textContent('#atc')).includes('Sold out'));
// Pre-order
await go(d, '#/products/studio-zip-jacket?colour=taupe');
await d.click('label[for="ps-0-s-M"]');
check('PDP: pre-order labelled', (await d.textContent('#atc')).includes('Pre-order') && (await d.textContent('#stock-line')).includes('Pre-order'));
check('PDP: JSON-LD present', (await d.$$('script[type="application/ld+json"]')).length === 1);

// Matching set: mixed sizes, partial unavailability
await d.evaluate(() => localStorage.setItem('tkx:cart', '[]')); await d.reload(); await d.waitForTimeout(300);
await go(d, '#/products/motion-rib-set');
await d.screenshot({ path: `${SHOTS}/desktop-set.png` });
const setId = '#set-motion-rib-set';
await d.click(`${setId} .look-item[data-idx="0"] label[for$="-s-S"]`);
await d.click(`${setId} .look-item[data-idx="1"] label[for$="-s-L"]`);
check('Set: total = 48 + 68', (await d.textContent(`${setId} [data-total]`)) === '£116.00');
await d.click(`${setId} [data-multi-add]`); await d.waitForTimeout(300);
const c2 = await d.evaluate(() => JSON.parse(localStorage.getItem('tkx:cart')));
check('Set: mixed sizes S/L added, tagged with set', c2.length === 2 && c2[0].size === 'S' && c2[1].size === 'L' && c2.every((l) => l.set === 'motion-rib-set'), JSON.stringify(c2));
await d.keyboard.press('Escape'); await d.waitForTimeout(300);
// Lounge set: olive jogger sold out
await go(d, '#/products/everyday-lounge-set');
await d.click('#set-everyday-lounge-set .look-item[data-idx="1"] label[for$="-c-olive"]');
check('Set: sold-out component flagged', (await d.textContent('#set-everyday-lounge-set .look-item[data-idx="1"] [data-item-msg]')).includes('Sold out'));
check('Set: add blocked while sold-out piece included', (await d.getAttribute('#set-everyday-lounge-set [data-multi-add]', 'aria-disabled')) === 'true');
await d.$eval('#set-everyday-lounge-set [data-multi-add]', (b) => b.click());
check('Set: explicit message, nothing added', (await d.textContent('#set-everyday-lounge-set [data-error]')).includes('nothing has been added'));

// Collection filters
await go(d, '#/collections/all');
await d.screenshot({ path: `${SHOTS}/desktop-collection.png` });
const allCount = (await d.$$('#grid .product-card')).length;
await d.check('.facets input[name="colour"][value="olive"]'); await d.waitForTimeout(150);
const oliveCount = (await d.$$('#grid .product-card')).length;
check('Filter: colour narrows results', oliveCount > 0 && oliveCount < allCount, `${allCount} → ${oliveCount}`);
check('Filter: chip shown & URL updated', (await d.$$('#active-filters .chip')).length >= 1 && d.url().includes('colour=olive'));
await d.selectOption('#sort', 'price-asc'); await d.waitForTimeout(100);
const prices = await d.$$eval('#grid .price', (ps) => ps.map((p) => parseFloat(p.textContent.replace(/[^0-9.]/g, ''))));
check('Sort: price ascending', prices.every((p, i) => i === 0 || p >= prices[i - 1]), prices.join(','));
await d.click('.facets details:last-of-type summary'); await d.fill('.facets input[name="min"]', '9999'); await d.dispatchEvent('.facets input[name="min"]', 'change'); await d.waitForTimeout(100);
check('Filter: empty state with reset', await d.isVisible('#grid .empty-state'));
await d.click('#grid [data-reset-filters]'); await d.waitForTimeout(100);
check('Filter: reset restores all', (await d.$$('#grid .product-card')).length === allCount);
await go(d, '#/collections/unisex');
check('Empty collection: friendly state', (await d.textContent('main')).includes('Coming soon'));

// Search
await d.click('.header__actions [data-open="search-panel"]'); await d.waitForTimeout(300);
await d.fill('#search-input', 'olive'); await d.waitForTimeout(350);
check('Search: live results', (await d.$$('#search-live .product-card')).length > 0);
await d.press('#search-input', 'Enter'); await d.waitForTimeout(300);
check('Search: results page', d.url().includes('#/search?q=olive') && (await d.$$('main .product-card')).length > 0);
await go(d, '#/search?q=zzzz');
check('Search: empty state', (await d.textContent('main')).includes('No results'));

// Currency
await d.click('.header__locale'); await d.waitForTimeout(300);
await d.check('#locale-modal input[value="NG"]');
await d.click('#locale-modal button[type="submit"]'); await d.waitForTimeout(300);
await go(d, '#/products/motion-rib-bra-top');
const ngn = await d.textContent('.product__price');
check('Currency: NGN display', ngn.startsWith('₦'), ngn);
check('Currency: payment-currency caveat on PDP', (await d.textContent('.price-note')).includes('checkout'));
await go(d, '#/cart');
check('Currency: bag explains GBP fallback', (await d.textContent('main')).includes("can't be used for payment"));
await d.click('.header__locale'); await d.waitForTimeout(300);
await d.check('#locale-modal input[value="CA"]'); await d.click('#locale-modal button[type="submit"]'); await d.waitForTimeout(300);
check('Currency: CAD symbol CA$', (await d.textContent('.header__locale')).includes('CA$'));

// Forms honest states
await go(d, '#/pages/contact');
await d.click('#contact-form button[type="submit"]');
check('Contact: validation errors', (await d.getAttribute('#cf-name', 'aria-invalid')) === 'true');
await d.fill('#cf-name', 'Test'); await d.fill('#cf-email', 'test@example.com'); await d.fill('#cf-msg', 'Hello there, sizing question');
await d.click('#contact-form button[type="submit"]');
const cs = await d.textContent('#contact-form .js-form-status');
check('Contact: no false success', cs.includes('has not been sent') && !/thank you|message sent|sent successfully/i.test(cs));
await d.fill('#footer-signup-email', 'x@example.com');
await d.click('#footer .js-signup button[type="submit"]');
check('Signup: consent required', (await d.textContent('#footer .js-form-status')).includes('tick the box'));
await d.check('#footer .js-signup [name="consent"]');
await d.click('#footer .js-signup button[type="submit"]');
check('Signup: no false success', (await d.textContent('#footer .js-form-status')).includes('not been signed up'));

// 404
await go(d, '#/nope');
check('404 page', (await d.textContent('main')).includes('This page has moved on'));

// Pre-launch switching
await d.selectOption('#mode-select', 'prelaunch'); await d.waitForTimeout(300);
check('Pre-launch: password-page view', await d.isVisible('.prelaunch') && await d.isHidden('#header'));
await d.screenshot({ path: `${SHOTS}/desktop-prelaunch.png` });
await d.selectOption('#mode-select', 'peek'); await go(d, '#/'); await d.waitForTimeout(300);
check('Owner preview: hero CTA = Join the Launch List', await d.isVisible('.hero >> text=Join the Launch List'));
await go(d, '#/products/flare-legging');
check('Owner preview: ATC replaced', (await d.textContent('#atc')).includes('Join the Launch List'));
await d.selectOption('#mode-select', 'live'); await d.waitForTimeout(300);
check('Desktop: no JS errors', d.errors.length === 0, d.errors.join(' | '));

// ---------- Keyboard ----------
const k = await newPage({ width: 1280, height: 800 });
await k.keyboard.press('Tab');
check('Keyboard: first tab = skip link', await k.evaluate(() => document.activeElement.classList.contains('skip-link')));
await k.keyboard.press('Enter');
check('Keyboard: skip link focuses main', await k.evaluate(() => document.activeElement.id === 'main'));
await k.focus('.header__actions [aria-controls="cart-drawer"]'); await k.keyboard.press('Enter'); await k.waitForTimeout(300);
check('Keyboard: drawer receives focus', await k.evaluate(() => !!document.activeElement.closest('#cart-drawer')));
for (let i = 0; i < 6; i++) await k.keyboard.press('Tab');
check('Keyboard: focus trapped in drawer', await k.evaluate(() => !!document.activeElement.closest('#cart-drawer')));
await k.keyboard.press('Escape'); await k.waitForTimeout(350);
check('Keyboard: focus returns to trigger', await k.evaluate(() => document.activeElement.getAttribute('aria-controls') === 'cart-drawer'));

// ---------- Mobile ----------
const m = await newPage({ width: 390, height: 844 });
await m.screenshot({ path: `${SHOTS}/mobile-home.png` });
await m.screenshot({ path: `${SHOTS}/mobile-home-full.png`, fullPage: true });
const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
check('Mobile: no horizontal overflow (home)', !overflow);
await m.click('.menu-toggle'); await m.waitForTimeout(350);
check('Mobile: menu opens, aria-expanded', (await m.getAttribute('.menu-toggle', 'aria-expanded')) === 'true' && await m.isVisible('#menu-drawer'));
await m.screenshot({ path: `${SHOTS}/mobile-menu.png` });
await m.keyboard.press('Escape'); await m.waitForTimeout(350);
await go(m, '#/products/motion-rib-bra-top');
await m.screenshot({ path: `${SHOTS}/mobile-product.png` });
check('Mobile: no horizontal overflow (PDP)', !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
await m.evaluate(() => window.scrollTo(0, 1600)); await m.waitForTimeout(400);
check('Mobile: sticky ATC appears after scroll', await m.$eval('#sticky-atc', (e) => e.classList.contains('is-visible')));
await m.screenshot({ path: `${SHOTS}/mobile-product-sticky.png` });
// Cookie banner + sticky ATC overlap
await m.evaluate(() => localStorage.removeItem('tkx:consent')); await m.reload(); await m.waitForTimeout(400);
await m.evaluate(() => window.scrollTo(0, 1600)); await m.waitForTimeout(400);
const overlap = await m.evaluate(() => { const a = document.querySelector('#sticky-atc').getBoundingClientRect(); const b = document.querySelector('.cookie-banner').getBoundingClientRect(); return a.bottom > b.top + 1; });
check('Mobile: sticky ATC sits above cookie banner', !overlap);
await m.screenshot({ path: `${SHOTS}/mobile-cookie-sticky.png` });
await m.click('[data-consent="essential"]'); await m.waitForTimeout(200);
check('Consent: banner dismissed & stored', await m.evaluate(() => JSON.parse(localStorage.getItem('tkx:consent')).analytics === false));
await go(m, '#/collections/all');
await m.click('.collection-toolbar [data-open="filter-drawer"]'); await m.waitForTimeout(350);
await m.check('#filter-drawer input[name="size"][value="XL"]'); await m.waitForTimeout(150);
check('Mobile filters: drawer shows result count', /Show \d+ product/.test(await m.textContent('[data-show-results]')));
await m.screenshot({ path: `${SHOTS}/mobile-filters.png` });
// Touch target sizes
const small = await m.evaluate(() => [...document.querySelectorAll('#main button, #main .size-btn, #header button')].filter((e) => e.offsetParent).filter((e) => { const r = e.getBoundingClientRect(); return r.height < 36 || r.width < 36; }).map((e) => e.textContent.trim().slice(0, 20)));
check('Mobile: interactive targets ≥36px (most ≥44px)', small.length === 0, small.join(', '));
check('Mobile: no JS errors', m.errors.length === 0, m.errors.join(' | '));

// Tablet
const t = await newPage({ width: 820, height: 1180 });
await t.screenshot({ path: `${SHOTS}/tablet-home.png` });
check('Tablet: no horizontal overflow', !(await t.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));

// Location suggestion (Lagos timezone) — suggests, never redirects
const s = await newPage({ width: 1280, height: 800 }, { tz: 'Africa/Lagos' });
check('Geo: suggests NGN without switching', (await s.textContent('#locale-suggest')).includes('Nigeria') && (await s.textContent('.header__locale')).includes('GBP'));

await browser.close();
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail && !r.pass ? '  — ' + r.detail : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
