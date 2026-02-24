import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getReturnById } from '../api/returns';
import StatusBadge from '../components/StatusBadge';

export default function ReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['return', id],
    queryFn: () => getReturnById(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-500">Loading return…</p>
      </div>
    );
  }
  if (isError || !data) {
    const msg = error?.body?.message || error?.message;
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/returns')}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to Returns
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p>Return not found.</p>
          {msg && <p className="mt-1 text-sm">{msg}</p>}
        </div>
      </div>
    );
  }

  const ret = data.return || {};
  const items = data.items || [];
  const order = data.order || null;
  const orderItems = data.orderItems || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Return #{ret.return_id}</h2>
        <button
          type="button"
          onClick={() => navigate('/returns')}
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          ← Back to Returns
        </button>
      </div>

      {/* Return info */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        <h3 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
          Return details
        </h3>
        <dl className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Return ID</dt>
            <dd className="mt-1 font-medium text-slate-800">{ret.return_id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Date</dt>
            <dd className="mt-1 text-slate-800">
              {ret.return_date ? new Date(ret.return_date).toLocaleDateString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={ret.status} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Total volume (m³)</dt>
            <dd className="mt-1 text-slate-800">
              {ret.total_volume != null ? Number(ret.total_volume).toLocaleString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Order</dt>
            <dd className="mt-1">
              {ret.order_id != null ? (
                <Link to={`/orders/${ret.order_id}`} className="text-sky-600 hover:underline">
                  #{ret.order_id}
                </Link>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Shipment</dt>
            <dd className="mt-1">
              {ret.shipment_id != null ? (
                <Link to={`/shipments/${ret.shipment_id}`} className="text-sky-600 hover:underline">
                  #{ret.shipment_id}
                </Link>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* Order information (pulled from linked order) */}
      {order && (
        <>
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            <h3 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              Order information
            </h3>
            <dl className="grid gap-4 p-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-slate-500">Order ID</dt>
                <dd className="mt-1">
                  <Link to={`/orders/${order.order_id}`} className="font-medium text-sky-600 hover:underline">
                    #{order.order_id}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Order date</dt>
                <dd className="mt-1 text-slate-800">
                  {order.order_date ? new Date(order.order_date).toLocaleDateString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Order status</dt>
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
            </dl>
          </div>

          {orderItems.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <h3 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                Order items
              </h3>
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
                    {orderItems.map((row) => (
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
            </div>
          )}
        </>
      )}

      {/* Return items */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <h3 className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
          Return items
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
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Reason</th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-700">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((row) => (
                  <tr key={row.return_detail_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-800">{row.product_name ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800">{row.quantity ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.reason ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {row.volume != null ? (Number(row.volume) * Number(row.quantity || 0)).toLocaleString() : '—'}
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
