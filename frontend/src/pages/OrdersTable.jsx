import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getOrders, createOrder, updateOrder, deleteOrder } from '../api/orders';
import { getBranches } from '../api/branches';
import { getShipments } from '../api/shipments';
import { getProducts } from '../api/products';

const orderStatusOptions = ['Pending', 'In Transit', 'Delivered', 'Received'];

const columns = (onEdit, onDelete) => [
  {
    key: 'order_id',
    label: 'ID',
    sortable: true,
    render: (val, row) => (
      <Link to={`/orders/${row.order_id}`} className="font-medium text-sky-600 hover:underline">
        {val}
      </Link>
    ),
  },
  { key: 'order_date', label: 'Date', sortable: true },
  { key: 'branch_name', label: 'Branch', sortable: true },
  { key: 'dc_name', label: 'DC', sortable: true, render: (v) => v || '—' },
  {
    key: 'shipment_id',
    label: 'Shipment',
    sortable: true,
    render: (val, row) =>
      val != null ? (
        <Link to={`/shipments/${row.shipment_id}`} className="text-sky-600 hover:underline">
          {val}
        </Link>
      ) : (
        '—'
      ),
  },
  { key: 'status', label: 'Status', sortable: true },
  {
    key: 'total_amount',
    label: 'Total',
    sortable: true,
    render: (v) => (v != null ? Number(v).toLocaleString() : '—'),
  },
  {
    key: '_actions',
    label: 'Actions',
    sortable: false,
    render: (_, row) => (
      <div className="flex gap-2">
        <Link to={`/orders/${row.order_id}`} className="text-sky-600 hover:underline text-sm">
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

function OrderForm({ order, branches = [], shipments = [], products: productsList = [], onSubmit, onCancel, isSubmitting }) {
  const isEdit = !!order?.order_id;
  const [branch_id, setBranchId] = useState(order?.branch_id ?? branches[0]?.branch_id ?? '');
  const [status, setStatus] = useState(order?.status ?? 'Pending');
  const [shipment_id, setShipmentId] = useState(order?.shipment_id ?? '');
  const [lines, setLines] = useState(() => {
    if (order?.items?.length) {
      return order.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }));
    }
    return [{ product_id: productsList[0]?.product_id ?? '', quantity: 1 }];
  });

  const addLine = () => setLines((prev) => [...prev, { product_id: productsList[0]?.product_id ?? '', quantity: 1 }]);
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));
  const updateLine = (idx, field, value) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: field === 'quantity' ? Number(value) || 0 : value } : l)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEdit) {
      onSubmit({ status, shipment_id: shipment_id === '' ? null : Number(shipment_id) });
    } else {
      const products = lines
        .filter((l) => l.product_id && Number(l.quantity) > 0)
        .map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) }));
      if (products.length === 0) return;
      onSubmit({ branch_id: Number(branch_id), products });
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
            {orderStatusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Shipment (optional)</label>
          <select
            value={shipment_id}
            onChange={(e) => setShipmentId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {shipments.map((s) => (
              <option key={s.shipment_id} value={s.shipment_id}>#{s.shipment_id} {s.origin_branch} → {s.destination_branch}</option>
            ))}
          </select>
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
        <label className="block text-sm font-medium text-slate-700">Branch</label>
        <select
          value={branch_id}
          onChange={(e) => setBranchId(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select</option>
          {branches.map((b) => (
            <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
          ))}
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">Products</label>
          <button type="button" onClick={addLine} className="text-sm text-sky-600 hover:underline">
            + Add line
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <select
                value={line.product_id}
                onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">Product</option>
                {productsList.map((p) => (
                  <option key={p.product_id} value={p.product_id}>{p.product_name} — {p.unit_price}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={line.quantity}
                onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
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

export default function OrdersTable() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: getBranches });
  const { data: shipments = [] } = useQuery({ queryKey: ['shipments'], queryFn: getShipments });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });

  const createMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateOrder(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setDeleteTarget(null);
      setError(null);
    },
    onError: (err) => {
      setError(err.body?.message || err.message);
      setDeleteTarget(null);
    },
  });

  const handleSubmit = (values) => {
    setError(null);
    if (editing) {
      updateMutation.mutate({ id: editing.order_id, body: values });
    } else {
      createMutation.mutate(values);
    }
  };

  if (isLoading) return <p className="text-slate-500">Loading orders…</p>;
  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Failed to load orders.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Orders</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setError(null);
            setModalOpen(true);
          }}
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Add order
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
        filterPlaceholder="Filter orders…"
        emptyMessage="No orders."
      />
      <Modal
        title={editing ? 'Edit order' : 'New order'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setError(null);
        }}
      >
        <OrderForm
          order={editing}
          branches={branches}
          shipments={shipments}
          products={products}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete order"
        message={deleteTarget ? `Delete order #${deleteTarget.order_id}?` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.order_id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
