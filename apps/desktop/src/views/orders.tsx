import { useCallback, useEffect, useState } from 'react';
import { AdminOrder, getOrders, updateOrderStatus } from '../lib/api';
import { formatPrice } from '../lib/format';

const FILTERS = [
  ['', 'All'],
  ['PENDING', 'Pending'],
  ['CONFIRMED', 'Confirmed'],
  ['PACKED', 'Packed'],
  ['SHIPPED', 'Shipped'],
  ['DELIVERED', 'Delivered'],
] as const;

/** Forward actions available from each status (cancel handled separately). */
const NEXT_ACTION: Record<string, { to: string; label: string } | undefined> = {
  PENDING: { to: 'CONFIRMED', label: 'Confirm' },
  CONFIRMED: { to: 'PACKED', label: 'Pack' },
  PACKED: { to: 'SHIPPED', label: 'Ship' },
  SHIPPED: { to: 'DELIVERED', label: 'Deliver' },
};

const CANCELLABLE = new Set(['PENDING', 'CONFIRMED', 'PACKED']);

export function Orders() {
  const [filter, setFilter] = useState('');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (status: string) => {
    setOrders(await getOrders(status || undefined));
  }, []);

  useEffect(() => {
    void refresh(filter);
  }, [filter, refresh]);

  async function advance(order: AdminOrder, to: string) {
    setBusyId(order.id);
    setError(null);
    const result = await updateOrderStatus(order.id, to);
    setBusyId(null);
    if (!result.ok) setError(`${order.orderNumber}: ${result.error}`);
    await refresh(filter);
  }

  return (
    <main className="content">
      <div className="topbar">
        <div>
          <h1>Orders</h1>
          <p>Online orders · confirm, pack, ship, deliver</p>
        </div>
        <div className="top-actions filter-chips">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              className="chip-filter"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="pos-notice err" style={{ marginBottom: 14 }}>{error}</p>}

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Placed</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="table-empty">
                  No orders {filter ? `in ${filter.toLowerCase()}` : 'yet'}.
                </td>
              </tr>
            )}
            {orders.map((o) => {
              const next = NEXT_ACTION[o.status];
              const busy = busyId === o.id;
              return (
                <tr key={o.id}>
                  <td className="oid">{o.orderNumber}</td>
                  <td className="pay">
                    {new Date(o.placedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </td>
                  <td>
                    {o.customer}
                    <div className="pay">{o.phone}</div>
                  </td>
                  <td>{o.items}</td>
                  <td>{formatPrice(o.total)}</td>
                  <td className="pay">
                    {o.paymentMethod}
                    {o.paymentStatus === 'PAID' ? ' · paid' : ''}
                  </td>
                  <td>
                    <span className={`chip ${o.statusLabel.toLowerCase()}`}>{o.statusLabel}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {next && (
                        <button
                          className="act-btn dark"
                          disabled={busy}
                          onClick={() => advance(o, next.to)}
                        >
                          {busy ? '…' : next.label}
                        </button>
                      )}
                      {CANCELLABLE.has(o.status) && (
                        <button
                          className="act-btn danger"
                          disabled={busy}
                          onClick={() => advance(o, 'CANCELLED')}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
