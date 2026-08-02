import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/icons';
import {
  adjustStock,
  createCategory,
  createProduct,
  getAdminProducts,
  getCategories,
  mediaUrl,
  updateProduct,
  uploadProductImage,
  type AdminProduct,
  type Category,
} from '../lib/api';
import { formatPrice } from '../lib/format';

const DEFAULT_SIZES = 'EU 40, EU 41, EU 42, EU 43, EU 44';

interface Draft {
  id: string | null; // null = new product
  name: string;
  categoryId: string;
  description: string;
  price: string;
  costPrice: string;
  color: string;
  sizes: string;
  stock: string;
  isPublished: boolean;
  existingImages: Array<{ url: string }>;
}

function emptyDraft(categoryId: string): Draft {
  return {
    id: null,
    name: '',
    categoryId,
    description: '',
    price: '',
    costPrice: '',
    color: 'Black',
    sizes: DEFAULT_SIZES,
    stock: '0',
    isPublished: true,
    existingImages: [],
  };
}

export function Products() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [newType, setNewType] = useState<string | null>(null); // null = hidden
  const fileInput = useRef<HTMLInputElement>(null);

  async function load() {
    const [p, c] = await Promise.all([getAdminProducts(), getCategories()]);
    setProducts(p);
    setCategories(c);
  }

  useEffect(() => {
    load();
  }, []);

  // Object URLs for photo previews; revoke on change.
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products;
  }, [products, query]);

  function openNew() {
    setNotice(null);
    setFiles([]);
    setDraft(emptyDraft(categories[0]?.id ?? ''));
  }

  function openEdit(p: AdminProduct) {
    setNotice(null);
    setFiles([]);
    setDraft({
      id: p.id,
      name: p.name,
      categoryId: p.category?.id ?? categories[0]?.id ?? '',
      description: p.description ?? '',
      price: p.variants[0] ? String(Number(p.variants[0].price)) : '',
      costPrice: '',
      color: p.variants[0]?.color ?? 'Black',
      sizes: p.variants.map((v) => v.size).join(', ') || DEFAULT_SIZES,
      stock: '',
      isPublished: p.isPublished,
      existingImages: p.images,
    });
  }

  async function addType() {
    const name = (newType ?? '').trim();
    if (!name) return;
    const created = await createCategory(name);
    if (created) {
      setCategories((prev) => [...prev, created]);
      setDraft((d) => (d ? { ...d, categoryId: created.id } : d));
      setNewType(null);
    } else {
      setNotice({ kind: 'err', text: `Could not create type "${name}" — it may already exist.` });
    }
  }

  async function save() {
    if (!draft || busy) return;
    setNotice(null);

    if (!draft.name.trim()) return setNotice({ kind: 'err', text: 'Give the shoe a name.' });
    if (!draft.categoryId) return setNotice({ kind: 'err', text: 'Pick or create a shoe type.' });

    setBusy(true);
    try {
      if (draft.id === null) {
        // ── create ──
        const price = Number(draft.price.replace(/[^0-9.]/g, ''));
        if (!price || price <= 0) {
          setNotice({ kind: 'err', text: 'Enter a valid price.' });
          return;
        }
        const cost = Number(draft.costPrice.replace(/[^0-9.]/g, '')) || Math.round(price * 0.6);
        const sizes = draft.sizes.split(',').map((s) => s.trim()).filter(Boolean);
        if (!sizes.length) {
          setNotice({ kind: 'err', text: 'Enter at least one size.' });
          return;
        }

        const result = await createProduct({
          name: draft.name.trim(),
          categoryId: draft.categoryId,
          description: draft.description.trim(),
          price,
          costPrice: cost,
          color: draft.color.trim() || 'Black',
          sizes,
          isPublished: draft.isPublished,
        });
        if (!result.ok || !result.product) {
          setNotice({ kind: 'err', text: result.error ?? 'Create failed' });
          return;
        }

        let uploaded = 0;
        for (const file of files) {
          if (await uploadProductImage(result.product.id, file, draft.name.trim())) uploaded++;
        }

        const stock = Number(draft.stock.replace(/[^0-9]/g, '')) || 0;
        if (stock > 0) {
          for (const v of result.product.variants) await adjustStock(v.id, stock);
        }

        setNotice({
          kind: 'ok',
          text:
            `Created ${draft.name.trim()}` +
            (uploaded ? ` with ${uploaded} photo${uploaded > 1 ? 's' : ''}` : '') +
            (stock ? ` · ${stock} pairs per size` : '') +
            '.',
        });
      } else {
        // ── edit ──
        const ok = await updateProduct(draft.id, {
          name: draft.name.trim(),
          description: draft.description.trim(),
          categoryId: draft.categoryId,
          isPublished: draft.isPublished,
        });
        if (!ok) {
          setNotice({ kind: 'err', text: 'Update failed' });
          return;
        }
        let uploaded = 0;
        for (const file of files) {
          if (await uploadProductImage(draft.id, file, draft.name.trim())) uploaded++;
        }
        setNotice({
          kind: 'ok',
          text: `Saved ${draft.name.trim()}` + (uploaded ? ` · added ${uploaded} photo${uploaded > 1 ? 's' : ''}` : '') + '.',
        });
      }
      setDraft(null);
      setFiles([]);
      await load();
    } finally {
      setBusy(false);
    }
  }

  // ── editor ──
  if (draft) {
    const isNew = draft.id === null;
    return (
      <div className="content">
        <div className="topbar">
          <div>
            <h1>{isNew ? 'Add product' : `Edit — ${draft.name || 'product'}`}</h1>
            <p>{isNew ? 'Photos, description, type, price and stock — all manual.' : 'Update details or add more photos.'}</p>
          </div>
          <div className="top-actions">
            <button className="btn-line" onClick={() => setDraft(null)} disabled={busy}>
              ← Back to products
            </button>
            <button className="btn-dark" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
            </button>
          </div>
        </div>

        {notice && <div className={`form-notice ${notice.kind}`}>{notice.text}</div>}

        <div className="editor-card">
          {/* photos */}
          <div className="field-block">
            <label className="field-label">Photos</label>
            <div className="photo-strip">
              {draft.existingImages.map((img, i) => (
                <img key={`e${i}`} src={mediaUrl(img.url)} alt="" className="photo-thumb" />
              ))}
              {previews.map((src, i) => (
                <div key={`p${i}`} className="photo-thumb-wrap">
                  <img src={src} alt="" className="photo-thumb" />
                  <button
                    className="photo-remove"
                    aria-label="Remove photo"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button className="photo-add" onClick={() => fileInput.current?.click()}>
                <Icon name="products" size={18} />
                Add photos
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const chosen = Array.from(e.target.files ?? []);
                  if (chosen.length) setFiles((prev) => [...prev, ...chosen]);
                  e.target.value = '';
                }}
              />
            </div>
            <p className="field-hint">First photo becomes the main image on the website.</p>
          </div>

          <div className="form-grid">
            <div className="field-block">
              <label className="field-label" htmlFor="p-name">Name</label>
              <input
                id="p-name"
                className="field-input"
                placeholder="e.g. Patan Loafer"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>

            <div className="field-block">
              <label className="field-label" htmlFor="p-type">Shoe type</label>
              {newType === null ? (
                <div className="type-row">
                  <select
                    id="p-type"
                    className="field-input"
                    value={draft.categoryId}
                    onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button className="btn-line" onClick={() => setNewType('')}>+ New type</button>
                </div>
              ) : (
                <div className="type-row">
                  <input
                    className="field-input"
                    placeholder="e.g. Sports, Loafers, Sandals…"
                    value={newType}
                    autoFocus
                    onChange={(e) => setNewType(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addType()}
                  />
                  <button className="btn-dark" onClick={addType}>Add</button>
                  <button className="btn-line" onClick={() => setNewType(null)}>Cancel</button>
                </div>
              )}
            </div>

            <div className="field-block">
              <label className="field-label" htmlFor="p-price">Price (Rs.)</label>
              <input
                id="p-price"
                className="field-input"
                placeholder="4500"
                inputMode="numeric"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                disabled={!isNew}
                title={isNew ? undefined : 'Price editing for existing variants comes later'}
              />
            </div>

            <div className="field-block">
              <label className="field-label" htmlFor="p-cost">Cost price (Rs., optional)</label>
              <input
                id="p-cost"
                className="field-input"
                placeholder="auto: 60% of price"
                inputMode="numeric"
                value={draft.costPrice}
                onChange={(e) => setDraft({ ...draft, costPrice: e.target.value })}
                disabled={!isNew}
              />
            </div>

            <div className="field-block">
              <label className="field-label" htmlFor="p-color">Color</label>
              <input
                id="p-color"
                className="field-input"
                value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                disabled={!isNew}
              />
            </div>

            <div className="field-block">
              <label className="field-label" htmlFor="p-sizes">Sizes (comma separated)</label>
              <input
                id="p-sizes"
                className="field-input"
                value={draft.sizes}
                onChange={(e) => setDraft({ ...draft, sizes: e.target.value })}
                disabled={!isNew}
              />
            </div>

            {isNew && (
              <div className="field-block">
                <label className="field-label" htmlFor="p-stock">Opening stock (pairs per size)</label>
                <input
                  id="p-stock"
                  className="field-input"
                  placeholder="0"
                  inputMode="numeric"
                  value={draft.stock}
                  onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
                />
              </div>
            )}

            <div className="field-block">
              <label className="field-label">Visibility</label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={draft.isPublished}
                  onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })}
                />
                Published on the website
              </label>
            </div>
          </div>

          <div className="field-block">
            <label className="field-label" htmlFor="p-desc">Description</label>
            <textarea
              id="p-desc"
              className="field-input field-textarea"
              placeholder="Full-grain leather upper, hand-finished in our Kathmandu workshop…"
              rows={4}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
            <p className="field-hint">Shown on the product page. Leave empty to fill in later.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── list ──
  return (
    <div className="content">
      <div className="topbar">
        <div>
          <h1>Products</h1>
          <p>{products.length} product{products.length === 1 ? '' : 's'} in the catalog</p>
        </div>
        <div className="top-actions">
          <div className="search-box">
            <Icon name="search" size={15} />
            <input
              placeholder="Search products…"
              aria-label="Search products"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="btn-dark" onClick={openNew}>+ Add product</button>
        </div>
      </div>

      {notice && <div className={`form-notice ${notice.kind}`}>{notice.text}</div>}

      {visible.length === 0 ? (
        <p className="table-empty" style={{ padding: '48px 0' }}>
          {products.length === 0
            ? 'No products yet — click "+ Add product" to create your first one.'
            : 'Nothing matches your search.'}
        </p>
      ) : (
        <div className="prod-grid">
          {visible.map((p) => {
            const stock = p.variants.reduce((s, v) => s + v.stockQty, 0);
            const price = p.variants[0] ? Number(p.variants[0].price) : 0;
            return (
              <button key={p.id} className="prod-card" onClick={() => openEdit(p)}>
                <div className="prod-thumb">
                  {p.images[0] ? (
                    <img src={mediaUrl(p.images[0].url)} alt="" />
                  ) : (
                    <span className="prod-thumb-empty">no photo</span>
                  )}
                </div>
                <div className="prod-meta">
                  <b>{p.name}</b>
                  <span>{p.category?.name ?? '—'} · {formatPrice(price)}</span>
                  <span className={stock === 0 ? 'prod-stock out' : 'prod-stock'}>
                    {stock} in stock{p.isPublished ? '' : ' · draft'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
