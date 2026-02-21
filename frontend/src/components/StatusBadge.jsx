/**
 * Maps backend status to display label and color.
 * Draft = pending | Preparing (gray), In Transit = blue, Completed = Delivered (green).
 */
function getStatusDisplay(status) {
  const s = (status || '').toLowerCase().replace(/\s+/g, '_');
  if (s === 'in_transit' || s === 'in transit') return { label: 'In Transit', className: 'bg-blue-100 text-blue-800' };
  if (s === 'delivered') return { label: 'Completed', className: 'bg-green-100 text-green-800' };
  return { label: 'Draft', className: 'bg-slate-200 text-slate-800' };
}

export default function StatusBadge({ status }) {
  const { label, className } = getStatusDisplay(status);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
