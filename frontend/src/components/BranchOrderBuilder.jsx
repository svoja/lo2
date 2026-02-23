import { useState } from 'react';

export default function BranchOrderBuilder({ branchId, branchName, items = [], onItemsChange, products = [] }) {
  const [productId, setProductId] = useState(products[0]?.product_id ?? '');
  const [quantity, setQuantity] = useState(1);

  const addLine = () => {
    const pid = productId ? Number(productId) : null;
    if (!pid || quantity < 1) return;
    onItemsChange([...items, { product_id: pid, quantity: Number(quantity) }]);
    setQuantity(1);
  };

  const removeLine = (index) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const updateQuantity = (index, qty) => {
    const n = Number(qty);
    if (isNaN(n) || n < 1) return;
    onItemsChange(
      items.map((line, i) => (i === index ? { ...line, quantity: n } : line))
    );
  };

  const productName = (pid) => products.find((p) => p.product_id === pid)?.product_name ?? `Product ${pid}`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
        {branchName ?? `Branch ${branchId}`}
      </h4>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1">
          <label className="block text-xs font-medium text-slate-500">Product</label>
          <select
            value={productId ?? ''}
            onChange={(e) => setProductId(e.target.value)}
            className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Select product</option>
            {products.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {p.product_name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-24">
          <label className="block text-xs font-medium text-slate-500">Qty</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm tabular-nums"
          />
        </div>
        <button
          type="button"
          onClick={addLine}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500 transition-colors duration-200"
        >
          Add
        </button>
      </div>
      {items.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          {items.map((line, index) => (
            <li
              key={`${line.product_id}-${index}`}
              className="flex items-center justify-between rounded bg-slate-50 px-2 py-1.5 text-sm"
            >
              <span className="text-slate-800">{productName(line.product_id)}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => updateQuantity(index, e.target.value)}
                  className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-right text-sm tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
