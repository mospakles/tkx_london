# Five-currency capability

Prepared 22 October 2026 for the TKX London owner, from Shopify's official help pages (sources at the end). Most Shopify help pages carry no date, so treat every fact as **"seen 22 Oct 2026"** and re-check in the admin before going live.

**Assumption:** TKX London is a **UK-registered merchant** using **Shopify Payments**. This is unconfirmed; see Outstanding task #3. If the business is registered elsewhere, this table changes.

## Key terms

| Term | What it means |
|---|---|
| **Display currency** | The currency shown on product, collection and bag pages. The theme can show any currency the store has enabled. |
| **Payment currency** | The currency the customer is actually charged in at checkout. With Shopify Payments this is the market's local currency, *if* that currency is supported and enabled. Otherwise it's the store currency (GBP). |
| **Settlement currency** | The currency paid out to the owner's bank. |

## Capability table

| Currency | Display | Payment at checkout | Merchant settlement | Status |
|---|---|---|---|---|
| **GBP £** | Yes | Yes (store currency) | GBP | Supported |
| **USD $** | Yes | Yes: on Shopify Payments' supported presentment-currency list | GBP. USD payouts are possible only on the **Advanced** or **Plus** plans, need a USD bank account, and carry a fee. | Supported; test before launch |
| **EUR €** | Yes | Yes: on the supported list | GBP. EUR payouts need Advanced/Plus. | Supported; test before launch |
| **CAD CA$** | Yes | Yes: on the supported list | GBP. CAD payouts need Advanced/Plus. | Supported; test before launch |
| **NGN ₦** | Yes | **Listed** as a supported presentment currency. The only restriction noted is for merchants in France. **Not yet verified in practice:** whether Nigerian-issued cards are accepted, and which payment methods are offered at an NGN checkout. | GBP. **NGN is not a payout currency.** | **Unverified. Test with a real order before promising naira payment.** |

**What the site says to customers until NGN is tested:**

> Prices are shown in your selected currency. If a currency can't be used for payment, checkout will show the amount in GBP before you pay.

A naira price on a product page is a **display conversion only**. It isn't evidence that customers can pay in naira.

**Fallback if NGN checkout fails in testing:**
- Keep NGN as a display currency, or remove it from the Nigeria market so Nigerian customers see and pay GBP.
- Keep the note above either way.

**Local Nigerian gateways:**
- **Paystack** is only available to businesses registered in Nigeria, Ghana, South Africa or Kenya, so it isn't available to a UK-only entity.
- **Flutterwave**'s eligibility for UK merchants is **unverified**.
- Using either would also add Shopify's third-party gateway fee (2% on the Basic plan).

## Pricing controls

| Topic | How it works (Shopify Payments, UK store) |
|---|---|
| **Regional price controls** | Per market: automatic conversion, a manual exchange rate, or fixed prices per product. Shopify lists "Product catalog customization" and "Currencies per market" for every plan. |
| **Exchange-rate management** | Automatic rates update with the market. Manual rates are set per market (not for the primary market). Fixed prices override rates. |
| **Rounding rules** | Applied after conversion, per market. For example, €8.81 can round to €8.85. Set them in each market's pricing settings. |
| **Conversion charges** | **2%** currency-conversion fee for UK stores. With automatic rates it's built into the converted price the customer sees; with manual rates it comes out of the payout. It isn't returned on refunds (from search snippets; confirm in the admin). |
| **Card processing (Basic plan)** | 2% + 25p for standard UK cards; 3.1% + 25p for Amex and international cards. |
| **Additional setup cost** | No app needed: Markets is built in. The developer's configuration and testing time is priced separately in [PROPOSAL.md](PROPOSAL.md). |
| **Recurring cost** | None beyond the Shopify plan and the transaction and conversion fees above. **Multi-currency payouts** (Advanced plan, £259–£344 a month) aren't needed: all currencies settle in GBP. |
| **Discount limits** | Fixed-amount discounts and post-purchase offers work only in the store's default currency (GBP). Percentage discounts work in every currency. |

## Consistency across product, bag and checkout

- **Same currency throughout:** product, bag and checkout prices all come from Shopify's converted presentment prices, so they match when the currency is enabled for payment.
- **Fallback before payment:** if a currency can't be charged, Shopify checkout shows the amount in GBP before payment. The bag note warns about this in advance.
- **Preview only:** the static preview uses fixed indicative rates for demonstration and labels them that way.

## Location and redirects

- **No forced redirects.** Shopify's Geolocation app was retired (no new installs from 1 Feb 2025; shut down 24 Mar 2025). Its replacement, *Automatic redirection*, force-redirects visitors, which the brief rules out, so **leave it off**.
- **Suggestion instead:** the theme shows a dismissible suggestion ("Shopping from Canada? View prices in CAD"), and the customer can change country at any time from the header or footer selector.
- **Currency is not delivery:** choosing a currency doesn't confirm delivery to that country. Shipping zones decide which addresses checkout accepts.

## Before enabling live payments

- [ ] Merchant business country and legal entity confirmed.
- [ ] Shopify Payments account verified: identity, bank, and the business type is eligible.
- [ ] Markets created **only** for countries you'll ship to.
- [ ] Local currency enabled per market; rounding reviewed.
- [ ] Settlement confirmed as GBP; payout schedule understood.
- [ ] Shipping zones and rates set for every market.
- [ ] Test order in GBP, USD, EUR, CAD and **NGN** (card plus one express method each), then refund. Record which currency was actually charged.
- [ ] NGN result recorded here, and customer wording updated **only** if naira checkout is confirmed.

## Sources

Checked 22 Oct 2026:
- Pricing (UK): https://www.shopify.com/uk/pricing
- Local currencies and conversion fee: https://help.shopify.com/en/manual/markets/customizations/local-currencies
- Supported presentment currencies: https://help.shopify.com/en/manual/international/pricing/supported-currencies
- Markets requirements by plan: https://help.shopify.com/en/manual/markets/getting-started/requirements-and-considerations
- Exchange rates and rounding: https://help.shopify.com/en/manual/international/pricing/exchange-rates
- UK payouts: https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries/united-kingdom/payouts
- Payout currencies: https://help.shopify.com/en/manual/payments/shopify-payments/store-currency/supported-payout-currencies
- UK payment methods: https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries/united-kingdom/payment-methods
- Geolocation app retirement: https://help.shopify.com/en/manual/markets/international-domains/directing-customers/geolocation
- Automatic redirection: https://help.shopify.com/en/manual/international/automatic-redirection
- Paystack eligibility: https://support.paystack.com/en/articles/2130562
