import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getRoutes, createRoute, updateRoute, deleteRoute } from '../api/routes';
import { getLocations } from '../api/locations';
import { getDCs } from '../api/dcs';

const columns = (onEdit, onDelete, dcs = []) => [
  { key: 'route_id', label: 'ID', sortable: true },
  { key: 'route_name', label: 'Route name', sortable: true },
  {
    key: 'start_location_name',
    label: 'Start',
    sortable: true,
    render: (v) => v || '—',
  },
  {
    key: 'end_location_name',
    label: 'End',
    sortable: true,
    render: (v) => v || '—',
  },
  {
    key: 'dcs',
    label: 'DCs',
    sortable: false,
    render: (_, row) => {
      const routeDCs = (dcs || []).filter((d) => d.route_id != null && Number(d.route_id) === Number(row.route_id));
      if (routeDCs.length === 0) return '—';
      return routeDCs.map((d) => d.dc_name ?? `DC ${d.dc_id}`).join(', ');
    },
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

function RouteForm({ route, locations = [], onSubmit, onCancel, isSubmitting }) {
  const [route_name, setRouteName] = useState(route?.route_name ?? '');
  const [start_location_id, setStartLocationId] = useState(route?.start_location_id ?? '');
  const [end_location_id, setEndLocationId] = useState(route?.end_location_id ?? '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      route_name: route_name.trim(),
      start_location_id: start_location_id === '' ? null : Number(start_location_id),
      end_location_id: end_location_id === '' ? null : Number(end_location_id),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Route name</label>
        <input
          type="text"
          value={route_name}
          onChange={(e) => setRouteName(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Start location</label>
        <select
          value={start_location_id}
          onChange={(e) => setStartLocationId(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— None —</option>
          {locations.map((loc) => (
            <option key={loc.location_id} value={loc.location_id}>
              {loc.location_name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">End location</label>
        <select
          value={end_location_id}
          onChange={(e) => setEndLocationId(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— None —</option>
          {locations.map((loc) => (
            <option key={loc.location_id} value={loc.location_id}>
              {loc.location_name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50">
          {isSubmitting ? 'Saving…' : (route ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
}

export default function RoutesTable() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['routes'],
    queryFn: getRoutes,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
  });
  const { data: dcs = [] } = useQuery({
    queryKey: ['dcs'],
    queryFn: getDCs,
  });

  const createMutation = useMutation({
    mutationFn: createRoute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateRoute(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRoute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setDeleteTarget(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const handleSubmit = (values) => {
    setError(null);
    if (editing) {
      updateMutation.mutate({ id: editing.route_id, body: values });
    } else {
      createMutation.mutate(values);
    }
  };

  if (isLoading) return <p className="text-slate-500">Loading routes…</p>;
  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Failed to load routes.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Routes</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setError(null);
            setModalOpen(true);
          }}
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Add route
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
          setDeleteTarget,
          dcs
        )}
        data={data}
        filterPlaceholder="Filter routes…"
        emptyMessage="No routes."
      />
      <Modal
        title={editing ? 'Edit route' : 'New route'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setError(null);
        }}
      >
        <RouteForm
          route={editing}
          locations={locations}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete route"
        message={deleteTarget ? `Delete route "${deleteTarget.route_name}"?` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.route_id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
