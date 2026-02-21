import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { getOrders } from '../api/orders';
import { getShipments } from '../api/shipments';
import { getTrucks } from '../api/trucks';
import { getReturns } from '../api/returns';

function useDashboardData() {
  const orders = useQuery({ queryKey: ['orders'], queryFn: getOrders });
  const shipments = useQuery({ queryKey: ['shipments'], queryFn: getShipments });
  const trucks = useQuery({ queryKey: ['trucks'], queryFn: getTrucks });
  const returns = useQuery({ queryKey: ['returns'], queryFn: getReturns });

  const isLoading = orders.isLoading || shipments.isLoading || trucks.isLoading || returns.isLoading;
  const isError = orders.isError || shipments.isError || trucks.isError || returns.isError;
  const error = orders.error || shipments.error || trucks.error || returns.error;
  const ordersList = orders.data || [];
  const shipmentsList = shipments.data || [];
  const trucksList = trucks.data || [];
  const returnsList = returns.data || [];

  const kpis = {
    totalOrders: ordersList.length,
    ordersPending: ordersList.filter((o) => (o.status || '').toLowerCase() === 'pending').length,
    shipmentsInProgress: shipmentsList.filter(
      (s) => (s.status || '').toLowerCase() === 'in_transit' || (s.status || '').toLowerCase() === 'in progress'
    ).length,
    trucksAvailable: trucksList.filter((t) => (t.status || '').toLowerCase() === 'available').length,
    totalTrucks: trucksList.length,
    pendingReturns: returnsList.filter(
      (r) => (r.status || '').toLowerCase() === 'pending'
    ).length,
    totalReturns: returnsList.length,
  };

  const orderDates = (ordersList || []).reduce((acc, o) => {
    const d = o.order_date ? String(o.order_date).slice(0, 10) : 'unknown';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const ordersOverTime = Object.entries(orderDates)
    .map(([date, count]) => ({ date, count, orders: count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const orderStatusCounts = (ordersList || []).reduce((acc, o) => {
    const s = (o.status || 'unknown').toLowerCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const orderStatusData = Object.entries(orderStatusCounts).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  const shipmentStatusCounts = (shipmentsList || []).reduce((acc, s) => {
    const st = (s.status || 'unknown').toLowerCase();
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});
  const shipmentStatusData = Object.entries(shipmentStatusCounts).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  const CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

  return {
    isLoading,
    isError,
    error,
    kpis,
    ordersOverTime,
    orderStatusData,
    shipmentStatusData,
    CHART_COLORS,
  };
}

export default function Dashboard() {
  const {
    isLoading,
    isError,
    error,
    kpis,
    ordersOverTime,
    orderStatusData,
    shipmentStatusData,
    CHART_COLORS,
  } = useDashboardData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-500">Loading dashboard…</p>
      </div>
    );
  }

  if (isError) {
    const msg = error?.body?.message || error?.message;
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-medium">Failed to load dashboard.</p>
        <p className="mt-1 text-sm">Ensure the backend is running on port 3000 and the database is set up.</p>
        {msg && <p className="mt-2 text-sm font-mono">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-slate-800">Dashboard</h2>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total orders" value={kpis.totalOrders} />
        <KpiCard label="Orders pending" value={kpis.ordersPending} />
        <KpiCard label="Shipments in progress" value={kpis.shipmentsInProgress} />
        <KpiCard label="Trucks available" value={kpis.trucksAvailable} sub={`/ ${kpis.totalTrucks}`} />
        <KpiCard label="Pending returns" value={kpis.pendingReturns} />
        <KpiCard label="Total returns" value={kpis.totalReturns} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Orders over time
          </h3>
          <div className="h-64">
            {ordersOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersOverTime} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_COLORS[0]} name="Orders" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-slate-400">No order data</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Order status
          </h3>
          <div className="h-64">
            {orderStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {orderStatusData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-slate-400">No order data</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Shipment status
          </h3>
          <div className="h-64">
            {shipmentStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={shipmentStatusData}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 60, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={56} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill={CHART_COLORS[1]} name="Shipments" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-slate-400">No shipment data</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, sub = '' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-800">
        {value}
        {sub}
      </p>
    </div>
  );
}
