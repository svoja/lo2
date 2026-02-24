import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getShipments, createShipment, updateShipment, deleteShipment } from '../api/shipments';
import { getBranches } from '../api/branches';
import { getTrucks } from '../api/trucks';

const statusOptions = ['Preparing', 'In Transit', 'Delivered', 'Received'];

const columns = (onEdit, onDelete) => [
  {
    key: 'shipment_id',
    label: 'ID',
    sortable: true,
    render: (val) => (
      <Link to={`/shipments/${val}`} className="font-medium text-sky-600 hover:underline">
        {val}
      </Link>
    ),
  },
  {
    key: 'origin_branch',
    label: 'Origin',
    sortable: true,
    render: (v, row) => (v != null ? (row.origin_is_dc ? `DC: ${v}` : v) : '—'),
  },
  { key: 'destination_branch', label: 'Destination', sortable: true },
  { key: 'shipment_type', label: 'Type', sortable: true, render: (v) => v || '—' },
  { key: 'truck_plate', label: 'Truck', sortable: true, render: (v) => v || '—' },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'departure_time', label: 'Departure', sortable: true, render: (v) => v || '—' },
  { key: 'arrival_time', label: 'Arrival', sortable: true, render: (v) => v || '—' },
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

function ShipmentForm({ shipment, branches = [], trucks = [], onSubmit, onCancel, isSubmitting }) {
  const editing = !!shipment?.shipment_id;
  const [origin_branch_id, setOriginBranchId] = useState(shipment?.origin_branch_id ?? branches[0]?.branch_id ?? '');
  const [destination_branch_id, setDestinationBranchId] = useState(shipment?.destination_branch_id ?? branches[0]?.branch_id ?? '');
  const [truck_id, setTruckId] = useState(shipment?.truck_id ?? '');
  const [shipment_type, setShipmentType] = useState(shipment?.shipment_type ?? 'Outbound');
  const [status, setStatus] = useState(shipment?.status ?? 'Preparing');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) {
      onSubmit({ status });
    } else {
      onSubmit({
        origin_branch_id: Number(origin_branch_id),
        destination_branch_id: Number(destination_branch_id),
        truck_id: truck_id === '' ? undefined : Number(truck_id),
        shipment_type: shipment_type === 'Inbound' ? 'Inbound' : 'Outbound',
      });
    }
  };

  if (editing) {
    const isDraft = status === 'Preparing' || (status || '').toLowerCase() === 'pending';
    const handleEditSubmit = (e) => {
      e.preventDefault();
      const body = { status };
      if (isDraft) {
        body.origin_branch_id = origin_branch_id ? Number(origin_branch_id) : undefined;
        body.destination_branch_id = destination_branch_id ? Number(destination_branch_id) : undefined;
        body.truck_id = truck_id === '' ? null : Number(truck_id);
      }
      onSubmit(body);
    };
    return (
      <form onSubmit={handleEditSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {isDraft && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700">Origin branch</label>
              <select
                value={origin_branch_id}
                onChange={(e) => setOriginBranchId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {branches.map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Destination branch</label>
              <select
                value={destination_branch_id}
                onChange={(e) => setDestinationBranchId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {branches.map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Truck</label>
              <select
                value={truck_id}
                onChange={(e) => setTruckId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {trucks.map((t) => (
                  <option key={t.truck_id} value={t.truck_id}>{t.plate_number} ({t.capacity_m3} m³)</option>
                ))}
              </select>
            </div>
          </>
        )}
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
        <label className="block text-sm font-medium text-slate-700">Type</label>
        <select
          value={shipment_type}
          onChange={(e) => setShipmentType(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="Outbound">Outbound</option>
          <option value="Inbound">Inbound</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Origin branch</label>
        <select
          value={origin_branch_id}
          onChange={(e) => setOriginBranchId(e.target.value)}
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
        <label className="block text-sm font-medium text-slate-700">Destination branch</label>
        <select
          value={destination_branch_id}
          onChange={(e) => setDestinationBranchId(e.target.value)}
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
        <label className="block text-sm font-medium text-slate-700">Truck (optional)</label>
        <select
          value={truck_id}
          onChange={(e) => setTruckId(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">None</option>
          {trucks.map((t) => (
            <option key={t.truck_id} value={t.truck_id}>{t.plate_number} ({t.capacity_m3} m³)</option>
          ))}
        </select>
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

export default function ShipmentsTable() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['shipments'],
    queryFn: getShipments,
  });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: getBranches });
  const { data: trucks = [] } = useQuery({ queryKey: ['trucks'], queryFn: getTrucks });

  const createMutation = useMutation({
    mutationFn: createShipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateShipment(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteShipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
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
      updateMutation.mutate({ id: editing.shipment_id, body: values });
    } else {
      createMutation.mutate(values);
    }
  };

  if (isLoading) return <p className="text-slate-500">Loading shipments…</p>;
  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Failed to load shipments.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Shipments</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setError(null);
            setModalOpen(true);
          }}
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Add shipment
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
        filterPlaceholder="Filter shipments…"
        emptyMessage="No shipments."
      />
      <Modal
        title={editing ? 'Edit shipment' : 'New shipment'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setError(null);
        }}
      >
        <ShipmentForm
          shipment={editing}
          branches={branches}
          trucks={trucks}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete shipment"
        message={deleteTarget ? `Delete shipment #${deleteTarget.shipment_id}?` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.shipment_id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
