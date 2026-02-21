import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getTrucks, createTruck, updateTruck, deleteTruck } from '../api/trucks';

const columns = (onEdit, onDelete) => [
  { key: 'truck_id', label: 'ID', sortable: true },
  { key: 'plate_number', label: 'Plate', sortable: true },
  {
    key: 'capacity_m3',
    label: 'Capacity (m³)',
    sortable: true,
    render: (v) => (v != null ? Number(v).toLocaleString() : '—'),
  },
  { key: 'status', label: 'Status', sortable: true },
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

const STATUS_OPTIONS = ['available', 'busy', 'maintenance'];

function TruckForm({ truck, onSubmit, onCancel, isSubmitting }) {
  const [plate_number, setPlateNumber] = useState(truck?.plate_number ?? '');
  const [capacity_m3, setCapacityM3] = useState(truck?.capacity_m3 != null ? String(truck.capacity_m3) : '');
  const [status, setStatus] = useState(truck?.status ?? 'available');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      plate_number: plate_number.trim(),
      capacity_m3: Number(capacity_m3),
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Plate number</label>
        <input
          type="text"
          value={plate_number}
          onChange={(e) => setPlateNumber(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Capacity (m³)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={capacity_m3}
          onChange={(e) => setCapacityM3(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50">
          {isSubmitting ? 'Saving…' : (truck ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
}

export default function TrucksTable() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['trucks'],
    queryFn: getTrucks,
  });

  const createMutation = useMutation({
    mutationFn: createTruck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateTruck(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTruck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      setDeleteTarget(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const handleSubmit = (values) => {
    setError(null);
    if (editing) {
      updateMutation.mutate({ id: editing.truck_id, body: values });
    } else {
      createMutation.mutate(values);
    }
  };

  if (isLoading) return <p className="text-slate-500">Loading trucks…</p>;
  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Failed to load trucks.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Trucks</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setError(null);
            setModalOpen(true);
          }}
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Add truck
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
        filterPlaceholder="Filter trucks…"
        emptyMessage="No trucks."
      />
      <Modal
        title={editing ? 'Edit truck' : 'New truck'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setError(null);
        }}
      >
        <TruckForm
          truck={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete truck"
        message={deleteTarget ? `Delete truck "${deleteTarget.plate_number}"?` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.truck_id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
