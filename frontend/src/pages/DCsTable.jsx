import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getDCs, createDC, updateDC, deleteDC } from '../api/dcs';
import { getLocations } from '../api/locations';
import { getRoutes } from '../api/routes';

const columns = (onEdit, onDelete) => [
  { key: 'dc_id', label: 'ID', sortable: true },
  { key: 'dc_name', label: 'Name', sortable: true },
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
    key: 'route_name',
    label: 'Route',
    sortable: true,
    render: (v) => v || '—',
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
        <button
          type="button"
          onClick={() => onEdit(row)}
          className="text-sky-600 hover:underline text-sm"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(row)}
          className="text-red-600 hover:underline text-sm"
        >
          Delete
        </button>
      </div>
    ),
  },
];

// DC = Location + Route. ชื่อ/พิกัดอยู่ที่ Location.
function DCForm({ dc, locations = [], dcs = [], routes = [], onSubmit, onCancel, isSubmitting }) {
  const isEdit = !!dc?.dc_id;
  const usedLocationIds = (dcs || []).map((d) => d.location_id);
  const availableLocations = (locations || []).filter((loc) => !usedLocationIds.includes(loc.location_id));

  const [location_id, setLocationId] = useState(dc?.location_id ?? '');
  const [route_id, setRouteId] = useState(dc?.route_id != null ? String(dc.route_id) : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEdit) {
      onSubmit({ route_id: route_id === '' ? null : Number(route_id) });
    } else {
      onSubmit({
        location_id: Number(location_id),
        route_id: route_id === '' ? null : Number(route_id),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!isEdit && (
        <>
          <p className="text-sm text-slate-600">
            DC คือการผูก <strong>Location</strong> (ชื่อและพิกัดอยู่ที่ Location) กับ <strong>Route</strong>. สร้าง Location จากเมนู Locations ก่อน แล้วมาเลือกที่นี่.
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
        </>
      )}
      {isEdit && (
        <p className="text-sm text-slate-600">
          ชื่อและพิกัดแก้ที่ <Link to="/locations" className="text-sky-600 hover:underline">Locations</Link>. ด้านล่างแก้เฉพาะ Route ของ DC นี้.
        </p>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700">Route</label>
        <select
          value={route_id}
          onChange={(e) => setRouteId(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">— None —</option>
          {(routes || []).map((r) => (
            <option key={r.route_id} value={r.route_id}>{r.route_name}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50">
          {isSubmitting ? 'Saving…' : (dc ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
}

export default function DCsTable() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['dcs'],
    queryFn: getDCs,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
  });
  const { data: routes = [] } = useQuery({
    queryKey: ['routes'],
    queryFn: getRoutes,
  });

  const createMutation = useMutation({
    mutationFn: createDC,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dcs'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateDC(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dcs'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDC,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dcs'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setDeleteTarget(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const handleSubmit = (values) => {
    setError(null);
    if (editing) {
      updateMutation.mutate({ id: editing.dc_id, body: values });
    } else {
      createMutation.mutate(values);
    }
  };

  if (isLoading) return <p className="text-slate-500">Loading DCs…</p>;
  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Failed to load DCs.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">DCs (Distribution Centers)</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setError(null);
            setModalOpen(true);
          }}
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Add DC
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
        filterPlaceholder="Filter DCs…"
        emptyMessage="No DCs."
      />
      <Modal
        title={editing ? 'Edit DC' : 'New DC'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setError(null);
        }}
      >
        <DCForm
          dc={editing}
          locations={locations}
          dcs={data}
          routes={routes}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete DC"
        message={deleteTarget ? `Delete DC "${deleteTarget.dc_name}"? Branches linked to this DC will have their DC cleared.` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.dc_id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
