export default function RouteSelector({ value, onChange, routes = [], disabled, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700">Route</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        disabled={disabled}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
      >
        <option value="">Select route</option>
        {routes.map((r) => (
          <option key={r.route_id} value={r.route_id}>
            {r.route_name ?? `Route ${r.route_id}`}
          </option>
        ))}
      </select>
    </div>
  );
}
