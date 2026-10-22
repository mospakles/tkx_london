/* TKX London theme — small, dependency-free enhancements.
   Every feature has a no-JS fallback (forms post normally). */
(function () {
  'use strict';

  var TKX = window.TKX || {};
  var routes = TKX.routes || {};
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // Prices from Liquid are already in the shopper's presentment currency
  // (in minor units), so we format with that currency rather than the shop's.
  function formatMoney(cents) {
    try {
      return new Intl.NumberFormat(TKX.locale || 'en-GB', {
        style: 'currency', currency: TKX.currency || 'GBP', currencyDisplay: 'narrowSymbol'
      }).format(cents / 100);
    } catch (e) {
      return (cents / 100).toFixed(2) + ' ' + (TKX.currency || '');
    }
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function storage(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  function postJSON(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || data.status) {
          var err = new Error(data.description || data.message || 'Something went wrong. Please try again.');
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  /* ---------- Drawers, modals and panels ---------- */
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var openPanel = null;
  var lastTrigger = null;
  var overlay = $('[data-overlay]');

  function openDialog(id, trigger) {
    var panel = document.getElementById(id);
    if (!panel) return false;
    // When one panel replaces another (e.g. menu → country), keep the original
    // trigger: the inner button is hidden once its panel closes.
    var switching = !!(openPanel && openPanel !== panel);
    if (switching) closeDialog(true);
    if (!switching || !lastTrigger) lastTrigger = trigger || document.activeElement;
    panel.hidden = false;
    if (overlay) overlay.hidden = false;
    // Force layout so the transition runs.
    void panel.offsetWidth;
    panel.classList.add('is-open');
    if (overlay) overlay.classList.add('is-open');
    document.body.classList.add('no-scroll');
    $$('[aria-controls="' + id + '"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    openPanel = panel;
    var first = $(FOCUSABLE, panel);
    (panel.id === 'SearchPanel' ? $('input[type="search"]', panel) : first || panel).focus();
    return true;
  }

  function closeDialog(silent) {
    if (!openPanel) return;
    var panel = openPanel;
    openPanel = null;
    panel.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    $$('[aria-controls="' + panel.id + '"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    setTimeout(function () {
      if (!panel.classList.contains('is-open')) panel.hidden = true;
      if (overlay && !openPanel) overlay.hidden = true;
    }, reduceMotion ? 0 : 320);
    if (!silent && lastTrigger && lastTrigger.focus) lastTrigger.focus();
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-drawer-open]');
    if (opener) {
      var id = opener.getAttribute('data-drawer-open');
      // Bag link falls back to the bag page when the drawer isn't present.
      if (openDialog(id, opener)) e.preventDefault();
      return;
    }
    if (e.target.closest('[data-drawer-close]') || e.target === overlay) closeDialog();
  });

  document.addEventListener('keydown', function (e) {
    if (!openPanel) return;
    if (e.key === 'Escape') { closeDialog(); return; }
    if (e.key !== 'Tab') return;
    var items = $$(FOCUSABLE, openPanel).filter(function (el) { return el.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- Cart ---------- */
  function updateCount(count) {
    $$('[data-cart-count]').forEach(function (el) { el.textContent = count; el.hidden = count === 0; });
    $$('[data-cart-count-text]').forEach(function (el) { el.textContent = count; });
  }

  function replaceSection(id, html) {
    if (!html) return;
    var wrapper = document.getElementById('shopify-section-' + id);
    if (!wrapper) return;
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var fresh = doc.getElementById('shopify-section-' + id);
    wrapper.innerHTML = fresh ? fresh.innerHTML : html;
  }

  function cartSections() {
    var ids = [];
    if (document.getElementById('CartDrawer')) ids.push('cart-drawer');
    var page = $('cart-items[data-section]');
    if (page) ids.push(page.getAttribute('data-section'));
    return ids;
  }

  function getCart() {
    return fetch(routes.cart + '.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); });
  }

  // Which control had focus inside a cart line, so it can be restored after re-render.
  function focusMemo() {
    var a = document.activeElement;
    if (!a || !a.closest) return null;
    var line = a.closest('[data-key]');
    var sel = a.hasAttribute('data-remove') ? '[data-remove]'
      : a.hasAttribute('data-qty-input') ? '[data-qty-input]'
      : a.hasAttribute('data-qty-step') ? '[data-qty-step="' + a.getAttribute('data-qty-step') + '"]' : null;
    return { el: a, key: line ? line.getAttribute('data-key') : null, sel: sel };
  }

  function refreshAfterCart(sections) {
    var openId = openPanel && openPanel.id;
    var memo = focusMemo();
    Object.keys(sections || {}).forEach(function (id) { replaceSection(id, sections[id]); });
    // Re-rendering replaces the drawer element; keep it open and tracked.
    if (openId) {
      var fresh = document.getElementById(openId);
      if (fresh && fresh !== openPanel) { fresh.hidden = false; fresh.classList.add('is-open'); openPanel = fresh; }
    }
    // Put focus back on the same control (or a sensible fallback) if it was replaced.
    if (memo && !document.contains(memo.el)) {
      var line = memo.key && document.querySelector('[data-key="' + (window.CSS && CSS.escape ? CSS.escape(memo.key) : memo.key) + '"]');
      var target = (line && memo.sel && $(memo.sel, line)) ||
        (openPanel && $('[data-drawer-close]', openPanel)) || $('cart-items') || document.getElementById('MainContent');
      if (target) { if (!target.hasAttribute('tabindex') && !target.matches(FOCUSABLE)) target.setAttribute('tabindex', '-1'); target.focus(); }
    }
    return getCart().then(function (cart) { updateCount(cart.item_count); return cart; });
  }

  // Re-fetch the bag sections without changing anything (e.g. after an error).
  function reloadCartSections() {
    var ids = cartSections();
    if (!ids.length) return getCart().then(function (cart) { updateCount(cart.item_count); return cart; });
    return fetch(window.location.pathname + '?sections=' + ids.join(','))
      .then(function (r) { return r.json(); })
      .then(refreshAfterCart);
  }

  // Adds one or more variants in a single request. Shopify validates stock on
  // the server and rejects the request if a variant can't be added.
  function addToCart(items, trigger) {
    var body = { items: items };
    var ids = cartSections();
    if (ids.length) body.sections = ids.join(',');
    return postJSON(routes.cartAdd + '.js', body).then(function (res) {
      return refreshAfterCart(res.sections).then(function () {
        if (TKX.cartType === 'drawer' && document.getElementById('CartDrawer')) {
          openDialog('CartDrawer', trigger);
        }
        return res;
      });
    });
  }
  TKX.addToCart = addToCart;

  // All-or-nothing add for sets and looks. If Shopify rejects the request but
  // some pieces still landed in the bag, put those lines back as they were so
  // the shopper never ends up with an incomplete set by accident.
  function addAllOrNothing(items, trigger) {
    var ids = items.map(function (i) { return i.id; });
    return getCart().then(function (before) {
      var prev = {};
      before.items.forEach(function (i) { prev[i.key] = i.quantity; });
      return addToCart(items, trigger).catch(function (err) {
        return getCart()
          .then(function (after) {
            var extra = after.items.filter(function (i) { return ids.indexOf(i.variant_id) > -1 && i.quantity > (prev[i.key] || 0); });
            return extra.reduce(function (p, i) {
              return p.then(function () { return postJSON(routes.cartChange + '.js', { id: i.key, quantity: prev[i.key] || 0 }); });
            }, Promise.resolve());
          })
          .catch(function () { err.partial = true; })
          .then(reloadCartSections, reloadCartSections)
          .then(function () { throw err; }, function () { throw err; });
      });
    });
  }

  function showCartError(message) {
    var box = $('[data-cart-error]');
    if (box) { box.textContent = message; box.hidden = false; }
  }

  var cartBusy = false;
  function changeLine(lineEl, quantity, root) {
    if (cartBusy) return Promise.resolve(); // one change at a time keeps quantities exact
    cartBusy = true;
    var key = lineEl.getAttribute('data-key');
    var ids = cartSections();
    root.setAttribute('aria-busy', 'true');
    // The line-item key (not its position) identifies the line, so a previous
    // removal can't make this request change the wrong item.
    return postJSON(routes.cartChange + '.js', { id: key, quantity: quantity, sections: ids.join(',') })
      .then(function (res) {
        // Shopify caps quantities at available stock; tell the shopper.
        var item = (res.items || []).find(function (i) { return i.key === key; });
        return refreshAfterCart(res.sections).then(function () {
          if (item && item.quantity < quantity) showCartError('Only ' + item.quantity + ' of ' + item.product_title + ' available.');
        });
      })
      .catch(function (err) {
        // Re-render so the inputs show what's really in the bag, then explain.
        return reloadCartSections().catch(function () {}).then(function () { showCartError(err.message); });
      })
      .finally(function () {
        cartBusy = false;
        if (root) root.removeAttribute('aria-busy');
      });
  }

  document.addEventListener('click', function (e) {
    var step = e.target.closest('[data-qty-step]');
    var remove = e.target.closest('[data-remove]');
    var lineEl = e.target.closest('[data-line]');
    if (!lineEl || !(step || remove)) return;
    var form = lineEl.closest('form');
    e.preventDefault();
    var input = $('[data-qty-input]', lineEl);
    var qty = remove ? 0 : Math.max(0, parseInt(input.value, 10) + parseInt(step.getAttribute('data-qty-step'), 10));
    changeLine(lineEl, qty, form);
  });

  document.addEventListener('change', function (e) {
    var input = e.target.closest('[data-qty-input]');
    if (!input) return;
    var lineEl = input.closest('[data-line]');
    var qty = Math.max(0, parseInt(input.value, 10) || 0);
    changeLine(lineEl, qty, input.closest('form'));
  });

  /* ---------- Product form & variant picker ---------- */
  $$('product-info').forEach(function (root) {
    var form = $('form[action*="/cart/add"]', root);
    var picker = $('variant-picker', root);
    var idInput = $('[data-variant-id]', root);
    // Without JS a <noscript> select carries the variant; with JS this input does.
    if (idInput) idInput.name = 'id';
    var addBtn = $('[data-add-button]', root);
    var addText = $('[data-add-text]', root);
    var errorBox = $('[data-form-error]', root);
    var stock = $('[data-stock]', root);
    var variants = picker ? JSON.parse($('[data-variants]', picker).textContent) : [];
    var sticky = $('[data-sticky-atc]');

    function selectedOptions() {
      return $$('fieldset', picker).map(function (fs) {
        var checked = $('input:checked', fs);
        return checked ? checked.value : null;
      });
    }

    function findVariant(opts) {
      return variants.find(function (v) {
        return v.options.every(function (o, i) { return o === opts[i]; });
      });
    }

    function markAvailability(opts) {
      // A value is "unavailable" if no available variant has it together with
      // the shopper's other current choices.
      $$('input[type="radio"]', picker).forEach(function (input) {
        var idx = parseInt(input.getAttribute('data-option-index'), 10);
        var test = opts.slice(); test[idx] = input.value;
        var match = findVariant(test);
        var ok = !!(match && match.available);
        var label = input.nextElementSibling;
        label.classList.toggle('is-unavailable', !ok);
        var sr = $('[data-unavailable-text]', label);
        if (sr) sr.textContent = ok ? '' : (match ? ' — sold out' : ' — not available in this combination');
      });
    }

    function showMessage(text, ok) {
      if (!errorBox) return;
      errorBox.className = 'status-msg ' + (ok ? 'status-msg--success' : 'status-msg--error');
      errorBox.textContent = text;
      errorBox.hidden = false;
    }

    // keepMessage: true after an add attempt, so its result stays visible.
    function render(keepMessage) {
      var opts = selectedOptions();
      var v = findVariant(opts);
      markAvailability(opts);
      opts.forEach(function (val, i) {
        var el = $('[data-selected-value="' + i + '"]', picker);
        if (el) el.textContent = val || '';
      });
      if (errorBox && keepMessage !== true) errorBox.hidden = true;

      var state, text;
      if (!v) { state = 'out'; text = 'This combination isn\'t available'; }
      else if (!v.available) { state = 'out'; text = 'Sold out in this size'; }
      else if (v.preorder) { state = 'preorder'; text = stock.getAttribute('data-preorder-note') || 'Pre-order'; }
      else if (v.low) { state = 'low'; text = 'Low stock'; }
      else { state = 'in'; text = 'In stock'; }

      $('.stock-dot', stock).className = 'stock-dot' + (state === 'in' ? '' : ' stock-dot--' + state);
      $('[data-stock-text]', stock).textContent = text;

      if (v) {
        if (idInput) idInput.value = v.id;
        $('[data-product-price]', root).innerHTML = '<span class="price" data-price>' + v.price + '</span>' +
          (v.compare ? ' <span class="visually-hidden">Regular price</span><s class="price price--compare">' + v.compare + '</s>' : '');
        var url = new URL(window.location.href);
        url.searchParams.set('variant', v.id);
        window.history.replaceState({}, '', url.toString());
      }
      var canBuy = !!(v && v.available);
      if (addBtn) {
        addBtn.disabled = !canBuy;
        addText.textContent = !v ? 'Unavailable' : !v.available ? 'Sold out' : v.preorder ? 'Pre-order' : 'Add to Bag';
      }
      if (sticky) {
        $('[data-sticky-add]', sticky).disabled = !canBuy;
        $('[data-sticky-variant]', sticky).textContent = opts.join(' / ');
        if (v) $('[data-sticky-price]', sticky).innerHTML = v.price;
      }
    }

    if (picker) {
      picker.addEventListener('change', function () { render(false); });
      render(false);
    }

    if (form && addBtn && idInput) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (addBtn.disabled) return;
        addBtn.setAttribute('aria-busy', 'true');
        addBtn.disabled = true;
        addToCart([{ id: parseInt(idInput.value, 10), quantity: 1 }], addBtn)
          .then(function () {
            // The drawer confirms the add; on the "bag page" setting, say it here.
            if (!(TKX.cartType === 'drawer' && document.getElementById('CartDrawer'))) showMessage('Added to your bag.', true);
          })
          .catch(function (err) { showMessage(err.message, false); })
          .finally(function () {
            addBtn.removeAttribute('aria-busy');
            if (picker) render(true); else addBtn.disabled = false;
          });
      });
    } else if (form) {
      // Pre-launch: the form has no variant id, so block any implicit submission.
      form.addEventListener('submit', function (e) { e.preventDefault(); });
    }

    // Sticky mobile Add to Bag: shown once the main button scrolls out of view.
    // A throttled scroll check (not IntersectionObserver) so jumps past the button are caught too.
    if (sticky && addBtn) {
      document.body.classList.add('has-sticky-atc');
      var ticking = false;
      var checkSticky = function () {
        ticking = false;
        var hidden = addBtn.getBoundingClientRect().bottom < 0;
        if (hidden === sticky.classList.contains('is-visible')) return;
        sticky.classList.toggle('is-visible', hidden);
        sticky.setAttribute('aria-hidden', hidden ? 'false' : 'true');
        $('[data-sticky-add]', sticky).tabIndex = hidden ? 0 : -1;
      };
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(checkSticky); }
      }, { passive: true });
      checkSticky();
      $('[data-sticky-add]', sticky).addEventListener('click', function () {
        if (form.requestSubmit) form.requestSubmit(); else addBtn.click();
      });
    }
  });

  /* ---------- Shop the Look & matching sets ---------- */
  // Each <component-picker> is one real garment with its own sizes and stock.
  function pickerState(cp) {
    var include = $('[data-include]', cp);
    var checked = $('input[type="radio"]:checked', cp);
    var anyAvailable = $$('input[type="radio"]', cp).some(function (r) { return !r.disabled; });
    return {
      el: cp,
      name: $('.look-item__name', cp).textContent.trim(),
      included: include ? include.checked : true,
      variant: checked ? parseInt(checked.value, 10) : null,
      price: checked ? parseInt(checked.getAttribute('data-price'), 10) : 0,
      size: checked ? checked.getAttribute('data-label') : null,
      anyAvailable: anyAvailable,
      noMatch: cp.hasAttribute('data-no-match')
    };
  }

  function setupBundle(root, isSet) {
    var pickers = $$('component-picker', root);
    var totalEl = $('[data-bundle-total]', root);
    var btn = $('[data-bundle-add]', root);
    var status = $('[data-bundle-status]', root);
    var partialBox = $('[data-partial]', root);
    var allowPartial = $('[data-allow-partial]', root);

    function update() {
      var states = pickers.map(pickerState);
      states.forEach(function (s) {
        var label = $('[data-selected-size]', s.el);
        label.textContent = s.noMatch ? 'Not available in this colour' : !s.anyAvailable ? 'Sold out' : s.size || 'Choose a size';
        var price = $('[data-item-price]', s.el);
        if (s.variant) price.textContent = formatMoney(s.price);
        s.el.style.opacity = s.included ? '' : '0.55';
      });

      var soldOut = states.filter(function (s) { return !s.anyAvailable; });
      var usable = states.filter(function (s) { return s.included && s.anyAvailable; });
      if (isSet && partialBox) {
        partialBox.hidden = soldOut.length === 0;
        if (soldOut.length) {
          $('[data-partial-text]', partialBox).textContent =
            soldOut.map(function (s) { return s.name; }).join(' and ') +
            (soldOut.length > 1 ? ' aren\'t' : ' isn\'t') + ' available in any size right now, so the full set can\'t be added.';
        }
      }
      var blocked = isSet && soldOut.length > 0 && !(allowPartial && allowPartial.checked);
      var missing = usable.filter(function (s) { return !s.variant; });
      var total = usable.reduce(function (sum, s) { return sum + (s.variant ? s.price : 0); }, 0);
      totalEl.textContent = formatMoney(total);

      if (!btn) return;
      if (blocked) { btn.disabled = true; btn.textContent = 'Set unavailable'; }
      else if (!usable.length) { btn.disabled = true; btn.textContent = 'Select at least one piece'; }
      else if (missing.length) {
        btn.disabled = true;
        btn.textContent = 'Choose a size for ' + missing.map(function (s) { return s.name; }).join(', ');
      } else {
        btn.disabled = false;
        btn.textContent = 'Add ' + usable.length + (usable.length === 1 ? ' piece' : ' pieces') + ' to Bag — ' + formatMoney(total);
      }
      root._usable = usable;
    }

    root.addEventListener('change', update);
    update();

    if (btn) {
      btn.addEventListener('click', function () {
        var usable = root._usable || [];
        if (!usable.length || usable.some(function (s) { return !s.variant; })) return;
        var props = isSet ? { _set: root.getAttribute('data-set-title') } : {};
        btn.disabled = true;
        status.hidden = true;
        addAllOrNothing(usable.map(function (s) { return { id: s.variant, quantity: 1, properties: props }; }), btn)
          .then(function () {
            status.className = 'status-msg status-msg--success';
            status.textContent = 'Added to your bag.';
            status.hidden = false;
          })
          .catch(function (err) {
            status.className = 'status-msg status-msg--error';
            status.textContent = err.partial
              ? err.message + ' Some pieces may already be in your bag — please check it before continuing.'
              : err.message + ' Nothing was added — please check your sizes.';
            status.hidden = false;
          })
          .finally(update);
      });
    }
  }

  $$('look-bundle').forEach(function (el) { setupBundle(el, false); });
  $$('set-bundle').forEach(function (el) { setupBundle(el, true); });

  // Look tabs (WAI-ARIA tabs pattern)
  $$('.look__tabs').forEach(function (list) {
    var tabs = $$('[role="tab"]', list);
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      tab.focus();
    }
    list.addEventListener('click', function (e) { var t = e.target.closest('[role="tab"]'); if (t) select(t); });
    list.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); select(tabs[(i + 1) % tabs.length]); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[(i - 1 + tabs.length) % tabs.length]); }
    });
  });

  /* ---------- Predictive search ---------- */
  $$('predictive-search').forEach(function (root) {
    var input = $('input[type="search"]', root);
    var results = $('#PredictiveResults', root);
    var controller;
    var run = debounce(function () {
      var q = input.value.trim();
      // Abort first so a slow, older request can't refill cleared results.
      if (controller) controller.abort();
      controller = null;
      if (q.length < 2) { results.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); return; }
      controller = 'AbortController' in window ? new AbortController() : null;
      var url = routes.predictiveSearch + '?q=' + encodeURIComponent(q) +
        '&section_id=predictive-search&resources[type]=product,page&resources[limit]=6&resources[options][prefix]=last';
      fetch(url, controller ? { signal: controller.signal } : {})
        .then(function (r) { if (!r.ok) throw new Error(); return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var inner = doc.querySelector('.predictive-search__inner');
          results.innerHTML = inner ? inner.outerHTML : '';
          input.setAttribute('aria-expanded', inner ? 'true' : 'false');
        })
        .catch(function () { /* the full search page still works on Enter */ });
    }, 250);
    input.addEventListener('input', run);
  });

  /* ---------- Collection filters ---------- */
  $$('facet-filters').forEach(function (root) {
    $$('form[data-filter-form]', root).forEach(function (form) {
      // Checkboxes and sort apply at once; price applies with Enter or "Apply",
      // so typing "From" then tabbing to "To" doesn't reload the page halfway.
      form.addEventListener('change', function (e) {
        if (e.target.type === 'number') return;
        form.submit();
      });
    });
  });

  /* ---------- Product recommendations ---------- */
  $$('product-recommendations').forEach(function (el) {
    fetch(el.getAttribute('data-url'))
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var section = doc.querySelector('section');
        if (section) el.innerHTML = section.outerHTML;
      })
      .catch(function () {});
  });

  /* ---------- Contact form validation (server still validates) ---------- */
  $$('form[data-validate]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      var honeypot = $('[data-honeypot]', form);
      if (honeypot && honeypot.value) { e.preventDefault(); return; }
      var firstBad = null;
      $$('[required]', form).forEach(function (f) {
        var bad = !f.value.trim() || (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value));
        f.setAttribute('aria-invalid', bad ? 'true' : 'false');
        var msg = document.getElementById(f.id + '-err');
        if (msg) msg.hidden = !bad;
        if (bad && !firstBad) firstBad = f;
      });
      if (firstBad) { e.preventDefault(); firstBad.focus(); }
    });
  });

  /* ---------- Hero video pause ---------- */
  $$('hero-video').forEach(function (wrap) {
    var video = $('video', wrap);
    var btn = $('[data-video-toggle]', wrap);
    if (!video || !btn) return;
    if (reduceMotion) { video.removeAttribute('autoplay'); video.pause(); }
    function sync() {
      var paused = video.paused;
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      $('[data-icon-pause]', btn).hidden = paused;
      $('[data-icon-play]', btn).hidden = !paused;
      $('.visually-hidden', btn).textContent = paused ? 'Play background video' : 'Pause background video';
    }
    btn.addEventListener('click', function () { if (video.paused) video.play(); else video.pause(); });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    sync();
  });

  /* ---------- Country suggestion (never redirects) ---------- */
  $$('country-suggestion').forEach(function (bar) {
    var current = bar.getAttribute('data-current-country');
    var mapEl = $('[data-country-map]');
    if (storage('tkx-country-suggestion-dismissed')) return;
    var map = {};
    try { map = JSON.parse(mapEl.textContent); } catch (e) { return; }
    // Endpoint must be verified on the live store; any failure is a silent no-op.
    fetch('/browsing_context_suggestions.json')
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (data) {
        var code = data && data.detected_values && data.detected_values.country && data.detected_values.country.handle;
        if (!code || code === current || !map[code]) return;
        var info = map[code];
        $('[data-suggestion-text]', bar).textContent =
          'Shopping from ' + info.name + '? View prices in ' + info.currency + ' (' + info.symbol + ').';
        $('[data-suggestion-country]', bar).value = code;
        bar.hidden = false;
      })
      .catch(function () {});
    $('[data-suggestion-dismiss]', bar).addEventListener('click', function () {
      storage('tkx-country-suggestion-dismissed', '1');
      bar.hidden = true;
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var io = null;
  function setupReveals(root) {
    var reveals = $$('.reveal:not(.is-in)', root);
    // In the theme editor, show everything at once so edited sections never look empty.
    if (reduceMotion || !('IntersectionObserver' in window) || (window.Shopify && Shopify.designMode)) {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px' });
    }
    reveals.forEach(function (el) { io.observe(el); });
  }
  setupReveals(document);
  document.addEventListener('shopify:section:load', function (e) { setupReveals(e.target); });
})();
