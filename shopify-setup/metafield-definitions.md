# Product metafield definitions (namespace `tkx`)

Create these in **Settings → Custom data → Products → Add definition**. Use the exact
namespace and key shown, so the theme can read them. The theme never shows invented
values: when a field is blank, customers see nothing for it, and the owner sees an
"Owner review" marker in the theme editor.

| Name (admin label) | Namespace.key | Type | Used for | Example of the *format* (not real data) |
|---|---|---|---|---|
| Model info | `tkx.model_info` | Single line text | Model height and size worn | `Model is 5'9" / 175 cm and wears size S` |
| Fit notes | `tkx.fit_notes` | Multi-line text | Fit guidance | `Close fit. Take your usual size.` |
| Fabric composition | `tkx.fabric` | Single line text | Exactly as on the garment label | `XX% …, XX% …` |
| Care instructions | `tkx.care` | Multi-line text | From the care label | |
| Features | `tkx.features` | List of single line text | Verified pocket, waistband and fastening details (one per item) | |
| Garment measurements | `tkx.measurements` | JSON | Measurement table (see below) | |
| Dispatch estimate | `tkx.dispatch_estimate` | Single line text | Overrides the theme-wide dispatch text for this product | |
| Pre-order note | `tkx.preorder_note` | Single line text | Shown when a variant is sold with "Continue selling when out of stock" | `Pre-order — dispatches from …` |
| Complete the look | `tkx.complete_the_look` | List of product references | Hand-picked recommendations | |
| Set components | `tkx.set_components` | List of product references | **Matching sets only** — the real garments in the set | |
| Set colour | `tkx.set_colour` | Single line text | **Matching sets only** — fixes every piece to one colour (e.g. `Chocolate`). Leave blank to allow any colour variant. | |

## Measurements JSON format

```json
{
  "unit": "cm",
  "columns": ["Size", "Bust", "Waist", "Length"],
  "rows": [
    ["XS", "…", "…", "…"],
    ["S",  "…", "…", "…"]
  ]
}
```

Fill in only measured values from the production sample or tech pack.

## Matching sets — how they work

1. Create a product for the set (e.g. "Motion Rib Set") with photos of the set worn together.
2. In the product's **Theme template**, choose `set`.
3. Fill **Set components** with the real top and bottom products (and **Set colour** if the set is one colour).
4. Give the set product **one variant, inventory tracked, quantity 0, "Continue selling" OFF**. Shoppers
   never buy this placeholder variant: the page adds the real garments instead. Its own price is not shown.
5. Customers choose a size per piece. Each piece is added as its own bag line labelled
   "Part of: Motion Rib Set" and uses that garment's stock.

No app is needed for this. The free Shopify Bundles app is an alternative only if you
want one combined bag line or a set discount — see docs for the trade-offs.

## Pre-order

Pre-order is shown only from real inventory settings: a variant with tracked
inventory ≤ 0 and **Continue selling when out of stock** turned on. Add the
`tkx.preorder_note` text with a confirmed dispatch date.
