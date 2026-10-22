# TKX London — storefront

**EVERYDAY IN MOTION.** Considered comfort. Confident style.

This repository contains the TKX London Shopify theme and a static review preview, plus setup, commercial and handover documents.

> **Status (22 October 2026):** built and tested locally. **No Shopify store is connected.** Nothing has been published, no payments are active, and no emails or forms send anywhere yet. Product data, prices, stock and imagery are **development fixtures**.

## What's here

| Path | What it is |
|---|---|
| `theme/` | Custom, lean Online Store 2.0 Shopify theme: sections and blocks throughout, JSON templates, and editable settings including the owner's **Store mode** switch. Passes Shopify Theme Check (68 files, 0 offences). |
| `preview/` | Static clickable preview that uses the theme's CSS and fixture data. Open `preview/index.html` in a browser; no server or build is needed. A yellow bar marks it as **not a live store** and lets you switch store modes. |
| `shopify-setup/` | Metafield definitions, navigation setup, and a **draft-only** fixture product CSV with its generator. |
| `docs/` | [Setup guide](docs/SETUP-GUIDE.md) · [Currency capability](docs/CURRENCY-CAPABILITY.md) · [Proposal](docs/PROPOSAL.md) · [Owner guide](docs/OWNER-GUIDE.md) · [Assets & licences](docs/ASSET-CHECKLIST.md) · [Test report](docs/TEST-REPORT.md) |
| `tests/` | Automated browser tests: the preview (66 checks) and the theme JavaScript against mocked Shopify cart endpoints (16 checks). |

## Design direction

- **Palette:** warm ivory, black and charcoal, with chocolate, taupe and muted olive as restrained accents.
- **Type:** bold, slightly expanded Archivo headings with calm DM Sans body text.
- **Layout:** square corners, generous whitespace, no gradients or busy backgrounds.
- **Page rhythm:** a full-bleed campaign hero, then a clean four-up product grid, a "Shop the Look" outfit builder, macro detail tiles, an asymmetric lifestyle editorial grid, the story, and a dark sign-up and footer band.
- **Motion:** subtle hover image swaps and fade-ins only, all switched off under `prefers-reduced-motion`.

**Reference assets:** none were supplied with the brief, and no TKX logo, emblem or reference images exist in the workspace. I inspected none, so none informed the design.
- **Header:** a temporary text wordmark until the approved logo is uploaded (Theme settings → Logo).
- **Favicon:** a temporary "TKX" tile; the approved emblem replaces it (Theme settings → Favicon / Emblem).
- **Emblem:** not redrawn anywhere.

## Quick start

- **Review the preview:** open `preview/index.html`. Use the yellow bar to switch between *Pre-launch (password page)*, *Owner preview* and *Full store*.
- **Run the tests:** see [tests/README.md](tests/README.md).
- **Install on Shopify:** follow [docs/SETUP-GUIDE.md](docs/SETUP-GUIDE.md). This needs the owner's store and collaborator access.

## Outstanding before launch

The full list, with owners and dates, is in [docs/SETUP-GUIDE.md § Outstanding tasks](docs/SETUP-GUIDE.md#outstanding-tasks). The headline items:

- **Owner's Shopify store**
  - Create the store on the owner's account, with collaborator access for the developer.
  - Complete Shopify Payments verification.
- **Approved artwork and photography:** logo, emblem, product photography and campaign photography or video.
- **Product information:** confirmed garment specs (fabric, care, measurements, fit, model details), prices and stock.
- **Policies and operations:** shipping destinations, rates and duties treatment; returns policy; legal policies.
- **Live payment tests:** a test order in each currency, especially **NGN**, before any naira payment wording is relaxed.
