/**
 * Progress bar for utilization %. Value from backend only; no frontend calculation.
 */
export default function UtilizationBar({ percent, label }) {
  const value = percent == null ? 0 : Math.min(100, Math.max(0, Number(percent)));
  const displayLabel = label != null ? label : `${value}%`;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{ width: `${value}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="text-xs font-medium tabular-nums text-slate-600 w-10">{displayLabel}</span>
    </div>
  );
}
