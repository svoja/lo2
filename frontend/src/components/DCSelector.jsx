export default function DCSelector({ value, onChange, routeId, dcs = [], disabled, className = '' }) {
  const isDisabled = disabled || !routeId;

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700">Distribution Center</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        disabled={isDisabled}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
      >
        <option value="">Select distribution center</option>
        {dcs.map((dc) => (
          <option key={dc.dc_id} value={dc.dc_id}>
            {dc.dc_name ?? `DC ${dc.dc_id}`}
          </option>
        ))}
      </select>
    </div>
  );
}
