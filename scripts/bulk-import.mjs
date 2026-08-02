/**
 * Bulk product import: turns a folder of shoe photos into live products.
 *
 *   node scripts/bulk-import.mjs [folder] [--min 3200] [--max 5200] [--stock 10]
 *
 * Folder layout (default C:\Users\Administrator\Desktop\new-shoes):
 *   - each SUBFOLDER = one shoe, every image inside is an angle of it
 *   - each loose image in the root = one shoe with a single photo
 *
 * For every shoe the AI (OpenRouter free tier / Gemini / Claude — whichever
 * key exists in .env) looks at the photos and writes: name, type (category),
 * color, a simple description and an alt caption. Price is random within the
 * range, rounded to Rs. 100. Products are created published with opening
 * stock per size (EU 40-44).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

process.loadEnvFile(new URL('../.env', import.meta.url));

const API = process.env.API_URL ?? 'http://localhost:4000/api';
const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : def;
};
const FOLDER = args.find((a) => !a.startsWith('--')) ?? 'C:/Users/Administrator/Desktop/new-shoes';
const MIN = flag('min', 3200);
const MAX = flag('max', 5200);
const STOCK = flag('stock', 10);
const SIZES = ['EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44'];
const IMG_RE = /\.(jpe?g|png|webp|jfif)$/i;

const SYSTEM_PROMPT =
  'You write product listings for Black Horse Shoe, a premium footwear brand hand-crafting ' +
  'leather shoes in Kathmandu, Nepal. Voice: minimal luxury, confident, concrete — describe ' +
  'what is actually visible in the photos. No clichés, no exclamation marks, no emoji.';

// ── helpers ──────────────────────────────────────────────────────────────

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const randPrice = () => Math.round((MIN + Math.random() * (MAX - MIN)) / 100) * 100;

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.BOT_ADMIN_EMAIL,
      password: process.env.BOT_ADMIN_PASSWORD,
    }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  return (await res.json()).accessToken;
}

async function api(token, method, p, body) {
  const res = await fetch(`${API}${p}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// ── AI listing generation ────────────────────────────────────────────────

async function freeVisionModels() {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  const body = await res.json();
  return body.data
    .filter(
      (m) =>
        m.id.endsWith(':free') &&
        !m.id.includes('safety') &&
        m.architecture?.input_modalities?.includes('image'),
    )
    .map((m) => m.id)
    .sort((a, b) => Number(b.includes('gemma')) - Number(a.includes('gemma')));
}

function parseLooseJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const p = JSON.parse(match[0]);
    return p && p.name && p.description ? p : null;
  } catch {
    return null;
  }
}

const LISTING_PROMPT =
  'Look at the shoe in these photos and write its listing. Respond with ONLY a JSON object:\n' +
  '{"name": "<2-3 word product name, e.g. Thamel Derby, no brand name>",' +
  ' "type": "<one word category: Sneakers|Formal|Boots|Loafers|Sports|Sandals>",' +
  ' "color": "<main color, 1-2 words>",' +
  ' "description": "<2 simple sentences describing the shoe>",' +
  ' "caption": "<one line under 90 chars for image alt text>"}';

async function generateListing(imagesB64) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY missing in .env');
  const models = await freeVisionModels();
  for (const model of models.slice(0, 4)) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                ...imagesB64.map((data) => ({
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${data}` },
                })),
                { type: 'text', text: LISTING_PROMPT },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) {
        console.error(`  ${model}: ${res.status}`);
        continue;
      }
      const body = await res.json();
      const listing = parseLooseJson(body?.choices?.[0]?.message?.content ?? '');
      if (listing) return listing;
    } catch (e) {
      console.error(`  ${model}: ${e.message}`);
    }
  }
  return null;
}

// ── main ─────────────────────────────────────────────────────────────────

// Group photos: subfolder = one shoe; loose root image = one shoe.
function collectGroups() {
  const groups = [];
  for (const entry of fs.readdirSync(FOLDER, { withFileTypes: true })) {
    const full = path.join(FOLDER, entry.name);
    if (entry.isDirectory()) {
      const photos = fs
        .readdirSync(full)
        .filter((f) => IMG_RE.test(f))
        .map((f) => path.join(full, f));
      if (photos.length) groups.push({ label: entry.name, photos });
    } else if (IMG_RE.test(entry.name)) {
      groups.push({ label: entry.name, photos: [full] });
    }
  }
  return groups;
}

const groups = collectGroups();
if (!groups.length) {
  console.log(`No photos found in ${FOLDER} — drop images (or one subfolder per shoe) there first.`);
  process.exit(0);
}
console.log(`Found ${groups.length} shoe(s) in ${FOLDER}. Prices Rs.${MIN}-${MAX}, stock ${STOCK}/size.\n`);

const token = await login();
const categories = await api(token, 'GET', '/categories');
const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

async function categoryFor(type) {
  const key = (type || 'sneakers').toLowerCase();
  if (catByName.has(key)) return catByName.get(key);
  const created = await api(token, 'POST', '/categories', {
    name: type[0].toUpperCase() + type.slice(1).toLowerCase(),
    slug: slugify(type),
  }).catch(() => null);
  if (created) {
    catByName.set(key, created);
    return created;
  }
  return categories[0];
}

const done = [];
const failed = [];

for (const group of groups) {
  process.stdout.write(`▶ ${group.label} (${group.photos.length} photo(s)) … `);
  try {
    const imagesB64 = group.photos.slice(0, 4).map((p) => fs.readFileSync(p).toString('base64'));
    const listing = await generateListing(imagesB64);
    if (!listing) throw new Error('AI could not write the listing');

    const category = await categoryFor(listing.type);
    const price = randPrice();
    const initials = listing.name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 4);
    const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();

    let product = null;
    for (let attempt = 0; attempt < 3 && !product; attempt++) {
      const name = attempt === 0 ? listing.name : `${listing.name} ${attempt + 1}`;
      product = await api(token, 'POST', '/products', {
        name,
        slug: slugify(name),
        categoryId: category.id,
        description: listing.description,
        material: 'Leather',
        isPublished: true,
        variants: SIZES.map((size) => ({
          sku: `${initials}-${suffix}-${size.replace('EU ', '')}`,
          size,
          color: listing.color || 'Black',
          price,
          costPrice: Math.round(price * 0.6),
        })),
      }).catch((e) => {
        if (attempt === 2) throw e;
        return null;
      });
      if (product) listing.name = name;
    }

    for (const photoPath of group.photos) {
      const form = new FormData();
      form.append(
        'file',
        new Blob([fs.readFileSync(photoPath)], { type: 'image/jpeg' }),
        path.basename(photoPath),
      );
      form.append('alt', listing.caption || listing.name);
      await api(token, 'POST', `/media/products/${product.id}/images`, form);
    }

    if (STOCK > 0) {
      for (const v of product.variants) {
        await api(token, 'POST', '/inventory/adjust', {
          variantId: v.id,
          delta: STOCK,
          type: 'PURCHASE',
          note: 'Opening stock via bulk import',
        });
      }
    }

    console.log(`✅ ${listing.name} · ${category.name} · Rs.${price}`);
    console.log(`   "${listing.description}"`);
    done.push({ name: listing.name, slug: product.slug, price, category: category.name });
  } catch (e) {
    console.log(`❌ ${e.message}`);
    failed.push({ label: group.label, error: e.message });
  }
}

console.log(`\n${done.length} product(s) created, ${failed.length} failed.`);
for (const d of done) console.log(`  ${d.name} — Rs.${d.price} — /products/${d.slug}`);
if (failed.length) for (const f of failed) console.log(`  FAILED: ${f.label} — ${f.error}`);
