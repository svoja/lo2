import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getManufacturers, createManufacturer, deleteManufacturer } from '../api/manufacturers';
import { getLocations } from '../api/locations';

const columns = (onEdit, onDelete) => [
  { key: 'manufacturer_id', label: 'ID', sortable: true },
  { key: 'manufacturer_name', label: 'Name', sortable: true },
  {
    key: 'location_id',
    label: 'Location',
    sortable: true,
    render: (_, row) => (
      <Link to="/locations" className="text-sky-600 hover:underline text-sm">
        #{row.location_id}
      </Link>
    ),
  },
  {
    key: 'latitude',
    label: 'Latitude',
    sortable: true,
    render: (v) => (v != null ? Number(v) : '—'),
  },
  {
    key: 'longitude',
    label: 'Longitude',
    sortable: true,
    render: (v) => (v != null ? Number(v) : '—'),
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

function ManufacturerForm({ manufacturer, locations = [], manufacturers = [], onSubmit, onCancel, isSubmitting }) {
  const usedLocationIds = (manufacturers || []).map((m) => m.location_id);
  const availableLocations = (locations || []).filter((loc) => !usedLocationIds.includes(loc.location_id));
  const [location_id, setLocationId] = useState(manufacturer?.location_id ?? '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ location_id: Number(location_id) });
  };

  if (manufacturer?.manufacturer_id) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          ชื่อและพิกัดแก้ที่ <Link to="/locations" className="text-sky-600 hover:underline">Locations</Link>. โรงงานผูกกับ Location แค่จุดเดียว.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-slate-600">
        Manufacturer = โรงงาน/จุดผลิต. ผูก <strong>Location</strong> (ชื่อ/พิกัดอยู่ที่ Locations) หนึ่งจุดต่อหนึ่งโรงงาน.
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-700">Location *</label>
        <select
          value={location_id}
          onChange={(e) => setLocationId(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— เลือก Location —</option>
          {availableLocations.map((loc) => (
            <option key={loc.location_id} value={loc.location_id}>
              {loc.location_name} {loc.latitude != null ? `(${loc.latitude}, ${loc.longitude})` : ''}
            </option>
          ))}
          {availableLocations.length === 0 && (
            <option value="" disabled>ไม่มี Location ว่าง — สร้างจากเมนู Locations ก่อน</option>
          )}
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

export default function ManufacturersTable() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: getManufacturers,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
  });

  const createMutation = useMutation({
    mutationFn: createManufacturer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteManufacturer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
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
    createMutation.mutate(values);
  };

  if (isLoading) return <p className="text-slate-500">Loading manufacturers…</p>;
  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Failed to load manufacturers.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Manufacturers (โรงงาน)</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setError(null);
            setModalOpen(true);
          }}
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Add manufacturer
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
        filterPlaceholder="Filter manufacturers…"
        emptyMessage="No manufacturers."
      />
      <Modal
        title={editing ? 'View manufacturer' : 'New manufacturer'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setError(null);
        }}
      >
        <ManufacturerForm
          manufacturer={editing}
          locations={locations}
          manufacturers={data}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          isSubmitting={createMutation.isPending}
        />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete manufacturer"
        message={deleteTarget ? `Delete manufacturer "${deleteTarget.manufacturer_name}"?` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.manufacturer_id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
