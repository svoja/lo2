import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getLocations, createLocation, updateLocation, deleteLocation } from '../api/locations';

const columns = (onEdit, onDelete) => [
  { key: 'location_id', label: 'ID', sortable: true },
  { key: 'location_name', label: 'Name', sortable: true },
  {
    key: 'used_by',
    label: 'Used by',
    sortable: false,
    render: (_, row) => {
      const parts = [];
      if (row.branch_id != null) parts.push(<Link key="b" to="/branches" className="text-sky-600 hover:underline text-sm">Branch #{row.branch_id}</Link>);
      if (row.dc_id != null) parts.push(<Link key="d" to="/dcs" className="text-sky-600 hover:underline text-sm">DC #{row.dc_id}</Link>);
      if (parts.length === 0) return '—';
      return <span className="flex items-center gap-2">{parts}</span>;
    },
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
    key: 'address',
    label: 'Address',
    sortable: false,
    render: (v) => (v ? String(v).slice(0, 40) + (String(v).length > 40 ? '…' : '') : '—'),
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

function LocationForm({ location, onSubmit, onCancel, isSubmitting }) {
  const [location_name, setLocationName] = useState(location?.location_name ?? '');
  const [latitude, setLatitude] = useState(location?.latitude != null ? String(location.latitude) : '');
  const [longitude, setLongitude] = useState(location?.longitude != null ? String(location.longitude) : '');
  const [address, setAddress] = useState(location?.address ?? '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      location_name: location_name.trim(),
      latitude: latitude === '' ? null : Number(latitude),
      longitude: longitude === '' ? null : Number(longitude),
      address: address.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Location name</label>
        <input
          type="text"
          value={location_name}
          onChange={(e) => setLocationName(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Latitude</label>
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Longitude</label>
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Address (optional)</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50">
          {isSubmitting ? 'Saving…' : (location ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
}

export default function LocationsTable() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
  });

  const createMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateLocation(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
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
      updateMutation.mutate({ id: editing.location_id, body: values });
    } else {
      createMutation.mutate(values);
    }
  };

  if (isLoading) return <p className="text-slate-500">Loading locations…</p>;
  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Failed to load locations.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Locations</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setError(null);
            setModalOpen(true);
          }}
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Add location
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
        filterPlaceholder="Filter locations…"
        emptyMessage="No locations."
      />
      <Modal
        title={editing ? 'Edit location' : 'New location'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setError(null);
        }}
      >
        <LocationForm
          location={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete location"
        message={deleteTarget ? `Delete location "${deleteTarget.location_name}"?` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.location_id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
