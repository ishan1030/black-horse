import type { Category, GalleryPost, Product } from './types';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/** Origin serving /uploads (the API host without the /api prefix). */
export const MEDIA_ORIGIN = API_URL.replace(/\/api\/?$/, '');

/** Absolute URL for an image path stored in the database. */
export function mediaUrl(url: string): string {
  return url.startsWith('/') ? `${MEDIA_ORIGIN}${url}` : url;
}

interface ApiVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  price: string | number;
  stockQty: number;
}

interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  material: string | null;
  isFeatured: boolean;
  createdAt?: string;
  category: { name: string; slug: string };
  variants: ApiVariant[];
  images?: Array<{ url: string; alt: string | null }>;
}

interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // API not reachable — callers fall back to fixtures.
    return null;
  }
}

function mapProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description ?? '',
    material: p.material ?? '',
    categoryName: p.category?.name ?? '',
    categorySlug: p.category?.slug ?? '',
    isNew: p.isFeatured,
    variants: (p.variants ?? []).map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      price: Number(v.price),
      stockQty: v.stockQty,
    })),
    images: (p.images ?? []).map((img) => ({ url: img.url, alt: img.alt ?? p.name })),
  };
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const data = await fetchJson<{ items: ApiProduct[] }>(
    '/products?publishedOnly=true&pageSize=8',
  );
  return (data?.items ?? []).map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const data = await fetchJson<ApiProduct>(`/products/slug/${slug}`);
  return data ? mapProduct(data) : null;
}

export async function getGalleryPosts(): Promise<GalleryPost[]> {
  try {
    const res = await fetch(`${API_URL}/media/gallery`, {
      next: { revalidate: 15 },
    });
    if (!res.ok) return [];
    return (await res.json()) as GalleryPost[];
  } catch {
    return [];
  }
}

/** All published products, optionally filtered to one category slug. */
export async function getShopProducts(categorySlug?: string): Promise<Product[]> {
  let categoryFilter = '';
  if (categorySlug) {
    const cats = await fetchJson<ApiCategory[]>('/categories');
    const match = cats?.find((c) => c.slug === categorySlug);
    if (match) categoryFilter = `&categoryId=${match.id}`;
  }
  const data = await fetchJson<{ items: ApiProduct[] }>(
    `/products?publishedOnly=true&pageSize=100${categoryFilter}`,
  );
  return (data?.items ?? []).map(mapProduct);
}

export async function getCategories(): Promise<Category[]> {
  const data = await fetchJson<ApiCategory[]>('/categories');
  if (!data?.length) return [];
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: c._count?.products ?? 0,
  }));
}
