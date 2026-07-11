import { useEffect, useMemo, useRef, useState } from 'react';
import { Chip, DashboardData, getDashboard } from '../lib/api';
import { formatPrice } from '../lib/format';
import { Icon } from '../components/icons';

const CHART = { w: 720, h: 220, x0: 30, x1: 714, yTop: 10, yBottom: 169 };

function KpiChip({ chip }: { chip: Chip }) {
  return <span className={`delta ${chip.tone}`}>{chip.text}</span>;
}

export function Dashboard() {
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [live, setLive] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    getDashboard().then(({ data, live }) => {
      setDash(data);
      setLive(live);
    });
  }, []);

  const yMax = useMemo(() => {
    const max = Math.max(...(dash?.dailyRevenue ?? [0]));
    return max > 0 ? max * 1.15 : 1_000;
  }, [dash]);

  const points = useMemo(() => {
    if (!dash) return [] as Array<[number, number]>;
    const { x0, x1, yBottom, yTop } = CHART;
    const span = yBottom - yTop;
    return dash.dailyRevenue.map((v, i) => [
      x0 + ((x1 - x0) * i) / (dash.dailyRevenue.length - 1),
      yBottom - (v / yMax) * span,
    ]) as Array<[number, number]>;
  }, [dash, yMax]);

  const linePath = useMemo(
    () => points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' '),
    [points],
  );

  if (!dash) return <main className="content" />;

  const totalRevenue = dash.dailyRevenue.reduce((a, b) => a + b, 0);
  const posShare =
    dash.channelSplit.pos + dash.channelSplit.online > 0
      ? (dash.channelSplit.pos / (dash.channelSplit.pos + dash.channelSplit.online)) * 100
      : 50;

  const gridLabel = (fraction: number) => {
    const value = yMax * fraction;
    return value >= 1000 ? `${Math.round(value / 1000)}k` : `${Math.round(value)}`;
  };

  function onChartMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !dash) return;
    const x = ((e.clientX - rect.left) / rect.width) * CHART.w;
    const i = Math.round(
      ((x - CHART.x0) / (CHART.x1 - CHART.x0)) * (dash.dailyRevenue.length - 1),
    );
    setHover(Math.max(0, Math.min(dash.dailyRevenue.length - 1, i)));
  }

  return (
    <main className="content">
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p>
            Thamel flagship + online store
            {!live && <span className="offline-chip">offline data</span>}
          </p>
        </div>
        <div className="top-actions">
          <div className="search-box">
            <Icon name="search" size={15} />
            <input placeholder="Search orders, products…" aria-label="Search" />
          </div>
          <button className="btn-dark">
            <Icon name="plus" size={14} />
            New Sale
          </button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <h3>Today&apos;s Sales</h3>
          <div className="val">{formatPrice(dash.todaySales)}</div>
          <KpiChip chip={dash.chips.sales} />
          <small>
            POS {formatPrice(dash.todayPos)} · Online {formatPrice(dash.todayOnline)}
          </small>
        </div>
        <div className="kpi">
          <h3>Sales Today</h3>
          <div className="val">{dash.orders}</div>
          <KpiChip chip={dash.chips.orders} />
          <small>POS receipts + online orders</small>
        </div>
        <div className="kpi">
          <h3>Gross Profit · 30d</h3>
          <div className="val">{formatPrice(dash.grossProfit30d)}</div>
          <KpiChip chip={dash.chips.profit} />
          <small>Revenue − cost of goods</small>
        </div>
        <div className="kpi">
          <h3>Low Stock Alerts</h3>
          <div className="val">{dash.lowStock.length}</div>
          <KpiChip chip={dash.chips.low} />
          <small>Variants at or below threshold</small>
        </div>
      </div>

      <div className="row charts">
        <div className="panel">
          <div className="panel-head">
            <h2>Revenue — last 30 days</h2>
          </div>
          <div className="chart-meta">
            <div>
              <b>{formatPrice(totalRevenue)}</b>
              <span>Total revenue</span>
            </div>
            <div>
              <b>{formatPrice(totalRevenue / Math.max(dash.dailyRevenue.length, 1))}</b>
              <span>Daily average</span>
            </div>
          </div>
          <div className="chart-wrap">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CHART.w} ${CHART.h}`}
              width="100%"
              role="img"
              aria-label="Line chart of daily revenue for the last 30 days"
              onMouseMove={onChartMove}
              onMouseLeave={() => setHover(null)}
            >
              <g stroke="#EFEFEF" strokeWidth="1">
                <line x1="0" y1="10" x2={CHART.w} y2="10" />
                <line x1="0" y1="63" x2={CHART.w} y2="63" />
                <line x1="0" y1="116" x2={CHART.w} y2="116" />
                <line x1="0" y1="169" x2={CHART.w} y2="169" />
              </g>
              <g fontFamily="Inter, system-ui" fontSize="10" fill="#9A9A9A">
                <text x="0" y="8">{gridLabel(1)}</text>
                <text x="0" y="61">{gridLabel(2 / 3)}</text>
                <text x="0" y="114">{gridLabel(1 / 3)}</text>
                <text x="0" y="167">0</text>
                <text x={CHART.x0} y="212">30 days ago</text>
                <text x={CHART.x1} y="212" textAnchor="end">today</text>
              </g>
              <path d={`${linePath} L${CHART.x1} ${CHART.yBottom} L${CHART.x0} ${CHART.yBottom} Z`} fill="#111111" opacity="0.055" />
              <path d={linePath} fill="none" stroke="#111111" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {hover !== null && points[hover] && (
                <>
                  <circle cx={points[hover][0]} cy={points[hover][1]} r="4" fill="#111111" stroke="#fff" strokeWidth="2" />
                  <g transform={`translate(${Math.min(Math.max(points[hover][0] - 43, 4), CHART.w - 90)}, ${Math.max(points[hover][1] - 30, 4)})`}>
                    <rect width="86" height="22" rx="5" fill="#111111" />
                    <text x="43" y="15" textAnchor="middle" fontFamily="Inter, system-ui" fontSize="11" fill="#fff">
                      {formatPrice(dash.dailyRevenue[hover])}
                    </text>
                  </g>
                </>
              )}
            </svg>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Sales by channel — 30d</h2>
          </div>
          <div className="split-bar" role="img" aria-label={`POS ${posShare.toFixed(0)} percent, online ${(100 - posShare).toFixed(0)} percent`}>
            <i style={{ width: `${posShare}%`, background: '#111111' }} />
            <i style={{ width: `${100 - posShare}%`, background: '#8A8A8A' }} />
          </div>
          <ul className="legend">
            <li>
              <span className="swatch" style={{ background: '#111111' }} />
              POS · Thamel flagship <span className="v">{formatPrice(dash.channelSplit.pos)}</span>
            </li>
            <li>
              <span className="swatch" style={{ background: '#8A8A8A' }} />
              Online store <span className="v">{formatPrice(dash.channelSplit.online)}</span>
            </li>
          </ul>
          <div className="panel-head" style={{ marginTop: 26 }}>
            <h2>Best sellers · 30d</h2>
          </div>
          <ul className="legend">
            {dash.bestSellers.length === 0 && <li className="pay">No sales yet.</li>}
            {dash.bestSellers.slice(0, 5).map((b, i) => (
              <li key={`${b.name}-${i}`}>
                {i + 1}. {b.name} <small>· {b.units}</small>
                <span className="v">{formatPrice(b.revenue)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="row tables">
        <div className="panel">
          <div className="panel-head">
            <h2>Recent orders</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Channel</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dash.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-empty">No orders yet.</td>
                </tr>
              )}
              {dash.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td className="oid">{o.orderNumber}</td>
                  <td>{o.customer}</td>
                  <td>{o.channel}</td>
                  <td>{formatPrice(o.total)}</td>
                  <td className="pay">{o.payment}</td>
                  <td>
                    <span className={`chip ${o.status.toLowerCase()}`}>{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Low stock</h2>
          </div>
          {dash.lowStock.length === 0 && <p className="pay">Everything is comfortably stocked.</p>}
          {dash.lowStock.map((row) => {
            const level = row.qty <= 3 ? 'critical' : 'low';
            return (
              <div className="stock-item" key={`${row.name}-${row.variant}`}>
                <div className="stock-top">
                  <div>
                    <b>{row.name}</b> <span>{row.variant}</span>
                  </div>
                  <span className={`stock-qty ${level}`}>{row.qty} left</span>
                </div>
                <div className="meter">
                  <i
                    className={level}
                    style={{ width: `${Math.min((row.qty / row.threshold) * 100, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
