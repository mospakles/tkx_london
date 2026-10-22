# Test report

**22 October 2026.** For the owner and developer.

## Summary

| Layer | Result | Verified against live services? |
|---|---|---|
| Static preview (`preview/`) | **66 of 66 automated browser checks pass** (Chrome; desktop 1440, tablet 820, mobile 390; reduced motion) | No. Fixture data only. |
| Shopify theme (`theme/`) | **Shopify Theme Check: 68 files, 0 offences** (Shopify CLI, offline) | **No.** The Liquid has not been rendered on a Shopify store, because no store is connected. |
| Theme JavaScript (`theme/assets/theme.js`) | **16 of 16 harness checks pass**: the real script runs against markup mirroring the Liquid output, with Shopify's cart endpoints mocked | No. Mocked endpoints. |
| Theme code review | Two independent read-through reviews of all theme files; 25 defects found and fixed (see below) | — |
| Payments, currencies, emails, forms | **Not tested.** These need the owner's store and Shopify Payments account. | No |

**Nothing here has been tested against a live Shopify store, payment provider or email service.** Those checks are listed under [Pending live-store tests](#pending-live-store-tests).

## Preview results by area

| Area | What was checked | Result |
|---|---|---|
| Navigation | Brief order; empty "Unisex" collection hidden from the menu; empty collection page shows "Coming soon"; 404 page | Pass |
| Search | Live results while typing; Enter opens the results page; no-results empty state | Pass |
| Collection filters | Colour filter narrows results; chips and shareable URL; sort by price; price filter empty state; reset restores all | Pass |
| Product variants | Sold-out sizes disabled and announced; no size → error; fully sold-out colour disables Add to Bag; pre-order labelled; quantity can't exceed stock; URL keeps colour and size | Pass |
| Variant kept in bag | Chosen colour and size appear on the bag line | Pass |
| Matching sets | Different sizes for top (S) and bottom (L); both lines added with a set reference; combined total; sold-out piece blocks adding with an explicit "nothing has been added" message | Pass |
| Shop the Look | Missing sizes block adding; unticking a piece changes the button to "Add 2 of 3 pieces" and names the excluded piece; total updates | Pass |
| Bag | Quantity +/− updates subtotal; remove; Esc closes; focus stays in the drawer during updates | Pass |
| Checkout handoff | Explains hosted Shopify checkout; no card fields anywhere | Pass |
| Currency | NGN and CAD (CA$) display; payment-currency caveat on product pages and in the bag; location *suggestion* (Lagos timezone) shown without switching currency | Pass |
| Forms | Contact validation; sign-up needs explicit consent; neither form claims success, because the preview has no backend | Pass |
| Consent | Cookie banner; reject non-essential stored; mobile sticky Add to Bag sits **above** the cookie banner | Pass |
| Keyboard | Skip link; drawer focus trap; Esc; focus returns to the trigger | Pass |
| Layouts | No horizontal overflow on mobile, tablet or desktop; touch targets ≥ 36 px (main controls 44–52 px); sticky mobile Add to Bag | Pass |
| Store modes | Pre-launch password page; owner preview (Join the Launch List replaces Add to Bag); Live | Pass |
| JS errors | None on desktop or mobile runs | Pass |

## Defects found and fixed during testing

1. **Search input had zero width.** The search icon had no fixed size and took all the space. Fixed in `base.css`, which also fixes the theme.
2. **"Reset filters" click could be lost.** Leaving the price field re-rendered the grid between mousedown and mouseup. It now re-renders only when the filters actually change.
3. **Sticky mobile Add to Bag missed fast jumps.** An IntersectionObserver doesn't fire when the page jumps straight past the button. Fixed in both the preview and `theme/assets/theme.js`.
4. **Country/currency button showed in the mobile header.** A CSS ordering problem. Fixed; on mobile it's in the menu drawer.
5. **The hero headline wrapped to three lines and the footer wordmark was cropped** on desktop. Type scale adjusted.
6. **Theme sign-up forms relied on notice text for consent.** Added a required consent checkbox to match the reviewed preview.
7. **Low-contrast intro text on the black pre-launch page.** Muted text there now uses the light muted colour (about 10:1 contrast).

## Theme code review (22 Oct 2026)

Two reviews read every theme file against Shopify's documented behaviour. Every finding was checked against the code before it was fixed. Fixes since the first version of this report:

**Shopping**
- **Bag drawer re-rendering:** the drawer disappeared after any quantity change or removal inside it. It now stays open and focus returns to the same control.
- **Set and look size buttons:** with no fixed colour, they showed bare sizes ("S M L S M L") and could add an unseen colour. They are now labelled "Black / M".
- **Mistyped set colour:** a set colour that matched no variant showed "Sold out". It now says "Not available in this colour", with an owner-review marker.
- **Bag quantity changes:** these used the line's position, so overlapping clicks could change the wrong item. They now use the line key, one change at a time. A failed change re-renders the bag so the quantities shown are real.
- **Set/look adds:** if Shopify rejects a multi-piece add part-way, any pieces that did land are now rolled back, so "Nothing was added" is always true. If the roll-back itself fails, the message says to check the bag.
- **Product add errors:** these were hidden as soon as they appeared. They now stay visible. In "bag page" mode the product page now confirms the add.
- **Without JavaScript:** the product form added the variant from page load. It now has a no-JS colour/size selector.
- **Pre-launch mode:** the product form no longer carries a variant ID, so it can't add to the bag, even by pressing Enter.
- **Product cards:** set prices and availability now respect the set colour, with "From" when prices vary. The "Pre-order" badge now appears only when a variant is actually selling as a pre-order.
- **Sticky bar:** it no longer shows "Default Title" on single-variant products.
- **Price formatting:** an invalid locale tag (e.g. `pt-BR-BR`) could break JS price formatting. It now uses language plus country.

**Layout, forms and accessibility**
- **Desktop navigation:** it was hidden by a CSS rule added for the preview. The rule is now scoped to the preview only.
- **"Cookie settings":** it reopened a banner whose buttons did nothing. The buttons now always work, and the banner only reopens when consent can be saved.
- **Hero alt text:** the hero's alt-text setting was ignored. It is now used.
- **Price filter (desktop):** Enter did nothing, and tabbing between "From" and "To" reloaded the page. There is now a visible "Apply filters" button and no auto-submit on blur.
- **Price filter (decimals):** decimal prices failed validation. Fixed with `step="any"`.
- **Filter values:** these weren't HTML-escaped. They are now.
- **Theme editor:** images in edited sections could stay invisible. Reveal animations now re-initialise on section reload and are disabled in the editor.
- **Focus after switching panels:** focus was lost when moving from the menu to the country selector. It now returns to the menu button.
- **Predictive search:** stale results could reappear after clearing the box. Fixed.
- **Social sharing:** `og:image` width and height now match the 1200 px image actually served.
- **Form attributes:** they now use explicit values (`'true'`), so the JS hooks don't depend on Shopify keeping empty attributes.

## Pending live-store tests

To run on the owner's store before the 19 Dec 2026 milestone:

- [ ] Theme renders every template with real products: product, product.set, collection, search, cart, pages, password, 404.
- [ ] `/cart/add.js` with several items where one is out of stock: confirm the bag is unchanged afterwards. The theme rolls back any partial add, so this checks the roll-back on real Shopify responses.
- [ ] Bag drawer and bag page update through Section Rendering.
- [ ] Storefront filters (Search & Discovery): Size, Color, Availability, Price. Matching-set products use a 0-stock placeholder variant, so "In stock only" will hide them. This is a known limitation, accepted so the set itself can never be bought directly.
- [ ] Predictive search and recommendations.
- [ ] Font handles `archivo_n7` and `dm_sans_n4` load from Shopify's font library.
- [ ] `/browsing_context_suggestions.json` returns a suggestion. If not, the suggestion bar stays hidden and nothing else changes.
- [ ] **Test orders** in GBP, USD, EUR, CAD and **NGN**: record the currency actually charged; card plus one express method each; refund.
- [ ] Shipping restrictions: checkout refuses addresses outside the configured zones.
- [ ] Guest checkout; order confirmation email received and branded.
- [ ] Launch-list sign-up creates a customer with marketing consent and the `launch-list` tag; success shows only after submission. Unsubscribe from a Shopify Email test.
- [ ] Contact form email arrives; hCaptcha is enabled.
- [ ] Shopify cookie banner shows to UK and EEA visitors; analytics respect the choice.
- [ ] Real-device checks: iOS Safari and Android Chrome (only Chrome was tested here). Also a screen-reader pass with VoiceOver.
- [ ] Lighthouse (performance and accessibility) with real images.
- [ ] Rich Results Test on a product URL.
- [ ] Pre-launch → Live switch and password removal rehearsal, on an unpublished duplicate theme.
