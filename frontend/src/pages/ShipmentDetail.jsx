import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getShipmentById,
  assignTruck,
  startShipment,
  completeShipment,
  autoAssignTruck,
  addOrdersToShipment,
} from '../api/shipments';
import { getOrders } from '../api/orders';
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

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTruckId, setSelectedTruckId] = useState('');
  const [actionError, setActionError] = useState(null);
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  const { data: shipment, isLoading, isError, error } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => getShipmentById(id),
    enabled: !!id,
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks'],
    queryFn: getTrucks,
  });
  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  const invalidate = () => {
    setActionError(null);
    queryClient.invalidateQueries({ queryKey: ['shipment', id] });
    queryClient.invalidateQueries({ queryKey: ['shipments'] });
    queryClient.invalidateQueries({ queryKey: ['trucks'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const assignMutation = useMutation({
    mutationFn: () => assignTruck(id, Number(selectedTruckId)),
    onSuccess: invalidate,
    onError: (err) => setActionError(err.body?.message || err.message),
  });

  const startMutation = useMutation({
    mutationFn: () => startShipment(id),
    onSuccess: invalidate,
    onError: (err) => setActionError(err.body?.message || err.message),
  });

  const completeMutation = useMutation({
    mutationFn: () => completeShipment(id),
    onSuccess: invalidate,
    onError: (err) => setActionError(err.body?.message || err.message),
  });

  const autoAssignMutation = useMutation({
    mutationFn: () => autoAssignTruck(id),
    onSuccess: invalidate,
    onError: (err) => setActionError(err.body?.message || err.message),
  });

  const addOrdersMutation = useMutation({
    mutationFn: (orderIds) => addOrdersToShipment(id, orderIds),
    onSuccess: () => {
      invalidate();
      setAddOrderOpen(false);
      setSelectedOrderIds([]);
    },
    onError: (err) => setActionError(err.body?.message || err.message),
  });

  const ordersInShipment = shipment?.orders ?? [];
  const orderIdsInShipment = new Set(ordersInShipment.map((o) => o.order_id));
  const availableOrders = allOrders.filter(
    (o) => (o.shipment_id == null) && !orderIdsInShipment.has(o.order_id)
  );

  const availableTrucks = trucks.filter((t) => (t.status || '').toLowerCase() === 'available');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-500">Loading shipment…</p>
      </div>
    );
  }
  if (isError || !shipment) {
    const msg = error?.body?.message || error?.message;
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p>Shipment not found.</p>
        {msg && <p className="mt-1 text-sm font-mono">{msg}</p>}
        <button
          type="button"
          onClick={() => navigate('/shipments')}
          className="mt-2 text-sky-600 hover:underline"
        >
          Back to shipments
        </button>
      </div>
    );
  }

  const handleAddOrders = () => {
    if (selectedOrderIds.length === 0) return;
    addOrdersMutation.mutate(selectedOrderIds);
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((x) => x !== orderId) : [...prev, orderId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Shipment {shipment.shipment_id}</h2>
        <button
          type="button"
          onClick={() => navigate('/shipments')}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to list
        </button>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {actionError}
        </div>
      )}

      {/* Summary card: volume, cartons, truck capacity, utilization */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Summary
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Total Volume (m³)</dt>
            <dd className="mt-0.5 font-semibold text-slate-800 tabular-nums">
              {shipment.total_volume != null ? Number(shipment.total_volume).toLocaleString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Cartons</dt>
            <dd className="mt-0.5 font-semibold text-slate-800 tabular-nums">
              {shipment.cartons != null ? Number(shipment.cartons).toLocaleString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Truck Capacity (m³)</dt>
            <dd className="mt-0.5 font-semibold text-slate-800 tabular-nums">
              {shipment.truck_capacity != null ? Number(shipment.truck_capacity).toLocaleString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Utilization %</dt>
            <dd className="mt-1">
              <UtilizationBar percent={shipment.utilization_percent} />
            </dd>
          </div>
        </div>
      </div>

      {/* Shipment info */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Origin</dt>
            <dd className="font-medium text-slate-800">{shipment.origin_branch ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Destination</dt>
            <dd className="font-medium text-slate-800">{shipment.destination_branch ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Truck</dt>
            <dd className="font-medium text-slate-800">{shipment.truck_plate ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Status</dt>
            <dd>
              <StatusBadge status={shipment.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Departure time</dt>
            <dd className="font-medium text-slate-800">{shipment.departure_time ?? '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Actions: Assign truck, Start, Complete */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedTruckId}
            onChange={(e) => setSelectedTruckId(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">Select truck</option>
            {availableTrucks.map((t) => (
              <option key={t.truck_id} value={t.truck_id}>
                {t.plate_number} ({t.capacity_m3} m³)
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedTruckId || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
            className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-600 disabled:opacity-50"
          >
            {assignMutation.isPending ? 'Assigning…' : 'Assign truck'}
          </button>
        </div>
        <button
          type="button"
          disabled={autoAssignMutation.isPending}
          onClick={() => autoAssignMutation.mutate()}
          className="rounded-md bg-slate-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-500 disabled:opacity-50"
        >
          {autoAssignMutation.isPending ? 'Assigning…' : 'Auto-assign truck'}
        </button>
        {isDraft(shipment.status) && (
          <button
            type="button"
            disabled={startMutation.isPending}
            onClick={() => startMutation.mutate()}
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-500 disabled:opacity-50"
          >
            {startMutation.isPending ? 'Starting…' : 'Start Shipment'}
          </button>
        )}
        {isInTransit(shipment.status) && (
          <button
            type="button"
            disabled={completeMutation.isPending}
            onClick={() => completeMutation.mutate()}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            {completeMutation.isPending ? 'Completing…' : 'Complete Shipment'}
          </button>
        )}
      </div>

      {/* Orders in shipment */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="font-semibold text-slate-800">Orders in this shipment</h3>
          {!isCompleted(shipment.status) && (
            <button
              type="button"
              onClick={() => setAddOrderOpen(true)}
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Add Order
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          {ordersInShipment.length === 0 ? (
            <p className="px-4 py-8 text-center text-slate-500">No orders in this shipment.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Order ID</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Amount</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Volume</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Cartons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ordersInShipment.map((o) => (
                  <tr key={o.order_id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-800">{o.order_id}</td>
                    <td className="px-4 py-2 text-slate-700">{o.order_date ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-700">{o.status ?? '—'}</td>
                    <td className="px-4 py-2 tabular-nums text-slate-700">
                      {o.total_amount != null ? Number(o.total_amount).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-slate-700">
                      {o.total_volume != null ? Number(o.total_volume).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-slate-700">
                      {o.box_count != null ? Number(o.box_count).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Order modal */}
      <Modal
        title="Add Order"
        open={addOrderOpen}
        onClose={() => {
          setAddOrderOpen(false);
          setSelectedOrderIds([]);
          setActionError(null);
        }}
      >
        <div className="space-y-3">
          {availableOrders.length === 0 ? (
            <p className="text-slate-500">No available orders to add (all orders are already in a shipment).</p>
          ) : (
            <>
              <p className="text-sm text-slate-600">Select orders to add to this shipment.</p>
              <div className="max-h-64 overflow-y-auto rounded border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="w-8 px-2 py-2"></th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-700">Order ID</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-700">Branch</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-700">Status</th>
                      <th className="px-2 py-2 text-left font-semibold text-slate-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {availableOrders.map((o) => (
                      <tr
                        key={o.order_id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => toggleOrderSelection(o.order_id)}
                      >
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(o.order_id)}
                            onChange={() => toggleOrderSelection(o.order_id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="px-2 py-2 font-medium">{o.order_id}</td>
                        <td className="px-2 py-2">{o.branch_name ?? '—'}</td>
                        <td className="px-2 py-2">{o.status ?? '—'}</td>
                        <td className="px-2 py-2 tabular-nums">{o.total_amount != null ? Number(o.total_amount).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddOrderOpen(false)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedOrderIds.length === 0 || addOrdersMutation.isPending}
                  onClick={handleAddOrders}
                  className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {addOrdersMutation.isPending ? 'Adding…' : `Add ${selectedOrderIds.length} order(s)`}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
