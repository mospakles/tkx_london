# Running the TKX London shop: a short guide

For the TKX London owner. Everything here is done in the Shopify admin. No code is needed.

## Launch messaging

| To change… | Go to |
|---|---|
| **Pre-launch or full store** | Online Store → Themes → **Customize** → Theme settings → **Store mode**. *Pre-launch* shows "Join the Launch List" buttons and hides Add to Bag. *Live* shows "Shop the Collection" and Add to Bag. It **never changes by itself**. |
| Who can see the shop | Online Store → **Preferences** → Password protection. On = only the pre-launch page is public. Turn it off only on launch day. |
| Launch date wording | Theme settings → Store mode → **Launch date wording**. If production slips, change it to something like "Launching early 2027". |
| Announcement bar | Customize → header area → **Announcement bar**. Leave the text empty to hide it. Only announce offers you've actually approved. |
| Pre-launch page text and image | Customize → choose the **Password** page from the top dropdown. |

## Products

- **Add a product:** Products → Add product.
  - Use the options **Color** and **Size**, then add the variants.
  - Fill in the **TKX** fields lower down: model info, fit notes, fabric, care, features, measurements, dispatch estimate.
  - Leave a field empty if it isn't confirmed. Customers won't see an empty field.
- **Images:**
  - Upload front, back and detail shots, plus an optional short movement video.
  - Write alt text that describes the garment, for example "Motion Rib Legging in chocolate, front view".
- **Prices:** set the GBP price per variant. Other currencies convert automatically (see Markets). For a fixed price in a market, use Markets → that market → Products and pricing.
- **Stock:**
  - Set it per variant (each colour and size).
  - When a size reaches 0 it's shown as sold out and can't be bought.
  - To sell a variant as a **pre-order**, tick "Continue selling when out of stock" on that variant only, and fill in the **Pre-order note** with the confirmed dispatch window.
- **Matching set:**
  - Duplicate an existing set product.
  - Pick the two garments in **Set components**.
  - Keep its single placeholder variant at stock 0 so the set itself can't be bought.
  - Each garment keeps its own sizes and stock.
- **Hide a product:** set its status to **Draft**.

## Orders

- **Orders list:** Orders → open an order → **Fulfil** (add tracking).
- **Refunds:** Refund in the order.
- **Emails:** Shopify emails the customer automatically. Edit the templates in Settings → Notifications.
- **Sets:** set pieces appear as separate lines, with a note of which set they came from.

## Homepage and pages

- **Edit the homepage:** Customize → Home page. Each band is a section you can edit, reorder or hide:
  - Hero
  - Launch collection
  - Shop the Look
  - Considered Details
  - Editorial
  - Our Story
  - Sign-up
- **Hero:** use an image or a short muted video, plus a separate mobile image if needed. Pick photos that show full silhouettes.
- **Shop the Look:** each "look" block takes one image and up to four products.
- **Pages** (Contact, Size Guide, Delivery & Returns, FAQs): Online Store → Pages.
- **Policies:** Settings → Policies.

## Menus and new collections

- **Menus:** Online Store → Navigation → Main menu.
- **Empty collections stay hidden:** a menu link to a collection with no products isn't shown. Add "Unisex" or "Winter" to the menu early and it appears when its first product is published.

## Email list

- **Who's on the list:** Customers → filter by tag `launch-list` (only those who opted in to email marketing).
- **Send campaigns:** Marketing → Shopify Email. Every email includes an unsubscribe link, and unsubscribes update automatically.

## Currencies

Markets controls which countries and currencies are offered. Read [CURRENCY-CAPABILITY.md](CURRENCY-CAPABILITY.md) before adding a market. Don't advertise naira payment until a test order has confirmed it.

## Good habits

- Keep everything in your own name: domain, Shopify, payments and email. Give developers **collaborator** access only, and remove it when the work is done.
- Never paste passwords or API keys into theme files or messages.
- Before launch: delete the products tagged `dev-fixture`.
