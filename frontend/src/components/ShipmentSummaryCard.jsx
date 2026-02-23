function UtilizationBarColored({ percent }) {
  const value = percent == null ? 0 : Math.min(100, Math.max(0, Number(percent)));
  const barColor =
    value <= 80 ? 'bg-emerald-500' : value <= 95 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden transition-all duration-300">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-300`}
          style={{ width: `${value}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="text-sm font-medium tabular-nums text-slate-700 w-12">{value}%</span>
    </div>
  );
}

export default function ShipmentSummaryCard({ total_volume, cartons, utilization_percent, loading, error }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 sticky top-4">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Shipment Summary
      </h3>
      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {loading && (
        <div className="space-y-3">
          <div className="h-8 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
          <p className="text-xs text-slate-500">Calculating…</p>
        </div>
      )}
      {!loading && !error && total_volume != null && (
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Total Volume (m³)</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-800">
              {Number(total_volume).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Cartons</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-800">
              {cartons != null ? Number(cartons).toLocaleString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Truck Capacity %</dt>
            <dd className="mt-1">
              <UtilizationBarColored percent={utilization_percent} />
            </dd>
          </div>
        </dl>
      )}
      {!loading && !error && total_volume == null && (
        <p className="text-sm text-slate-500">Add products to branches to see summary.</p>
      )}
    </div>
  );
}
