import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getReturns, getReturnById, createReturn, updateReturn, deleteReturn } from '../api/returns';
import { getOrders } from '../api/orders';
import { getProducts } from '../api/products';

const returnStatusOptions = ['Pending', 'Approved', 'Rejected'];

const columns = (onEdit, onDelete) => [
  {
    key: 'return_id',
    label: 'ID',
    sortable: true,
    render: (val, row) => (
      <Link to={`/returns/${row.return_id}`} className="font-medium text-sky-600 hover:underline">
        {val}
      </Link>
    ),
  },
  { key: 'return_date', label: 'Date', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  {
    key: 'total_volume',
    label: 'Volume',
    sortable: true,
    render: (v) => (v != null ? Number(v).toLocaleString() : '—'),
  },
  {
    key: 'order_id',
    label: 'Order',
    sortable: true,
    render: (val) =>
      val != null ? (
        <Link to={`/orders/${val}`} className="text-sky-600 hover:underline">
          {val}
        </Link>
      ) : (
        '—'
      ),
  },
  {
    key: 'shipment_id',
    label: 'Shipment',
    sortable: true,
    render: (val) =>
      val != null ? (
        <Link to={`/shipments/${val}`} className="text-sky-600 hover:underline">
          {val}
        </Link>
      ) : (
        '—'
      ),
  },
  {
    key: '_actions',
    label: 'Actions',
    sortable: false,
    render: (_, row) => (
      <div className="flex gap-2">
        <Link to={`/returns/${row.return_id}`} className="text-sky-600 hover:underline text-sm">
          View
        </Link>
        <button type="button" onClick={() => onEdit(row)} className="text-sky-600 hover:underline text-sm">
          Edit
        </button>
        <button type="button" onClick={() => onDelete(row)} className="text-red-600 hover:underline text-sm">
          Delete
        </button>
      </div>
    ),
  },
];

function ReturnForm({ returnData, orders = [], products: productsList = [], onSubmit, onCancel, isSubmitting }) {
  const isEdit = !!returnData?.return?.return_id;
  const ret = returnData?.return ?? {};
  const existingItems = returnData?.items ?? [];

  const [order_id, setOrderId] = useState(ret.order_id ?? orders[0]?.order_id ?? '');
  const [shipment_id, setShipmentId] = useState(ret.shipment_id ?? '');
  const [status, setStatus] = useState(ret.status ?? 'Pending');
  const [lines, setLines] = useState(() => {
    if (existingItems.length > 0) {
      return existingItems.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        reason: i.reason ?? '',
      }));
    }
    return [{ product_id: productsList[0]?.product_id ?? '', quantity: 1, reason: '' }];
  });

  const addLine = () => setLines((prev) => [...prev, { product_id: productsList[0]?.product_id ?? '', quantity: 1, reason: '' }]);
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));
  const updateLine = (idx, field, value) => {
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, [field]: field === 'quantity' ? Number(value) || 0 : value } : l
      )
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const items = lines
      .filter((l) => l.product_id && Number(l.quantity) > 0)
      .map((l) => ({
        product_id: Number(l.product_id),
        quantity: Number(l.quantity),
        reason: l.reason?.trim() || null,
      }));
    if (items.length === 0) return;
    if (isEdit) {
      onSubmit({ shipment_id: shipment_id === '' ? null : Number(shipment_id), status, items });
    } else {
      onSubmit({
        order_id: Number(order_id),
        shipment_id: shipment_id === '' ? null : Number(shipment_id),
        items,
      });
    }
  };

  if (isEdit) {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {returnStatusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Shipment ID (optional)</label>
          <input
            type="number"
            value={shipment_id}
            onChange={(e) => setShipmentId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">Items</label>
            <button type="button" onClick={addLine} className="text-sm text-sky-600 hover:underline">
              + Add line
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-center flex-wrap">
                <select
                  value={line.product_id}
                  onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm min-w-[120px]"
                >
                  <option value="">Product</option>
                  {productsList.map((p) => (
                    <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                  className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="text"
                  placeholder="Reason"
                  value={line.reason}
                  onChange={(e) => updateLine(idx, 'reason', e.target.value)}
                  className="flex-1 min-w-[80px] rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <button type="button" onClick={() => removeLine(idx)} className="text-red-600 text-sm hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50">
            Update
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Order</label>
        <select
          value={order_id}
          onChange={(e) => setOrderId(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select order</option>
          {orders.map((o) => (
            <option key={o.order_id} value={o.order_id}>
              #{o.order_id} — {o.branch_name ?? '—'} — {o.order_date ? new Date(o.order_date).toLocaleDateString() : '—'}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Shipment ID (optional)</label>
        <input
          type="number"
          value={shipment_id}
          onChange={(e) => setShipmentId(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">Items</label>
          <button type="button" onClick={addLine} className="text-sm text-sky-600 hover:underline">
            + Add line
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="flex gap-2 items-center flex-wrap">
              <select
                value={line.product_id}
                onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm min-w-[120px]"
              >
                <option value="">Product</option>
                {productsList.map((p) => (
                  <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={line.quantity}
                onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                type="text"
                placeholder="Reason"
                value={line.reason}
                onChange={(e) => updateLine(idx, 'reason', e.target.value)}
                className="flex-1 min-w-[80px] rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button type="button" onClick={() => removeLine(idx)} className="text-red-600 text-sm hover:underline">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50">
          Create
        </button>
      </div>
    </form>
  );
}

export default function ReturnsTable() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['returns'],
    queryFn: getReturns,
  });
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: getOrders });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: returnDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['return', editing?.return_id],
    queryFn: () => getReturnById(editing.return_id),
    enabled: !!editing?.return_id && modalOpen,
  });

  const createMutation = useMutation({
    mutationFn: createReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateReturn(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      setDeleteTarget(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const handleSubmit = (values) => {
    setError(null);
    if (editing) {
      updateMutation.mutate({ id: editing.return_id, body: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const returnFormData = editing?.return_id && modalOpen
    ? (loadingDetail ? null : returnDetail)
    : editing;

  if (isLoading) return <p className="text-slate-500">Loading returns…</p>;
  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Failed to load returns.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Returns</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setError(null);
            setModalOpen(true);
          }}
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Add return
        </button>
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}
      <DataTable
        columns={columns(
          (row) => {
            setEditing(row);
            setModalOpen(true);
            setError(null);
          },
          setDeleteTarget
        )}
        data={data}
        filterPlaceholder="Filter returns…"
        emptyMessage="No returns."
      />
      <Modal
        title={editing ? 'Edit return' : 'New return'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setError(null);
        }}
      >
        {editing?.return_id && modalOpen && loadingDetail ? (
          <p className="text-slate-500">Loading…</p>
        ) : (
          <ReturnForm
            returnData={returnFormData}
            orders={orders}
            products={products}
            onSubmit={handleSubmit}
            onCancel={() => setModalOpen(false)}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete return"
        message={deleteTarget ? `Delete return #${deleteTarget.return_id}?` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.return_id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
