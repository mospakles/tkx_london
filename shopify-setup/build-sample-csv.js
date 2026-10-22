#!/usr/bin/env node
/*
  Builds sample-products.csv (Shopify product import format) from the preview
  fixtures in preview/data/catalogue.js.

  These are DEVELOPMENT FIXTURES: every product is imported as a draft,
  unpublished and tagged "dev-fixture" so it never reaches live checkout.
  Delete them (filter by tag dev-fixture) before launch.

  Usage: node shopify-setup/build-sample-csv.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'preview', 'data', 'catalogue.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(src, sandbox);
const data = sandbox.window.TKX_DATA;

const columns = [
  'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published',
  'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value',
  'Variant SKU', 'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy',
  'Variant Fulfillment Service', 'Variant Price', 'Variant Requires Shipping', 'Variant Taxable',
  'Gift Card', 'SEO Title', 'SEO Description', 'Status'
];

function cell(v) {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const rows = [];
for (const p of data.products) {
  let first = true;
  for (const colourKey of p.colours) {
    const colour = data.colours[colourKey].label;
    const preorder = p.preorder && p.preorder[colourKey];
    for (const size of data.sizes) {
      const row = {
        'Handle': p.handle,
        'Option1 Value': colour,
        'Option2 Value': size,
        'Variant SKU': ('TKX-' + p.handle.split('-').map(w => w[0]).join('') + '-' + colourKey.slice(0, 3) + '-' + size).toUpperCase(),
        'Variant Inventory Tracker': 'shopify',
        'Variant Inventory Qty': p.stock[colourKey][size],
        'Variant Inventory Policy': preorder ? 'continue' : 'deny',
        'Variant Fulfillment Service': 'manual',
        'Variant Price': p.price.toFixed(2),
        'Variant Requires Shipping': 'TRUE',
        'Variant Taxable': 'TRUE'
      };
      if (first) {
        Object.assign(row, {
          'Title': p.title,
          'Body (HTML)': '<p>' + p.summary + '</p><p>[DEV FIXTURE — replace with approved copy]</p>',
          'Vendor': 'TKX London',
          'Type': p.type,
          'Tags': ['dev-fixture', 'launch-collection', p.type.toLowerCase()].join(', '),
          'Published': 'FALSE',
          'Option1 Name': 'Color',
          'Option2 Name': 'Size',
          'Gift Card': 'FALSE',
          'SEO Title': p.title + ' | TKX London',
          'SEO Description': p.summary,
          'Status': 'draft'
        });
        first = false;
      }
      rows.push(row);
    }
  }
}

const out = [columns.join(',')].concat(rows.map(r => columns.map(c => cell(r[c])).join(','))).join('\n') + '\n';
fs.writeFileSync(path.join(__dirname, 'sample-products.csv'), out);
console.log('Wrote ' + rows.length + ' variant rows for ' + data.products.length + ' draft fixture products.');
