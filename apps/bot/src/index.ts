import * as path from 'node:path';
import { Context, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { ApiClient } from './api-client';
import { aiCopyProvider, generateShoeCopy, ShoeCopy } from './copy';

// Load the monorepo root .env (works from both src/ via ts-node and dist/).
try {
  process.loadEnvFile(path.resolve(__dirname, '../../../.env'));
} catch {
  // no .env — rely on real environment variables
}

const {
  TELEGRAM_BOT_TOKEN,
  API_URL = 'http://localhost:4000/api',
  BOT_ADMIN_EMAIL,
  BOT_ADMIN_PASSWORD,
  ALLOWED_CHAT_IDS = '',
} = process.env;

if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is required');
if (!BOT_ADMIN_EMAIL || !BOT_ADMIN_PASSWORD) {
  throw new Error('BOT_ADMIN_EMAIL and BOT_ADMIN_PASSWORD are required');
}

const WEB_URL = process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000';

const api = new ApiClient(API_URL, BOT_ADMIN_EMAIL, BOT_ADMIN_PASSWORD);
const allowedChats = new Set(
  ALLOWED_CHAT_IDS.split(',').map((s) => s.trim()).filter(Boolean),
);

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Only whitelisted chats may talk to the ERP.
bot.use(async (ctx, next) => {
  const chatId = String(ctx.chat?.id ?? '');
  if (allowedChats.size > 0 && !allowedChats.has(chatId)) {
    await ctx.reply('This bot is private. Ask the owner to whitelist your chat id: ' + chatId);
    return;
  }
  return next();
});

const rs = (v: string | number) => `Rs. ${Math.round(Number(v)).toLocaleString('en-IN')}`;

bot.start((ctx) =>
  ctx.reply(
    [
      '🐎 Black Horse ERP bot',
      '',
      '/today — sales so far today',
      '/orders — latest orders',
      '/lowstock — low stock alerts',
      '/bestsellers — top products (30d)',
      '',
      '📸 Send a photo and it goes straight to the website:',
      '· "new: Patan Loafer, 4500, formal, stock 10" → creates that product',
      '· caption with an existing product name → that product\'s page',
      '· any other caption → the "From the workshop" gallery',
      '',
      '🖼 Send several photos AS ONE ALBUM and they count as ONE shoe —',
      'all angles land on the same product. Separate messages = separate shoes.',
      '',
      '🤖 AI copywriter: ' +
        (aiCopyProvider()
          ? `ON (${aiCopyProvider()}) — descriptions and captions are written from your photos.`
          : 'OFF — add OPENROUTER_API_KEY (free, openrouter.ai), GEMINI_API_KEY, or ANTHROPIC_API_KEY to .env.'),
      '',
      `Your chat id: ${ctx.chat.id}` +
        (allowedChats.size === 0
          ? ' — add it to ALLOWED_CHAT_IDS in .env to lock this bot down.'
          : ''),
    ].join('\n'),
  ),
);

bot.command('today', async (ctx) => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const data = await api.get<{
    online: { total: string; orders: number };
    pos: { total: string; sales: number };
    total: string;
  }>(`/reports/sales?from=${from.toISOString()}&to=${now.toISOString()}`);
  await ctx.reply(
    [
      `📊 Today so far`,
      `Total: ${rs(data.total)}`,
      `POS: ${rs(data.pos.total)} (${data.pos.sales} sales)`,
      `Online: ${rs(data.online.total)} (${data.online.orders} orders)`,
    ].join('\n'),
  );
});

bot.command('orders', async (ctx) => {
  const data = await api.get<{
    items: Array<{
      orderNumber: string;
      status: string;
      total: string;
      customer: { name: string };
    }>;
  }>('/orders?page=1&pageSize=5');
  if (!data.items.length) {
    await ctx.reply('No orders yet.');
    return;
  }
  await ctx.reply(
    ['🧾 Latest orders', ...data.items.map(
      (o) => `${o.orderNumber} · ${o.customer.name} · ${rs(o.total)} · ${o.status}`,
    )].join('\n'),
  );
});

bot.command('lowstock', async (ctx) => {
  const rows = await api.get<
    Array<{ productName: string; sku: string; size: string; color: string; stockQty: number }>
  >('/reports/low-stock');
  if (!rows.length) {
    await ctx.reply('✅ No low stock alerts.');
    return;
  }
  await ctx.reply(
    ['⚠️ Low stock', ...rows.map(
      (r) => `${r.productName} ${r.color} ${r.size} (${r.sku}) — ${r.stockQty} left`,
    )].join('\n'),
  );
});

bot.command('bestsellers', async (ctx) => {
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await api.get<
    Array<{ productName: string; sku: string; units: number; revenue: string }>
  >(`/reports/best-sellers?from=${from.toISOString()}&to=${new Date().toISOString()}`);
  if (!rows.length) {
    await ctx.reply('No sales in the last 30 days.');
    return;
  }
  await ctx.reply(
    ['🏆 Best sellers · 30d', ...rows.slice(0, 5).map(
      (r, i) => `${i + 1}. ${r.productName} — ${r.units} pairs · ${rs(r.revenue)}`,
    )].join('\n'),
  );
});

interface NewProductSpec {
  name: string;
  price: number;
  stock: number;
  category?: string;
}

/**
 * Parses a create-product caption:
 *   new: Patan Loafer, 4500, formal, stock 10
 * Order after the name is free — a number is the price, "stock N" is
 * opening stock per size, anything else is the category.
 */
export function parseNewProduct(caption: string): NewProductSpec | null {
  const m = caption.match(/^new\s*:\s*(.+)$/is);
  if (!m) return null;
  const parts = m[1].split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const name = parts[0];
  let price: number | null = null;
  let stock = 0;
  let category: string | undefined;

  for (const part of parts.slice(1)) {
    const stockMatch = part.match(/^stock\s+(\d+)$/i);
    if (stockMatch) {
      stock = Number(stockMatch[1]);
    } else if (/^(rs\.?\s*)?[\d,]+(\.\d+)?$/i.test(part)) {
      price = Number(part.replace(/[^\d.]/g, ''));
    } else {
      category = part;
    }
  }
  if (!name || !price || price <= 0) return null;
  return { name, price, stock, category };
}

const SIZES = ['EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44'];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function createProductFromPhoto(
  spec: NewProductSpec,
  photos: Blob[],
  copy: ShoeCopy | null,
) {
  const categories = await api.get<Array<{ id: string; name: string }>>('/categories');
  const category =
    categories.find((c) => c.name.toLowerCase() === (spec.category ?? '').toLowerCase()) ??
    categories.find((c) => (spec.category ?? '').toLowerCase().includes(c.name.toLowerCase())) ??
    categories[0];
  if (!category) throw new Error('No categories exist yet — create one in the ERP first.');

  const initials = spec.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();

  const product = await api.post<{ id: string; slug: string; variants: Array<{ id: string; size: string }> }>(
    '/products',
    {
      name: spec.name,
      slug: slugify(spec.name),
      categoryId: category.id,
      description: copy?.description ?? `${spec.name} — crafted in Kathmandu.`,
      material: 'Leather',
      isPublished: true,
      variants: SIZES.map((size) => ({
        sku: `${initials}-${suffix}-${size.replace('EU ', '')}`,
        size,
        color: 'Black',
        price: spec.price,
        // Placeholder cost until the owner sets the real one in the ERP.
        costPrice: Math.round(spec.price * 0.6),
      })),
    },
  );

  for (const [i, photo] of photos.entries()) {
    const form = new FormData();
    form.append('file', photo, `photo-${i + 1}.jpg`);
    form.append('alt', copy?.caption ?? spec.name);
    await api.postForm(`/media/products/${product.id}/images`, form);
  }

  if (spec.stock > 0) {
    for (const variant of product.variants) {
      await api.post('/inventory/adjust', {
        variantId: variant.id,
        delta: spec.stock,
        type: 'PURCHASE',
        note: 'Opening stock via Telegram',
      });
    }
  }

  return { product, category };
}

async function downloadPhoto(ctx: Context, fileId: string): Promise<Blob> {
  const link = await ctx.telegram.getFileLink(fileId);
  const download = await fetch(link.href);
  if (!download.ok) throw new Error('Telegram file download failed');
  return new Blob([await download.arrayBuffer()], { type: 'image/jpeg' });
}

/**
 * One shoe = one call. `fileIds` is every angle of that shoe: a single photo
 * message arrives alone, an album (shared media_group_id) arrives as the
 * whole set. All photos land on the same product / gallery subject.
 */
async function handleShoePhotos(ctx: Context, fileIds: string[], caption: string) {
  await ctx.sendChatAction('upload_photo');

  const blobs: Blob[] = [];
  for (const fileId of fileIds) {
    try {
      blobs.push(await downloadPhoto(ctx, fileId));
    } catch {
      // skip photos Telegram refuses to serve; report only if all fail
    }
  }
  if (!blobs.length) {
    await ctx.reply('Could not download that photo from Telegram — try again.');
    return;
  }
  const angles = blobs.length > 1 ? ` (${blobs.length} angles)` : '';

  // "new:" caption → create a whole product from these photos
  if (/^new\s*:/i.test(caption)) {
    const spec = parseNewProduct(caption);
    if (!spec) {
      await ctx.reply(
        'To create a product, caption the photo like:\n' +
          'new: Patan Loafer, 4500, formal, stock 10\n' +
          '(name and price required; category and stock optional)',
      );
      return;
    }
    const copy = await generateShoeCopy(blobs, {
      name: spec.name,
      category: spec.category,
      price: spec.price,
    });
    const { product, category } = await createProductFromPhoto(spec, blobs, copy);
    await ctx.reply(
      [
        `✅ Created ${spec.name}${angles}`,
        copy ? `📝 "${copy.description}"` : '',
        `Price: Rs. ${spec.price.toLocaleString('en-IN')} · Category: ${category.name}`,
        `Sizes: ${SIZES.join(', ')}` +
          (spec.stock > 0 ? ` · ${spec.stock} pairs per size in stock` : ' · no stock yet'),
        `Live at ${WEB_URL}/products/${product.slug}`,
        spec.stock === 0 ? 'Add stock with the ERP or send another photo with "stock N".' : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
    return;
  }

  // Try to match the caption to an existing product
  const catalog = await api.get<{ items: Array<{ id: string; name: string }> }>(
    '/products?pageSize=100',
  );
  const product = catalog.items.find((p) =>
    caption.toLowerCase().includes(p.name.toLowerCase()),
  );

  if (product) {
    for (const blob of blobs) {
      const form = new FormData();
      form.append('file', blob, 'photo.jpg');
      form.append('alt', caption);
      await api.postForm(`/media/products/${product.id}/images`, form);
    }
    await ctx.reply(
      `📸 Added to ${product.name}${angles} — live on the product page.\n` +
        `${WEB_URL}/products/... — caption saved as the image description.`,
    );
    return;
  }

  // A price in the caption usually means they wanted a product, not a
  // gallery photo — stop and show the exact caption to resend.
  const priceMatch = caption.match(/(?:rs\.?|price)?\s*([1-9]\d{2,5})\b/i);
  if (priceMatch) {
    await ctx.reply(
      [
        '💡 Looks like you want to sell this! To create a buyable product,',
        'resend the photo(s) with a caption like:',
        '',
        `new: Product Name, ${priceMatch[1]}, formal, stock 10`,
        '',
        '(or send without a price to post to the website gallery)',
      ].join('\n'),
    );
    return;
  }

  // No caption and no product match → gallery. If AI copy is enabled, write
  // the caption from the photos themselves.
  let galleryCaption = caption;
  let aiCaptioned = false;
  if (!galleryCaption) {
    const copy = await generateShoeCopy(blobs, {});
    if (copy) {
      galleryCaption = copy.caption;
      aiCaptioned = true;
    }
  }

  for (const blob of blobs) {
    const form = new FormData();
    form.append('file', blob, 'photo.jpg');
    form.append('caption', galleryCaption);
    form.append('source', 'telegram');
    await api.postForm('/media/gallery', form);
  }
  await ctx.reply(
    galleryCaption
      ? `📸 Posted to the website gallery${angles} with ${aiCaptioned ? 'an auto-written' : 'your'} caption:\n"${galleryCaption}"`
      : `📸 Posted to the website gallery${angles}. Tip: send a caption next time and it becomes the description.`,
  );
}

// Telegram delivers an album as separate messages sharing a media_group_id,
// with the caption on only one of them. Buffer until the album goes quiet,
// then process every photo as ONE shoe.
const ALBUM_SETTLE_MS = 1500;
interface PendingAlbum {
  fileIds: string[];
  caption: string;
  ctx: Context;
  timer: NodeJS.Timeout;
}
const pendingAlbums = new Map<string, PendingAlbum>();

// 📸 Photo(s) → website.
//   album (multi-photo message)  → ONE shoe, every photo an angle of it
//   caption "new: Name, 4500[, category][, stock 10]" → creates the product
//   caption containing an existing product name → attaches to that product
//   anything else → "From the workshop" gallery post
bot.on(message('photo'), async (ctx) => {
  const caption = (ctx.message.caption ?? '').trim();
  // Largest rendition Telegram provides
  const sizes = ctx.message.photo;
  const fileId = sizes[sizes.length - 1].file_id;

  const groupId = ctx.message.media_group_id;
  if (!groupId) {
    await handleShoePhotos(ctx, [fileId], caption);
    return;
  }

  const pending = pendingAlbums.get(groupId);
  if (pending) clearTimeout(pending.timer);
  const album: PendingAlbum = {
    fileIds: [...(pending?.fileIds ?? []), fileId],
    caption: caption || (pending?.caption ?? ''),
    ctx,
    timer: setTimeout(() => {
      pendingAlbums.delete(groupId);
      // Outside the middleware chain — bot.catch can't see this, so catch here.
      handleShoePhotos(album.ctx, album.fileIds, album.caption).catch(async (err) => {
        console.error('album error', err);
        try {
          await album.ctx.reply('Something went wrong talking to the ERP. Check that the API is running.');
        } catch {
          /* chat unreachable */
        }
      });
    }, ALBUM_SETTLE_MS),
  };
  pendingAlbums.set(groupId, album);
});

bot.catch(async (err, ctx) => {
  console.error('bot error', err);
  await ctx.reply('Something went wrong talking to the ERP. Check that the API is running.');
});

// launch() only resolves when the bot stops — readiness comes via the callback.
void bot.launch(() => console.log('Black Horse bot is up.'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
