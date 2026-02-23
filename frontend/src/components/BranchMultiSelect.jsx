export default function BranchMultiSelect({ value = [], onChange, dcId, branches = [], disabled, className = '' }) {
  const isDisabled = disabled || !dcId;
  const selectedSet = new Set(value);

  const toggle = (branchId) => {
    if (isDisabled) return;
    if (selectedSet.has(branchId)) {
      onChange(value.filter((id) => id !== branchId));
    } else {
      onChange([...value, branchId]);
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700">Branches</label>
      <p className="mt-0.5 text-xs text-slate-500">Select one or more branches for this shipment.</p>
      <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-slate-50/50 p-2">
        {branches.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            {dcId ? 'No branches in this distribution center.' : 'Select a distribution center first.'}
          </p>
        ) : (
          <ul className="space-y-1">
            {branches.map((b) => (
              <li key={b.branch_id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-white transition-colors duration-200">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(b.branch_id)}
                    onChange={() => toggle(b.branch_id)}
                    disabled={isDisabled}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-800">{b.branch_name ?? `Branch ${b.branch_id}`}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
