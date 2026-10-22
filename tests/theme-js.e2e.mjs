// Exercises the real theme/assets/theme.js against markup that mirrors the
// theme's Liquid output, with Shopify's Ajax Cart API mocked. This checks the
// JavaScript logic only; it is not a substitute for testing on a live store.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new globalThis.URL(import.meta.url).pathname), '..');
const themeJs = fs.readFileSync(path.join(ROOT, 'theme/assets/theme.js'), 'utf8');
const baseCss = fs.readFileSync(path.join(ROOT, 'theme/assets/base.css'), 'utf8');
const results = [];
const check = (name, cond, detail = '') => results.push({ name, pass: Boolean(cond), detail });

// ---------- Mock store ----------
function makeStore(opts = {}) {
  const s = {
    cart: [
      { key: '101:aaa', variant_id: 101, quantity: 1, title: 'Motion Rib Bra Top', properties: {} },
      { key: '202:bbb', variant_id: 202, quantity: 1, title: 'Motion Rib Legging', properties: {} }
    ],
    calls: [],
    addMode: opts.addMode || 'ok'
  };
  s.drawer = () => `<div id="shopify-section-cart-drawer"><cart-drawer class="drawer drawer--right" id="CartDrawer" role="dialog" aria-modal="true" tabindex="-1" hidden>
    <div class="drawer__head"><h2>Bag (${s.cart.reduce((a, l) => a + l.quantity, 0)})</h2><button type="button" class="icon-btn" data-drawer-close>×</button></div>
    ${s.cart.length ? `<form action="/cart" method="post" id="CartForm" class="drawer__body">${s.cart.map((l, i) => `
      <div class="cart-line" data-line="${i + 1}" data-key="${l.key}"><div><span class="cart-line__title">${l.title}</span>
        <div class="qty"><button type="button" data-qty-step="-1">−</button><input type="number" value="${l.quantity}" data-qty-input><button type="button" data-qty-step="1">+</button></div>
        <a class="remove-btn" href="/cart/change?id=${l.key}&quantity=0" data-remove>Remove</a></div></div>`).join('')}
      <div class="status-msg status-msg--error" data-cart-error role="alert" hidden></div></form>` : '<div class="drawer__body empty-state"><p>Your bag is empty.</p></div>'}
    </cart-drawer></div>`;
  s.json = () => ({ items: s.cart.map((l) => ({ ...l, product_title: l.title })), item_count: s.cart.reduce((a, l) => a + l.quantity, 0) });
  return s;
}

function pageHtml(cartType) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}</style></head><body>
  <script>window.TKX={routes:{root:'/',cart:'/cart',cartAdd:'/cart/add',cartChange:'/cart/change',search:'/search',predictiveSearch:'/search/suggest'},cartType:${JSON.stringify(cartType)},currency:'GBP',locale:'en-GB',storeMode:'live'};</script>
  <a id="BagIcon" href="/cart" data-drawer-open="CartDrawer" aria-controls="CartDrawer" role="button">Bag <span data-cart-count>2</span></a>
  <div class="overlay" data-overlay hidden></div>
  ${cartType === 'drawer' ? '%%DRAWER%%' : ''}
  <set-bundle data-set-title="Motion Rib Set">
    <component-picker class="look-item"><div><a class="look-item__name">Motion Rib Bra Top</a><span data-item-price></span>
      <span data-selected-size></span>
      <input type="radio" id="a-301" name="a-size" value="301" data-price="4800" data-label="S"><label for="a-301">S</label></div></component-picker>
    <component-picker class="look-item"><div><a class="look-item__name">Motion Rib Legging</a><span data-item-price></span>
      <span data-selected-size></span>
      <input type="radio" id="b-302" name="b-size" value="302" data-price="6800" data-label="L"><label for="b-302">L</label></div></component-picker>
    <strong data-bundle-total></strong>
    <div data-partial hidden><p data-partial-text></p><input type="checkbox" data-allow-partial></div>
    <button type="button" data-bundle-add disabled>Choose sizes</button>
    <div class="status-msg" data-bundle-status role="status" hidden></div>
  </set-bundle>
  <product-info>
    <div data-product-price></div>
    <form action="/cart/add" method="post" data-product-form="true">
      <input type="hidden" value="401" data-variant-id>
      <variant-picker><fieldset><legend><span data-selected-value="0"></span></legend>
        <input type="radio" id="o-s" name="option1" value="S" data-option-index="0" checked><label for="o-s">S<span data-unavailable-text></span></label>
        <input type="radio" id="o-m" name="option1" value="M" data-option-index="0"><label for="o-m">M<span data-unavailable-text></span></label></fieldset>
        <script type="application/json" data-variants>[{"id":401,"options":["S"],"available":true,"price":"£48.00","compare":null,"preorder":false,"low":false},{"id":402,"options":["M"],"available":true,"price":"£48.00","compare":null,"preorder":false,"low":false}]</script>
      </variant-picker>
      <p data-stock data-preorder-note=""><span class="stock-dot"></span><span data-stock-text></span></p>
      <button type="submit" data-add-button><span data-add-text>Add to Bag</span></button>
      <div class="status-msg status-msg--error" data-form-error role="alert" hidden></div>
    </form>
  </product-info>
  <script src="/theme.js"></script></body></html>`;
}

async function setup(browser, { cartType = 'drawer', addMode = 'ok' } = {}) {
  const store = makeStore({ addMode });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(5000);
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  await page.route('http://tkx.test/**', async (route) => {
    const req = route.request();
    const url = new globalThis.URL(req.url());
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    store.calls.push({ path: url.pathname, search: url.search, body });
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname === '/theme.js') return route.fulfill({ contentType: 'text/javascript', body: themeJs });
    if (url.pathname === '/cart.js') return json(store.json());
    if (url.searchParams.get('sections')) return json({ 'cart-drawer': store.drawer() });
    if (url.pathname === '/cart/change.js') {
      const line = store.cart.find((l) => l.key === body.id);
      if (!line) return json({ status: 422, message: 'Bad request', description: 'No line with that id' }, 422);
      if (body.quantity === 0) store.cart = store.cart.filter((l) => l !== line); else line.quantity = body.quantity;
      return json({ ...store.json(), sections: body.sections ? { 'cart-drawer': store.drawer() } : undefined });
    }
    if (url.pathname === '/cart/add.js') {
      if (store.addMode === 'partial') {
        // Simulate a non-atomic failure: the first piece lands, the second is rejected.
        const it = body.items[0];
        store.cart.push({ key: `${it.id}:new`, variant_id: it.id, quantity: it.quantity, title: 'Added piece', properties: it.properties || {} });
        return json({ status: 422, message: 'Cart Error', description: 'Only 0 of Motion Rib Legging are in stock.' }, 422);
      }
      if (store.addMode === 'error') return json({ status: 422, message: 'Cart Error', description: 'This size is sold out.' }, 422);
      body.items.forEach((it) => store.cart.push({ key: `${it.id}:x`, variant_id: it.id, quantity: it.quantity, title: 'New', properties: it.properties || {} }));
      return json({ items: body.items, sections: body.sections ? { 'cart-drawer': store.drawer() } : undefined });
    }
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: pageHtml(cartType).replace('%%DRAWER%%', store.drawer()) });
    return route.fulfill({ status: 404, body: '' });
  });
  await page.goto('http://tkx.test/');
  return { page, store };
}

const browser = await chromium.launch({ channel: 'chrome' });

// 1. Drawer stays open and focus is kept through quantity changes and removal
{
  const { page, store } = await setup(browser);
  await page.click('#BagIcon'); await page.waitForTimeout(400);
  await page.click('#CartDrawer [data-key="101:aaa"] [data-qty-step="1"]'); await page.waitForTimeout(300);
  check('Drawer: stays open after +', await page.$eval('#CartDrawer', (d) => !d.hidden && d.classList.contains('is-open')));
  check('Drawer: quantity updated via line key', store.calls.some((c) => c.path === '/cart/change.js' && c.body.id === '101:aaa' && c.body.quantity === 2 && !('line' in c.body)));
  check('Drawer: focus restored to same + button', await page.evaluate(() => document.activeElement.matches('[data-qty-step="1"]') && document.activeElement.closest('[data-key]').dataset.key === '101:aaa'));
  await page.click('#CartDrawer [data-key="101:aaa"] [data-remove]'); await page.waitForTimeout(300);
  check('Drawer: stays open after remove', await page.$eval('#CartDrawer', (d) => !d.hidden && d.classList.contains('is-open')) && (await page.$$('#CartDrawer .cart-line')).length === 1);
  check('Drawer: focus stays inside drawer after remove', await page.evaluate(() => !!document.activeElement.closest('#CartDrawer')));
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  check('Drawer: Esc closes the re-rendered drawer, focus to bag icon', await page.evaluate(() => document.getElementById('CartDrawer').hidden && document.activeElement.id === 'BagIcon'));
  check('Drawer: no JS errors', page.errors.length === 0, page.errors.join(' | '));
  await page.close();
}

// 2. Set add that fails part-way is rolled back
{
  const { page, store } = await setup(browser, { addMode: 'partial' });
  await page.click('label[for="a-301"]'); await page.click('label[for="b-302"]');
  check('Set: button enabled with both sizes', await page.$eval('[data-bundle-add]', (b) => !b.disabled));
  await page.click('[data-bundle-add]'); await page.waitForTimeout(600);
  check('Set: partial line rolled back via /cart/change', store.calls.some((c) => c.path === '/cart/change.js' && c.body.id === '301:new' && c.body.quantity === 0));
  check('Set: bag back to original 2 lines', store.cart.length === 2, JSON.stringify(store.cart.map((l) => l.key)));
  check('Set: honest "Nothing was added" message', (await page.textContent('[data-bundle-status]')).includes('Nothing was added'));
  check('Set: no JS errors', page.errors.length === 0, page.errors.join(' | '));
  await page.close();
}

// 3. Product add error stays visible
{
  const { page } = await setup(browser, { addMode: 'error' });
  await page.click('[data-add-button]'); await page.waitForTimeout(400);
  check('PDP: add error remains visible', await page.$eval('[data-form-error]', (e) => !e.hidden && e.textContent.includes('sold out')));
  check('PDP: hidden input carries the variant id name', await page.$eval('[data-variant-id]', (i) => i.name === 'id'));
  await page.close();
}

// 4. "Bag page" setting: confirmation shown on the product page
{
  const { page } = await setup(browser, { cartType: 'page' });
  await page.click('label[for="o-m"]');
  await page.click('[data-add-button]'); await page.waitForTimeout(400);
  check('PDP (bag page mode): success message shown', await page.$eval('[data-form-error]', (e) => !e.hidden && e.textContent.includes('Added to your bag')));
  check('PDP: no JS errors', page.errors.length === 0, page.errors.join(' | '));
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail && !r.pass ? '  — ' + r.detail : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
