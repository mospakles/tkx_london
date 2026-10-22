# Preview tests

Automated browser checks for `preview/` (Node 18+ and Google Chrome installed).

```sh
cd tests
npm install
npm test                 # both suites; screenshots land in tests/shots/
npm run test:preview     # static preview only (66 checks)
npm run test:theme-js    # theme/assets/theme.js against mocked Shopify cart endpoints (16 checks)
```

`theme-js.e2e.mjs` loads the real theme script into markup that mirrors the theme's Liquid output and mocks the Ajax Cart API. It verifies the JavaScript logic (drawer re-rendering, focus, line keys, set roll-back, messages), not Shopify itself.

They cover navigation, filters and sort, search, product variants and sold-out sizes, pre-orders, mixed-size matching sets, Shop the Look partial selection, bag quantity and removal, checkout handoff, currency display, forms (honest states), consent, keyboard access, mobile, tablet and desktop layouts, and pre-launch/live switching.

Neither suite talks to a Shopify store. Live-store checks are listed in `docs/TEST-REPORT.md`.
