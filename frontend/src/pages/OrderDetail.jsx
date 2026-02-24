import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrderById } from '../api/orders';
import StatusBadge from '../components/StatusBadge';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrderById(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-500">Loading order…</p>
      </div>
    );
  }
  if (isError || !data) {
    const msg = error?.body?.message || error?.message;
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to Orders
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p>Order not found.</p>
          {msg && <p className="mt-1 text-sm">{msg}</p>}
        </div>
      </div>
    );
  }

  const { order, items = [] } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Order #{order.order_id}</h2>
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          ← Back to Orders
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <dl className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Order ID</dt>
            <dd className="mt-1 font-medium text-slate-800">{order.order_id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Date</dt>
            <dd className="mt-1 text-slate-800">
              {order.order_date ? new Date(order.order_date).toLocaleDateString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={order.status} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Branch</dt>
            <dd className="mt-1 text-slate-800">{order.branch_name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">DC</dt>
            <dd className="mt-1 text-slate-800">{order.dc_name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Shipment</dt>
            <dd className="mt-1">
              {order.shipment_id != null ? (
                <Link to={`/shipments/${order.shipment_id}`} className="text-sky-600 hover:underline">
                  #{order.shipment_id}
                </Link>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Total amount</dt>
            <dd className="mt-1 font-medium text-slate-800">
              {order.total_amount != null ? Number(order.total_amount).toLocaleString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Total volume (m³)</dt>
            <dd className="mt-1 text-slate-800">
              {order.total_volume != null ? Number(order.total_volume).toLocaleString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Box count</dt>
            <dd className="mt-1 text-slate-800">{order.box_count != null ? order.box_count : '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <h3 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
          Order items
        </h3>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-slate-500">No items.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Product</th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-700">Quantity</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Production date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((row) => (
                  <tr key={row.detail_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-800">{row.product_name ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">{row.quantity ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.production_date
                        ? new Date(row.production_date).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
