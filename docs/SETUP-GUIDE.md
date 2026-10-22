# Shopify setup guide

Written for the person setting up the store: the developer, working alongside the owner. Facts about Shopify were checked against Shopify's official help pages on **22 October 2026** (sources are in [CURRENCY-CAPABILITY.md](CURRENCY-CAPABILITY.md#sources)). Re-check prices and plan features in the admin before you pay for anything.

**Explicit owner approval is required before any of these steps:**
- publishing the theme or removing the store password
- starting a paid plan or app subscription
- connecting or changing a domain
- activating live payments

## 1. Accounts and ownership

1. **The owner** creates the Shopify store on their own account, using the business email.
2. **The owner** adds the developer as a **collaborator** (Settings → Users). The developer never holds the owner's login.
3. **The owner** sets up Shopify Payments: business details, bank account and identity checks. The payout bank account must be in the owner's name.
4. **The owner** buys the domain or transfers it into their own name (Shopify or another registrar). Connect it only after approval.
5. **Keep credentials out of this repository.**
   - The theme needs no API keys.
   - If you later add an email provider, analytics or an app, enter its keys in the Shopify admin or the app's settings, never in theme files.

## 2. Install the theme

Choose one of two routes:
- **Zip upload:** zip the `theme/` folder contents and upload it under Online Store → Themes → Add theme → Upload zip file.
- **Shopify CLI:** run `shopify theme push --unpublished --path theme`, using collaborator access.

Then:
1. Keep the theme **unpublished** while you set up and test. Use **Preview** and share preview links.
2. In **Customize → Theme settings**:
   - **Store mode:** leave on *Pre-launch*. It never switches by date.
   - **Logo & emblem:** upload the approved **TKX LONDON** artwork and the **emblem**, and add the emblem as the **favicon**. Upload the original files and don't redraw or recolour them. Set the logo width so the proportions are preserved.
   - **Launch date wording:** for example "Target launch: 26 December 2026". Edit it if production slips.
   - **Social:** add only accounts the owner approves. Empty links stay hidden.
   - **Default dispatch estimate:** leave blank until it's confirmed. Customers see nothing; in the editor an "owner review" marker shows.
   - **Size guide page** and **Delivery & returns page:** select the pages you created in section 4.

## 3. Products, metafields and sets

1. **Create the metafield definitions** listed in [shopify-setup/metafield-definitions.md](../shopify-setup/metafield-definitions.md) under Settings → Custom data → Products.
2. **Options:**
   - Use **Color** and **Size** as option names. The theme reads "Color"/"Colour" and "Size".
   - Track inventory for every variant. Stock is held per colour/size variant.
3. **Pre-order:**
   - Set "Continue selling when out of stock" only on variants that genuinely are pre-orders.
   - Fill **Pre-order note** with a confirmed dispatch window.
4. **Matching sets** use custom theme code, so no app is needed:
   - Create a product such as "Motion Rib Set" and assign the template **product.set**.
   - Give it one placeholder variant: quantity 0, inventory tracked, "Stop selling". This stops the set itself from ever being bought.
   - Fill **Set components** with the real top and bottom products.
   - Optionally set **Set colour**.
   - Tag it `matching-set`.
5. **Fixture CSV (optional):** [shopify-setup/sample-products.csv](../shopify-setup/sample-products.csv) imports 8 fixture products for layout testing.
   - They import as **Draft / unpublished**, tagged `dev-fixture`.
   - **Delete them** before launch: Products → filter tag `dev-fixture` → select all → Delete.
   - Fixtures must never be published or reach checkout.
   - The CSV's "Variant Inventory Qty" column may be a legacy column. If the import ignores it, set stock per location afterwards.

## 4. Navigation, collections and pages

Follow [shopify-setup/navigation.md](../shopify-setup/navigation.md).
- **Menu order:** Shop All, Matching Sets, Tops, Bottoms, Our Story.
- **Empty collections are hidden automatically**, so you can add Unisex or seasonal collections early.
- **Pages to create:** Our Story (`page.story`), Contact (`page.contact`), Size Guide (`page.size-guide`), Delivery & Returns, FAQs.
- **Privacy and Terms:** use Settings → Policies. Shopify can generate starting templates, which the owner or a legal adviser must complete.
- **Install Shopify Search & Discovery** (free, by Shopify). It enables collection filters (Size, Color, Availability, Price) and product recommendations.

## 5. Markets, currencies and shipping

See [CURRENCY-CAPABILITY.md](CURRENCY-CAPABILITY.md) for what each currency can and can't do.

1. **Primary market:** United Kingdom, with GBP as the store currency.
2. **Markets:** add markets for United States (USD), the eurozone countries the owner will ship to (EUR), Nigeria (NGN) and Canada (CAD).
   - **Only add markets you will actually ship to.**
   - Currency selection never implies delivery. Shipping zones decide where checkout accepts addresses.
3. **Local currencies:** turn on local currency per market.
   - This needs **Shopify Payments**. With any other payment provider, customers pay in GBP.
4. **Pricing:**
   - Choose automatic exchange rates (recommended) or manual rates per market.
   - Optionally set fixed prices per market.
   - Review the rounding rules (Markets → market → Products and pricing).
5. **Country selector:**
   - The header and footer use Shopify's native localization form.
   - Leave **Online Store → Preferences → Automatic redirection OFF**. The brief rules out forced redirects.
   - The theme instead shows a dismissible "Shopping from …?" suggestion, controlled by the theme setting *Suggest country/currency*.
   - That suggestion uses the `/browsing_context_suggestions.json` endpoint. Check it works on the live store; if it doesn't, the bar simply never shows.
   - The old Geolocation app was retired in March 2025.
6. **Shipping (Settings → Shipping and delivery):** create zones and rates only from the owner's confirmed carrier prices.
7. **Taxes and duties:**
   - The owner and their accountant decide VAT registration and whether prices include tax.
   - They also decide whether international orders are shipped duties-paid (DDP) or duties-unpaid (DAP).
   - The theme doesn't state either way until confirmed.

## 6. Payments and checkout

- **Checkout:** Shopify's hosted checkout only. The theme posts the bag to `/cart` → checkout and contains no card fields.
- **Guest checkout:** in Settings → Customer accounts, make accounts optional or disabled.
- **Express buttons:**
  - Shop Pay, Apple Pay and Google Pay come on automatically with Shopify Payments in the UK. Check which are enabled in Settings → Payments.
  - PayPal is a separate account.
  - Klarna is listed for the UK. Turn it on only if the owner wants it.
  - The bag page renders `content_for_additional_checkout_buttons`.
- **Order emails:** Shopify sends them (Settings → Notifications). Add the logo and brand colour there.

## 7. Email list, contact form and consent

- **Launch list:**
  - The homepage and pre-launch sign-up forms create Shopify customers with email-marketing consent and the tag `launch-list`.
  - The success message appears **only** when Shopify confirms the submission (`form.posted_successfully?`).
  - Use **Shopify Email** for campaigns: 10,000 free emails a month, then US$1 per 1,000 (checked 22 Oct 2026). Unsubscribe links are added automatically.
- **Consent:** the forms need a ticked consent checkbox (explicit opt-in). The consent text is editable in each section.
- **Contact form:**
  - Uses Shopify's native contact form, sent to the store's sender email.
  - Turn on **spam protection (hCaptcha)** under Online Store → Preferences.
  - The theme also has a honeypot field, but it's checked only in the browser.
- **Cookies:**
  - Publish the privacy policy, then turn on Shopify's **cookie banner** (Settings → Customer privacy). It applies to UK and EEA visitors.
  - The theme's own banner is **off by default**. Use it only if the native banner isn't suitable.
- **Analytics:** use Shopify Analytics. Don't add third-party tracking scripts unless the owner wants them, and only behind consent through Shopify's Customer Privacy API.

## 8. SEO

- **Already in the theme:**
  - Shopify generates `sitemap.xml` and `robots.txt` automatically.
  - The theme outputs titles, meta descriptions, canonical links, Open Graph/Twitter tags and `Product` JSON-LD structured data.
- **Owner adds:** SEO titles and descriptions per product and page, and image alt text.
- **Validate after launch:** Google Rich Results Test and Search Console (submit the sitemap).

## 9. Launch

1. **Store mode → Live:** the hero button becomes "Shop the Collection" and Add to Bag appears.
2. **Remove the store password:** Online Store → Preferences. Do this only with the owner's explicit approval, on or after launch day.
3. **Pre-launch page:** if production is delayed, leave the password on and edit the launch wording. Nothing switches automatically.

## Outstanding tasks

| # | Task | Owner | Needed by |
|---|---|---|---|
| 1 | Create Shopify store on owner account; add developer as collaborator | Owner | 6 Nov 2026 |
| 2 | Complete Shopify Payments verification (identity, bank) | Owner | 6 Nov 2026 |
| 3 | Confirm merchant business country, legal entity and VAT status | Owner + accountant | 6 Nov 2026 |
| 4 | Supply approved logo (SVG/PNG) and emblem files and usage rules | Owner | 6 Nov 2026 |
| 5 | Confirm product range, prices (GBP), stock per variant and SKUs | Owner | 13 Nov 2026 |
| 6 | Garment specs: fabric composition, care, measurements, fit notes, verified features | Owner / manufacturer | 20 Nov 2026 |
| 7 | Studio photography (front, back, detail), model height/size, campaign and lifestyle imagery or video | Owner / photographer | 27 Nov 2026 |
| 8 | Shipping destinations, carriers, rates, delivery estimates, duties approach | Owner | 20 Nov 2026 |
| 9 | Returns policy, privacy policy, terms (legal review) | Owner / legal | 27 Nov 2026 |
| 10 | Approve brand copy (Our Story, FAQs, announcement text) | Owner | 4 Dec 2026 |
| 11 | Social account URLs | Owner | 4 Dec 2026 |
| 12 | Approve Markets list and currency pricing approach | Owner | 27 Nov 2026 |
| 13 | Test orders: each currency, NGN in particular, express payments, refund | Dev + owner | 19 Dec 2026 |
| 14 | Domain connection (with approval) | Owner + dev | 19 Dec 2026 |
| 15 | Delete `dev-fixture` products; final content check | Dev | 19 Dec 2026 |
| 16 | Go-live approval: password removal, Store mode → Live | Owner | 26 Dec 2026 |
