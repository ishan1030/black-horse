/**
 * Authenticated API client for the ERP. After login the JWT is kept in
 * localStorage; every getter degrades to fixture data when the API is
 * unreachable so the UI never breaks mid-shift.
 */
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api';

/** Origin serving /uploads (API host without the /api prefix). */
export const MEDIA_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function mediaUrl(url: string): string {
  return url.startsWith('/') ? `${MEDIA_ORIGIN}${url}` : url;
}

// ───────── auth ─────────

const TOKEN_KEY = 'bh-token';
const USER_KEY = 'bh-user';
let token: string | null = localStorage.getItem(TOKEN_KEY);

export interface SessionUser {
  name: string;
  email: string;
  role: string;
}

export function isAuthed(): boolean {
  return token !== null;
}

export function currentUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function logout(): void {
  token = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function login(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as { message?: string } | null;
      return { ok: false, error: detail?.message ?? 'Invalid credentials' };
    }
    const data = (await res.json()) as { accessToken: string; user: SessionUser };
    token = data.accessToken;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return { ok: true };
  } catch {
    return { ok: false, error: 'API unreachable — is the backend running on :4000?' };
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ───────── dashboard ─────────

export interface Chip {
  text: string;
  tone: 'up' | 'down' | 'flat';
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customer: string;
  channel: string;
  total: number;
  payment: string;
  status: string;
}

export interface LowStockRow {
  name: string;
  variant: string;
  qty: number;
  threshold: number;
}

export interface DashboardData {
  todaySales: number;
  todayPos: number;
  todayOnline: number;
  orders: number;
  pendingOrders: number;
  grossProfit30d: number;
  margin: number;
  dailyRevenue: number[];
  channelSplit: { pos: number; online: number };
  bestSellers: Array<{ name: string; units: number; revenue: number }>;
  recentOrders: RecentOrder[];
  lowStock: LowStockRow[];
  chips: { sales: Chip; orders: Chip; profit: Chip; low: Chip };
}

/** Shown only when the API is unreachable — zeros, never mock numbers. */
const OFFLINE_DASHBOARD: DashboardData = {
  todaySales: 0,
  todayPos: 0,
  todayOnline: 0,
  orders: 0,
  pendingOrders: 0,
  grossProfit30d: 0,
  margin: 0,
  dailyRevenue: new Array(30).fill(0),
  channelSplit: { pos: 0, online: 0 },
  bestSellers: [],
  recentOrders: [],
  lowStock: [],
  chips: {
    sales: { text: 'API offline', tone: 'flat' },
    orders: { text: 'API offline', tone: 'flat' },
    profit: { text: 'API offline', tone: 'flat' },
    low: { text: 'API offline', tone: 'flat' },
  },
};

interface SalesReport {
  online: { total: string; orders: number };
  pos: { total: string; sales: number };
  total: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',
};

interface ApiOrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  placedAt: string;
  customer: { id: string; name: string; phone: string };
  payments: Array<{ method: string; status: string }>;
  _count: { items: number };
}

export async function getDashboard(): Promise<{ data: DashboardData; live: boolean }> {
  if (!token) return { data: OFFLINE_DASHBOARD, live: false };

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [today, month, daily, best, low, recent, pending, gross] = await Promise.all([
    fetchJson<SalesReport>(`/reports/sales?from=${dayStart.toISOString()}&to=${now.toISOString()}`),
    fetchJson<SalesReport>('/reports/sales'),
    fetchJson<Array<{ day: string; revenue: string }>>('/reports/daily-revenue?days=30'),
    fetchJson<Array<{ productName: string; units: number; revenue: string }>>('/reports/best-sellers'),
    fetchJson<Array<{ productName: string; size: string; color: string; stockQty: number; lowStockThreshold: number }>>('/reports/low-stock'),
    fetchJson<{ items: ApiOrderListItem[] }>('/orders?pageSize=6'),
    fetchJson<{ total: number }>('/orders?status=PENDING&pageSize=1'),
    fetchJson<{ revenue: string; grossProfit: string }>('/reports/gross-profit'),
  ]);

  if (!today || !month) return { data: OFFLINE_DASHBOARD, live: false };

  // Fill a continuous 30-day series (the report only has days with sales).
  const byDay = new Map(
    (daily ?? []).map((r) => [new Date(r.day).toDateString(), Number(r.revenue)]),
  );
  const series: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(dayStart);
    d.setDate(d.getDate() - i);
    series.push(byDay.get(d.toDateString()) ?? 0);
  }

  const revenue30 = Number(gross?.revenue ?? 0);
  const grossProfit = Number(gross?.grossProfit ?? 0);
  const margin = revenue30 > 0 ? (grossProfit / revenue30) * 100 : 0;
  const posTotal = Number(month.pos.total);
  const onlineTotal = Number(month.online.total);
  const posShare = posTotal + onlineTotal > 0 ? Math.round((posTotal / (posTotal + onlineTotal)) * 100) : 0;
  const lowRows = (low ?? []).map((r) => ({
    name: r.productName,
    variant: `${r.color} · ${r.size}`,
    qty: r.stockQty,
    threshold: Math.max(r.lowStockThreshold * 4, 20),
  }));
  const critical = lowRows.filter((r) => r.qty <= 3).length;

  return {
    live: true,
    data: {
      todaySales: Number(today.total),
      todayPos: Number(today.pos.total),
      todayOnline: Number(today.online.total),
      orders: today.online.orders + today.pos.sales,
      pendingOrders: pending?.total ?? 0,
      grossProfit30d: grossProfit,
      margin: Math.round(margin * 10) / 10,
      dailyRevenue: series,
      channelSplit: { pos: posTotal, online: onlineTotal },
      bestSellers: (best ?? []).map((b) => ({
        name: b.productName,
        units: b.units,
        revenue: Number(b.revenue),
      })),
      recentOrders: (recent?.items ?? []).map(mapOrderRow),
      lowStock: lowRows,
      chips: {
        sales: { text: `POS ${posShare}% of 30d revenue`, tone: 'flat' },
        orders: { text: `${pending?.total ?? 0} pending confirmation`, tone: (pending?.total ?? 0) > 0 ? 'up' : 'flat' },
        profit: { text: `margin ${Math.round(margin * 10) / 10}%`, tone: 'up' },
        low: { text: `${critical} critical`, tone: critical > 0 ? 'down' : 'flat' },
      },
    },
  };
}

function mapOrderRow(o: ApiOrderListItem): RecentOrder {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customer: o.customer?.name ?? '—',
    channel: 'Online',
    total: Number(o.total),
    payment: o.payments[0]?.method ?? '—',
    status: STATUS_LABEL[o.status] ?? o.status,
  };
}

// ───────── orders management ─────────

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string; // raw DB status
  statusLabel: string;
  placedAt: string;
  customer: string;
  phone: string;
  items: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
}

export async function getOrders(status?: string): Promise<AdminOrder[]> {
  const query = status ? `&status=${status}` : '';
  const data = await fetchJson<{ items: ApiOrderListItem[] }>(`/orders?pageSize=25${query}`);
  return (data?.items ?? []).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    statusLabel: STATUS_LABEL[o.status] ?? o.status,
    placedAt: o.placedAt,
    customer: o.customer?.name ?? '—',
    phone: o.customer?.phone ?? '',
    items: o._count?.items ?? 0,
    total: Number(o.total),
    paymentMethod: o.payments[0]?.method ?? '—',
    paymentStatus: o.payments[0]?.status ?? '—',
  }));
}

export async function updateOrderStatus(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/orders/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
      const msg = Array.isArray(detail?.message) ? detail.message[0] : detail?.message;
      return { ok: false, error: msg ?? `API responded ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'API unreachable' };
  }
}

// ───────── POS ─────────

export interface PosProduct {
  variantId: string;
  name: string;
  size: string;
  color: string;
  price: number;
  stockQty: number;
  imageUrl?: string;
}

export async function getPosProducts(): Promise<{ items: PosProduct[]; live: boolean }> {
  const data = await fetchJson<{
    items: Array<{
      name: string;
      images?: Array<{ url: string }>;
      variants: Array<{ id: string; size: string; color: string; price: string; stockQty: number }>;
    }>;
  }>('/products?pageSize=50');
  if (!data) return { items: [], live: false };
  if (!data.items.length) return { items: [], live: true };
  return {
    live: true,
    items: data.items.flatMap((p) =>
      p.variants.map((v) => ({
        variantId: v.id,
        name: p.name,
        size: v.size,
        color: v.color,
        price: Number(v.price),
        stockQty: v.stockQty,
        imageUrl: p.images?.[0]?.url,
      })),
    ),
  };
}

export interface SaleLine {
  variantId: string;
  quantity: number;
}

export async function completeSale(body: {
  items: SaleLine[];
  paymentMethod: 'CASH' | 'FONEPAY' | 'CARD';
  discount?: number;
  tenderedAmount?: number;
}): Promise<{ ok: boolean; saleNumber?: string; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/pos/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
      const msg = Array.isArray(detail?.message) ? detail.message[0] : detail?.message;
      return { ok: false, error: msg ?? `API responded ${res.status}` };
    }
    const sale = (await res.json()) as { saleNumber: string };
    return { ok: true, saleNumber: sale.saleNumber };
  } catch {
    return { ok: false, error: 'API unreachable — sale not recorded (offline mode)' };
  }
}
