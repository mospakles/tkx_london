# Navigation setup

Create these menus in **Online Store → Navigation**.

## `main-menu` (header)

| Title | Links to |
|---|---|
| Shop All | Collection: All products (`/collections/all`) |
| Matching Sets | Collection: Matching Sets |
| Tops | Collection: Tops |
| Bottoms | Collection: Bottoms |
| Our Story | Page: Our Story (template `page.story`) |

**Empty categories are hidden automatically.** The header and footer skip any menu
link that points to a collection with no products:

```liquid
{%- if link.type == 'collection_link' and link.object.products_count == 0 -%}{%- continue -%}{%- endif -%}
```

So you can add **Unisex** or a seasonal collection (e.g. "Winter 26") to the menu now.
It appears only when the collection has at least one published product.

Suggested smart collections (Products → Collections → Create, condition "Product type is …"):

- Tops — type = Tops
- Bottoms — type = Bottoms
- Matching Sets — product tag = `matching-set` (tag each set product)
- Launch Collection — tag = `launch-collection` (used by the homepage)
- Unisex (later) — tag = `unisex`

## `footer` (help links; also the side menu on help pages)

Contact · Size Guide · Delivery & Returns · FAQs · Privacy & Cookies · Terms & Conditions

Page templates: Contact → `page.contact`, Size Guide → `page.size-guide`, Our Story → `page.story`,
all others → default `page`. Privacy and Terms can also come from **Settings → Policies**. The
footer already lists those policies automatically.

## Filters

Install the free **Shopify Search & Discovery** app and add these filters: Availability, Price,
Color (product option), Size (product option). The collection page shows only filters that are
configured.
