import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getShipments, createShipment, startShipment, completeShipment } from '../api/shipments';
import { getBranches } from '../api/branches';
import { getTrucks } from '../api/trucks';
import StatusBadge from '../components/StatusBadge';
import UtilizationBar from '../components/UtilizationBar';
import Modal from '../components/Modal';

function isDraft(status) {
  const s = (status || '').toLowerCase().replace(/\s+/g, '_');
  return s === 'pending' || s === 'preparing';
}
function isInTransit(status) {
  const s = (status || '').toLowerCase().replace(/\s+/g, '_');
  return s === 'in_transit' || s === 'in transit';
}
function isCompleted(status) {
  const s = (status || '').toLowerCase();
  return s === 'delivered';
}

export default function ShipmentList() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState(null);

  const { data: shipments = [], isLoading, isError, error } = useQuery({
    queryKey: ['shipments'],
    queryFn: getShipments,
  });
  const { data: branches = [] } = useQuery({ queryKey: ['branches'], queryFn: getBranches });
  const { data: trucks = [] } = useQuery({ queryKey: ['trucks'], queryFn: getTrucks });

  const createMutation = useMutation({
    mutationFn: createShipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setCreateOpen(false);
      setCreateError(null);
    },
    onError: (err) => setCreateError(err.body?.message || err.message),
  });

  const startMutation = useMutation({
    mutationFn: startShipment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shipments'] }),
  });
  const completeMutation = useMutation({
    mutationFn: completeShipment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shipments'] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-500">Loading shipments…</p>
      </div>
    );
  }
  if (isError) {
    const msg = error?.body?.message || error?.message;
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p>Failed to load shipments.</p>
        {msg && <p className="mt-1 text-sm font-mono">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Shipment Management</h2>
        <button
          type="button"
          onClick={() => { setCreateOpen(true); setCreateError(null); }}
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          สร้าง Shipment
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Shipment ID</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Total Volume (m³)</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Cartons</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Truck Capacity</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Utilization %</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {shipments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No shipments.
                </td>
              </tr>
            ) : (
              shipments.map((s) => (
                <tr key={s.shipment_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/shipments/${s.shipment_id}`} className="font-medium text-sky-600 hover:underline">
                      {s.shipment_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">
                    {s.total_volume != null ? Number(s.total_volume).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">
                    {s.cartons != null ? Number(s.cartons).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">
                    {s.truck_capacity != null ? Number(s.truck_capacity).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 w-40">
                    <UtilizationBar percent={s.utilization_percent} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/shipments/${s.shipment_id}`}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View
                      </Link>
                      {isDraft(s.status) && (
                        <button
                          type="button"
                          onClick={() => startMutation.mutate(s.shipment_id)}
                          disabled={startMutation.isPending}
                          className="rounded bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                        >
                          {startMutation.isPending ? 'Starting…' : 'Start Shipment'}
                        </button>
                      )}
                      {isInTransit(s.status) && (
                        <button
                          type="button"
                          onClick={() => completeMutation.mutate(s.shipment_id)}
                          disabled={completeMutation.isPending}
                          className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {completeMutation.isPending ? 'Completing…' : 'Complete Shipment'}
                        </button>
                      )}
                      {isCompleted(s.status) && (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        title="สร้าง Shipment"
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateError(null); }}
      >
        <CreateShipmentForm
          branches={branches}
          trucks={trucks}
          onSubmit={(body) => createMutation.mutate(body)}
          onCancel={() => setCreateOpen(false)}
          isSubmitting={createMutation.isPending}
          error={createError}
        />
      </Modal>
    </div>
  );
}

function CreateShipmentForm({ branches, trucks, onSubmit, onCancel, isSubmitting, error }) {
  const [origin_branch_id, setOriginBranchId] = useState(branches[0]?.branch_id ?? '');
  const [destination_branch_id, setDestinationBranchId] = useState(branches[0]?.branch_id ?? '');
  const [truck_id, setTruckId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      origin_branch_id: Number(origin_branch_id),
      destination_branch_id: Number(destination_branch_id),
      truck_id: truck_id === '' ? undefined : Number(truck_id),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700">ต้นทาง (Origin branch)</label>
        <select
          value={origin_branch_id}
          onChange={(e) => setOriginBranchId(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">เลือกสาขา</option>
          {branches.map((b) => (
            <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">ปลายทาง (Destination branch)</label>
        <select
          value={destination_branch_id}
          onChange={(e) => setDestinationBranchId(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">เลือกสาขา</option>
          {branches.map((b) => (
            <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">รถบรรทุก (ไม่บังคับ)</label>
        <select
          value={truck_id}
          onChange={(e) => setTruckId(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">ไม่ระบุ</option>
          {trucks.map((t) => (
            <option key={t.truck_id} value={t.truck_id}>{t.plate_number} ({t.capacity_m3} m³)</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
          ยกเลิก
        </button>
        <button type="submit" disabled={isSubmitting} className="rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50">
          {isSubmitting ? 'กำลังสร้าง…' : 'สร้าง'}
        </button>
      </div>
    </form>
  );
}
