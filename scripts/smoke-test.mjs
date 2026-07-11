/**
 * End-to-end smoke test against a running API + database.
 *
 *   node scripts/smoke-test.mjs
 *
 * Exercises the core business flow: login → catalog → place an online
 * order (stock reserved via ledger) → advance it through the state
 * machine → ring a POS sale → check reports and the inventory ledger.
 * Env: API_URL, ADMIN_EMAIL, ADMIN_PASSWORD (defaults match .env.example).
 */
const API = process.env.API_URL ?? 'http://localhost:4000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'owner@blackhorse.shoes';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'BlackHorse2026!';

let failures = 0;
function check(name, cond, detail = '') {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failures++;
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function req(method, path, { body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

// 1. Login
const login = await req('POST', '/auth/login', {
  body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
});
check('auth: owner login', login.status === 200 && !!login.json?.accessToken);
const token = login.json?.accessToken;

// 2. Public catalog
const products = await req('GET', '/products?publishedOnly=true');
check(
  'catalog: published products listed',
  products.status === 200 && products.json?.items?.length >= 4,
  `${products.json?.items?.length ?? 0} products`,
);
const runner = products.json.items.find((p) => p.slug === 'kathmandu-runner');
const variant = runner?.variants.find((v) => v.stockQty >= 3);
check('catalog: variant with stock found', !!variant, variant?.sku);
const stockBefore = variant.stockQty;

// 3. Place an online order (public checkout)
const order = await req('POST', '/orders', {
  body: {
    customer: { name: 'Smoke Tester', phone: '+977-9800000001', email: 'smoke@test.local' },
    address: { line1: 'Jhamsikhel', city: 'Lalitpur', district: 'Lalitpur' },
    items: [{ variantId: variant.id, quantity: 2 }],
    paymentMethod: 'COD',
  },
});
check('orders: online order placed', order.status === 201, order.json?.orderNumber);
check(
  'orders: server-side pricing',
  Number(order.json?.total) === Number(variant.price) * 2,
  `total ${order.json?.total}`,
);

// 4. Stock was reserved through the ledger
const after = await req('GET', `/products/slug/kathmandu-runner`);
const variantAfter = after.json?.variants.find((v) => v.id === variant.id);
check(
  'inventory: stock decremented by order',
  variantAfter?.stockQty === stockBefore - 2,
  `${stockBefore} → ${variantAfter?.stockQty}`,
);
const ledger = await req('GET', `/inventory/${variant.id}/movements`, { token });
check(
  'inventory: ONLINE_ORDER movement appended',
  ledger.status === 200 && ledger.json?.[0]?.type === 'ONLINE_ORDER' && ledger.json?.[0]?.delta === -2,
);

// 5. Order state machine
const confirm = await req('PATCH', `/orders/${order.json.id}/status`, {
  token,
  body: { status: 'CONFIRMED' },
});
check('orders: PENDING → CONFIRMED allowed', confirm.status === 200);
const illegal = await req('PATCH', `/orders/${order.json.id}/status`, {
  token,
  body: { status: 'DELIVERED' },
});
check('orders: CONFIRMED → DELIVERED rejected', illegal.status === 400);

// 6. Cancel restocks automatically
const cancel = await req('PATCH', `/orders/${order.json.id}/status`, {
  token,
  body: { status: 'CANCELLED' },
});
check('orders: CONFIRMED → CANCELLED allowed', cancel.status === 200);
const restocked = await req('GET', `/products/slug/kathmandu-runner`);
check(
  'inventory: cancellation restocked',
  restocked.json?.variants.find((v) => v.id === variant.id)?.stockQty === stockBefore,
);

// 7. POS sale
const sale = await req('POST', '/pos/sales', {
  token,
  body: {
    items: [{ variantId: variant.id, quantity: 1 }],
    paymentMethod: 'CASH',
    tenderedAmount: Number(variant.price) + 550,
  },
});
check('pos: sale recorded', sale.status === 201, sale.json?.saleNumber);
check('pos: change computed', Number(sale.json?.changeAmount) === 550);
check(
  'pos: VAT 13% included',
  Math.abs(Number(sale.json?.vatAmount) - (Number(variant.price) * 0.13) / 1.13) < 1,
  `vat ${sale.json?.vatAmount}`,
);

// 8. Oversell guard — quantity passes DTO validation (≤20) but exceeds stock
const oversell = await req('POST', '/pos/sales', {
  token,
  body: { items: [{ variantId: variant.id, quantity: 20 }], paymentMethod: 'CASH' },
});
check('inventory: oversell rejected', oversell.status === 409, `status ${oversell.status}`);

// 9. Reports
const salesReport = await req('GET', '/reports/sales', { token });
check(
  'reports: sales report includes POS sale',
  salesReport.status === 200 && Number(salesReport.json?.pos?.total) >= Number(variant.price),
);
const lowStock = await req('GET', '/reports/low-stock', { token });
check('reports: low stock query works', lowStock.status === 200 && Array.isArray(lowStock.json));

// 10. Security
const noAuth = await req('GET', '/reports/sales');
check('security: reports blocked without JWT', noAuth.status === 401);

console.log(failures === 0 ? '\nAll smoke tests passed.' : `\n${failures} test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
