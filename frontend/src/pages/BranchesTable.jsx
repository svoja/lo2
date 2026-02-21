import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getBranches, createBranch, updateBranch, deleteBranch } from '../api/branches';

const columns = (onEdit, onDelete) => [
  { key: 'branch_id', label: 'ID', sortable: true },
  { key: 'branch_name', label: 'Name', sortable: true },
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

function BranchForm({ branch, onSubmit, onCancel, isSubmitting }) {
  const [branch_name, setBranchName] = useState(branch?.branch_name ?? '');
  const [latitude, setLatitude] = useState(branch?.latitude != null ? String(branch.latitude) : '');
  const [longitude, setLongitude] = useState(branch?.longitude != null ? String(branch.longitude) : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      branch_name: branch_name.trim(),
      latitude: latitude.trim() === '' ? null : Number(latitude),
      longitude: longitude.trim() === '' ? null : Number(longitude),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Name</label>
        <input
          type="text"
          value={branch_name}
          onChange={(e) => setBranchName(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
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
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50">
          {isSubmitting ? 'Saving…' : (branch ? 'Update' : 'Create')}
        </button>
      </div>
    </form>
  );
}

export default function BranchesTable() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
  });

  const createMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateBranch(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setModalOpen(false);
      setEditing(null);
      setError(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setDeleteTarget(null);
    },
    onError: (err) => setError(err.body?.message || err.message),
  });

  const handleSubmit = (values) => {
    setError(null);
    if (editing) {
      updateMutation.mutate({ id: editing.branch_id, body: values });
    } else {
      createMutation.mutate(values);
    }
  };

  if (isLoading) return <p className="text-slate-500">Loading branches…</p>;
  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Failed to load branches.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Branches</h2>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setError(null);
            setModalOpen(true);
          }}
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Add branch
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
        filterPlaceholder="Filter branches…"
        emptyMessage="No branches."
      />
      <Modal
        title={editing ? 'Edit branch' : 'New branch'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setError(null);
        }}
      >
        <BranchForm
          branch={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete branch"
        message={deleteTarget ? `Delete "${deleteTarget.branch_name}"?` : ''}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.branch_id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
