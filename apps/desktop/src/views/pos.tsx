import { useEffect, useMemo, useState } from 'react';
import { completeSale, getPosProducts, mediaUrl, type PosProduct } from '../lib/api';
import { formatPrice } from '../lib/format';
import { Icon } from '../components/icons';

interface CartLine {
  product: PosProduct;
  quantity: number;
}

type PayMethod = 'CASH' | 'FONEPAY' | 'CARD';

/** Nepal VAT (13%), included in retail prices: total × r ÷ (1 + r). */
function includedVat(total: number): number {
  return Math.round((total * 0.13) / 1.13);
}

export function Pos() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [live, setLive] = useState(false);
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<PayMethod>('CASH');
  const [tendered, setTendered] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    getPosProducts().then(({ items, live }) => {
      setProducts(items);
      setLive(live);
    });
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products;
  }, [products, query]);

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const total = subtotal;
  const vat = includedVat(total);
  const tenderedNum = Number(tendered.replace(/[^0-9]/g, '')) || 0;
  const change = Math.max(0, tenderedNum - total);

  function addLine(product: PosProduct) {
    setNotice(null);
    setLines((prev) => {
      const existing = prev.find((l) => l.product.variantId === product.variantId);
      if (existing) {
        return prev.map((l) =>
          l.product.variantId === product.variantId
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function setQty(variantId: string, quantity: number) {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.product.variantId !== variantId)
        : prev.map((l) => (l.product.variantId === variantId ? { ...l, quantity } : l)),
    );
  }

  async function finish() {
    if (!lines.length || busy) return;
    setBusy(true);
    setNotice(null);
    const result = await completeSale({
      items: lines.map((l) => ({ variantId: l.product.variantId, quantity: l.quantity })),
      paymentMethod: payment,
      tenderedAmount: payment === 'CASH' && tenderedNum > 0 ? tenderedNum : undefined,
    });
    setBusy(false);
    if (result.ok) {
      setLines([]);
      setTendered('');
      setNotice({ kind: 'ok', text: `Sale ${result.saleNumber} recorded.` });
    } else {
      setNotice({ kind: 'err', text: result.error ?? 'Sale failed' });
    }
  }

  return (
    <div className="pos-split">
      <div className="catalog">
        <div className="topbar">
          <div>
            <h1>Point of Sale</h1>
            <p>
              Register 1 · Thamel flagship
              {!live && <span className="offline-chip">offline data</span>}
            </p>
          </div>
          <div className="top-actions">
            <button className="btn-line">Hold sale</button>
            <button className="btn-line">Recent sales</button>
          </div>
        </div>

        <div className="search-box pos-search">
          <Icon name="search" size={15} />
          <input
            placeholder="Scan barcode or search products…"
            aria-label="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd>F2</kbd>
        </div>

        {products.length === 0 && (
          <p className="table-empty" style={{ padding: '48px 0' }}>
            No products yet — send a photo to the Telegram bot with a caption like
            &quot;new: Patan Loafer, 4500, formal, stock 10&quot; to create one.
          </p>
        )}
        <div className="tiles">
          {visible.map((p) => (
            <button
              className="tile"
              key={p.variantId}
              onClick={() => addLine(p)}
              aria-label={`Add ${p.name} to sale`}
            >
              <span className="tile-img">
                {p.imageUrl ? (
                  <img src={mediaUrl(p.imageUrl)} alt="" />
                ) : (
                  <svg viewBox="0 0 560 260" fill="none" aria-hidden="true">
                    <path
                      d="M30 210 C40 160 90 140 140 130 C195 118 240 88 275 58 C295 41 313 36 330 48 C365 74 420 108 470 122 C510 133 535 152 538 185 C540 202 528 212 505 214 L60 220 C40 220 26 218 30 210 Z"
                      fill="#CFCFCF"
                    />
                    <path
                      d="M28 216 L540 208 C544 222 536 232 516 233 L58 238 C38 238 24 230 28 216 Z"
                      fill="#BABABA"
                    />
                  </svg>
                )}
              </span>
              <b>{p.name}</b>
              <span className="meta">
                <span className="p">{formatPrice(p.price)}</span>
                <span className={`stk${p.stockQty <= 5 ? ' low' : ''}`}>
                  {p.stockQty <= 5 ? `${p.stockQty} left` : `${p.stockQty} in stock`}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <aside className="cart" aria-label="Current sale">
        <div className="cart-head">
          <h2>
            Current sale <span>{lines.length ? `${lines.length} lines` : 'empty'}</span>
          </h2>
          <button className="customer">
            <Icon name="customers" size={15} />
            Add customer (optional)
          </button>
        </div>

        <div className="lines">
          {lines.length === 0 && (
            <p className="cart-empty">Tap a product to start a sale.</p>
          )}
          {lines.map((l) => (
            <div className="line" key={l.product.variantId}>
              <div>
                <b>{l.product.name}</b>
                <small>
                  {l.product.color} · {l.product.size}
                </small>
              </div>
              <div className="line-right">
                <span className="amt">{formatPrice(l.product.price * l.quantity)}</span>
                <span className="qty">
                  <button onClick={() => setQty(l.product.variantId, l.quantity - 1)} aria-label="Decrease">
                    –
                  </button>
                  <span>{l.quantity}</span>
                  <button onClick={() => setQty(l.product.variantId, l.quantity + 1)} aria-label="Increase">
                    +
                  </button>
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="totals">
          <div className="trow">
            <span>Subtotal · {lines.reduce((n, l) => n + l.quantity, 0)} items</span>
            <b>{formatPrice(subtotal)}</b>
          </div>
          <div className="trow">
            <span>VAT 13% (included)</span>
            <b>{formatPrice(vat)}</b>
          </div>
          <div className="trow total">
            <span>Total</span>
            <b>{formatPrice(total)}</b>
          </div>
        </div>

        <div className="pay">
          <div className="pay-methods">
            {(['CASH', 'FONEPAY', 'CARD'] as const).map((m) => (
              <button
                key={m}
                className="pm"
                aria-pressed={payment === m}
                onClick={() => setPayment(m)}
              >
                {m === 'CASH' ? 'Cash' : m === 'FONEPAY' ? 'Fonepay' : 'Card'}
              </button>
            ))}
          </div>
          {payment === 'CASH' && (
            <div className="tender">
              <label>
                Tendered
                <input
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  placeholder="Rs."
                  aria-label="Amount tendered"
                />
              </label>
              <label>
                Change
                <input className="change" value={formatPrice(change)} readOnly aria-label="Change due" />
              </label>
            </div>
          )}
          {notice && <p className={`pos-notice ${notice.kind}`}>{notice.text}</p>}
          <button className="complete" onClick={finish} disabled={!lines.length || busy}>
            {busy ? 'Recording…' : `Complete sale — ${formatPrice(total)}`}
          </button>
          <p className="hold-note">F9 hold · F10 discount · F12 complete</p>
        </div>
      </aside>
    </div>
  );
}
