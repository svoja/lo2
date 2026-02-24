import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/products';

const columns = (onEdit, onDelete) => [
  { key: 'product_id', label: 'ID', sortable: true },
  { key: 'product_name', label: 'Name', sortable: true },
  {
    key: 'unit_price',
    label: 'Unit price',
    sortable: true,
    render: (v) => (v != null ? Number(v).toLocaleString() : '—'),
  },
  {
    key: 'length',
    label: 'L (cm)',
    sortable: true,
    render: (v) => (v != null ? Number(v) : '—'),
  },
  {
    key: 'width',
    label: 'W (cm)',
    sortable: true,
    render: (v) => (v != null ? Number(v) : '—'),
  },
  {
    key: 'height',
    label: 'H (cm)',
    sortable: true,
    render: (v) => (v != null ? Number(v) : '—'),
  },
  {
    key: 'volume',
    label: 'Volume (m³)',
    sortable: true,
    render: (v) => (v != null ? Number(v).toLocaleString() : '—'),
  },
  {
    key: '_actions',
    label: 'Actions',
    sortable: false,
    render: (_, row) => (
      <div className="flex gap-2">
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

function ProductForm({ product, onSubmit, onCancel, isSubmitting }) {
  const [product_name, setProductName] = useState(product?.product_name ?? '');
  const [unit_price, setUnitPrice] = useState(product?.unit_price != null ? String(product.unit_price) : '');
  const [length, setLength] = useState(product?.length != null ? String(product.length) : '');
  const [width, setWidth] = useState(product?.width != null ? String(product.width) : '');
  const [height, setHeight] = useState(product?.height != null ? String(product.height) : '');
  const [volume, setVolume] = useState(product?.volume != null ? String(product.volume) : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      product_name: product_name.trim(),
      unit_price: Number(unit_price) || 0,
      length: length === '' ? null : Number(length),
      width: width === '' ? null : Number(width),
      height: height === '' ? null : Number(height),
      volume: volume === '' ? null : Number(volume),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Product name</label>
        <input
          type="text"
          value={product_name}
          onChange={(e) => setProductName(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Unit price</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={unit_price}
          onChange={(e) => setUnitPrice(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Length (cm)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Width (cm)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Height (cm)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Volume (m³) optional</label>
        <input
          type="number"
          step="0.000001"
          min="0"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50">
          {isSubmitting ? 'Saving…' : (product ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
}

export default function ProductsTable() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateProduct(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
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
      updateMutation.mutate({ id: editing.product_id, body: values });
    } else {
      createMutation.mutate(values);
    }
  };

  if (isLoading) return <p className="text-slate-500">Loading products…</p>;
  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Failed to load products.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Products</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setError(null);
            setModalOpen(true);
          }}
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Add product
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
        filterPlaceholder="Filter products…"
        emptyMessage="No products."
      />
      <Modal
        title={editing ? 'Edit product' : 'New product'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setError(null);
        }}
      >
        <ProductForm
          product={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete product"
        message={deleteTarget ? `Delete product "${deleteTarget.product_name}"?` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.product_id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
