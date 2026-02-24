import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoutes, getDCsByRoute } from '../api/routes';
import { getBranchesByDC } from '../api/dcs';
import { getManufacturers } from '../api/manufacturers';
import { getProducts } from '../api/products';
import { getTrucks } from '../api/trucks';
import { previewVolume } from '../api/planning';
import { createWithOrders, createLinehaul } from '../api/shipments';
import RouteSelector from '../components/RouteSelector';
import BranchMultiSelect from '../components/BranchMultiSelect';
import BranchOrderBuilder from '../components/BranchOrderBuilder';
import ShipmentSummaryCard from '../components/ShipmentSummaryCard';

const PREVIEW_DEBOUNCE_MS = 350;

export default function CreateShipmentPage({ onSuccess, onCancel }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEmbedded = typeof onCancel === 'function';
  const [selectedBranchesByDc, setSelectedBranchesByDc] = useState({});
  const [branchOrders, setBranchOrders] = useState({});
  const [truck_id, setTruckId] = useState('');
  const [preview, setPreview] = useState(null);
  const [linehaulManufacturerId, setLinehaulManufacturerId] = useState('');
  const [linehaulRouteId, setLinehaulRouteId] = useState(null);
  const [linehaulDcIds, setLinehaulDcIds] = useState([]);
  const [linehaulTruckId, setLinehaulTruckId] = useState('');
  const [linehaulVolume, setLinehaulVolume] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const debounceRef = useRef(null);

  const { data: routes = [] } = useQuery({ queryKey: ['routes'], queryFn: getRoutes });
  const { data: trucks = [] } = useQuery({ queryKey: ['trucks'], queryFn: getTrucks });
  const { data: manufacturers = [] } = useQuery({ queryKey: ['manufacturers'], queryFn: getManufacturers });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const availableTrucks = trucks.filter((t) => (t.status || '').toLowerCase() === 'available');
  const linehaulTrucks = availableTrucks.filter((t) => (t.truck_type || '').toString() === 'Linehaul');
  const lastMileTrucks = availableTrucks.filter((t) => (t.truck_type || 'LastMile').toString() === 'LastMile');

  const { data: linehaulDcs = [] } = useQuery({
    queryKey: ['dcs', linehaulRouteId],
    queryFn: () => getDCsByRoute(linehaulRouteId),
    enabled: !!linehaulRouteId,
  });

  const branchesQueries = useQueries({
    queries: (linehaulDcIds || []).map((dcId) => ({
      queryKey: ['branches', dcId],
      queryFn: () => getBranchesByDC(dcId),
      enabled: !!dcId,
    })),
  });
  const branchesByDc = linehaulDcIds.reduce((acc, dcId, i) => {
    acc[dcId] = branchesQueries[i]?.data ?? [];
    return acc;
  }, {});

  const toggleLinehaulDc = useCallback((dcId) => {
    const isRemoving = linehaulDcIds.includes(dcId);
    setLinehaulDcIds((prev) =>
      prev.includes(dcId) ? prev.filter((id) => id !== dcId) : [...prev, dcId]
    );
    if (isRemoving) {
      setSelectedBranchesByDc((prev) => {
        const next = { ...prev };
        delete next[dcId];
        return next;
      });
      setBranchOrders((prev) => {
        const next = { ...prev };
        (branchesByDc[dcId] || []).forEach((b) => delete next[b.branch_id]);
        return next;
      });
    }
  }, [linehaulDcIds, branchesByDc]);

  const handleBranchesChangeForDc = useCallback((dcId, next) => {
    setSelectedBranchesByDc((prev) => ({ ...prev, [dcId]: next }));
    setBranchOrders((prev) => {
      const out = { ...prev };
      next.forEach((bid) => {
        if (out[bid] == null) out[bid] = [];
      });
      const branches = branchesByDc[dcId] || [];
      branches.forEach((b) => {
        if (!next.includes(b.branch_id)) delete out[b.branch_id];
      });
      return out;
    });
  }, [branchesByDc]);

  const setItemsForBranch = useCallback((branchId, items) => {
    setBranchOrders((prev) => ({ ...prev, [branchId]: items }));
  }, []);

  const allSelectedBranches = linehaulDcIds.flatMap((dcId) => selectedBranchesByDc[dcId] ?? []);
  const allBranches = linehaulDcIds.flatMap((dcId) => branchesByDc[dcId] ?? []);
  const previewPayload = linehaulDcIds.flatMap((dcId) => {
    const branches = branchesByDc[dcId] ?? [];
    const branchIds = selectedBranchesByDc[dcId] ?? [];
    const ordered = [...branchIds].sort((a, b) => {
      const ia = branches.findIndex((br) => br.branch_id === a);
      const ib = branches.findIndex((br) => br.branch_id === b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return ordered.map((bid) => ({ branch_id: bid, items: branchOrders[bid] || [] }));
  });
  const hasAnyItems = previewPayload.some((b) => b.items.length > 0);
  const everyDcHasItems = linehaulDcIds.length > 0 && linehaulDcIds.every((dcId) => {
    const branchIds = selectedBranchesByDc[dcId] ?? [];
    return branchIds.some((bid) => (branchOrders[bid] || []).length > 0);
  });

  useEffect(() => {
    if (!hasAnyItems) {
      setPreview(null);
      setPreviewLoading(false);
      setPreviewError(null);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setPreviewLoading(true);
      setPreviewError(null);
      previewVolume({ branches: previewPayload })
        .then((data) => {
          setPreview(data);
          setPreviewError(null);
        })
        .catch((err) => {
          setPreview(null);
          setPreviewError(err.body?.message || err.message || 'Preview failed');
        })
        .finally(() => setPreviewLoading(false));
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [hasAnyItems, JSON.stringify(previewPayload)]);

  const createMutation = useMutation({
    mutationFn: async ({ linehaulDcIds: lhDcIds, lastMilePayloads }) => {
      if (lhDcIds?.length > 0 && linehaulManufacturerId) {
        for (let i = 0; i < lhDcIds.length; i++) {
          await createLinehaul({
            manufacturer_id: Number(linehaulManufacturerId),
            dc_id: Number(lhDcIds[i]),
            ...(i === 0 && linehaulTruckId ? { truck_id: Number(linehaulTruckId) } : {}),
            ...(linehaulVolume !== '' && linehaulVolume != null ? { total_volume: Number(linehaulVolume) } : {}),
          });
        }
      }
      for (const payload of lastMilePayloads) {
        await createWithOrders(payload);
      }
      return {};
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      if (onSuccess) onSuccess();
      else navigate('/shipments');
    },
  });

  const hasLinehaul = linehaulManufacturerId !== '' && linehaulRouteId != null && linehaulDcIds.length > 0;
  const canCreate =
    linehaulRouteId != null &&
    linehaulDcIds.length > 0 &&
    everyDcHasItems;

  const handleCreate = () => {
    if (!canCreate) return;
    const lastMilePayloads = linehaulDcIds.map((dcId, idx) => {
      const branches = branchesByDc[dcId] ?? [];
      const branchIds = selectedBranchesByDc[dcId] ?? [];
      const ordered = [...branchIds].sort((a, b) => {
        const ia = branches.findIndex((br) => br.branch_id === a);
        const ib = branches.findIndex((br) => br.branch_id === b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
      return {
        route_id: linehaulRouteId,
        dc_id: dcId,
        branches: ordered.map((bid) => ({ branch_id: bid, items: branchOrders[bid] || [] })),
        truck_id: idx === 0 && truck_id !== '' ? Number(truck_id) : undefined,
      };
    });
    createMutation.mutate({
      linehaulDcIds: hasLinehaul ? linehaulDcIds : [],
      lastMilePayloads,
    });
  };

  const branchIdToName = Object.fromEntries(allBranches.map((b) => [b.branch_id, b.branch_name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Create shipment</h2>
        <button
          type="button"
          onClick={() => (onCancel ? onCancel() : navigate('/shipments'))}
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          ← Back
        </button>
      </div>

      {createMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {createMutation.error?.body?.message || createMutation.error?.message || 'Failed to create shipment'}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-amber-800">Route &amp; destinations</h3>
            <p className="mb-4 text-xs text-slate-600">Select route and destination DCs. Optionally add Linehaul (manufacturer → DC).</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Manufacturer (optional)</label>
                <select
                  value={linehaulManufacturerId}
                  onChange={(e) => setLinehaulManufacturerId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">None</option>
                  {manufacturers.map((m) => (
                    <option key={m.manufacturer_id} value={m.manufacturer_id}>
                      {m.manufacturer_name || m.name || `Manufacturer #${m.manufacturer_id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Route</label>
                <RouteSelector
                  value={linehaulRouteId}
                  onChange={(id) => {
                    setLinehaulRouteId(id);
                    setLinehaulDcIds([]);
                  }}
                  routes={routes}
                  hideLabel
                />
              </div>
              {linehaulRouteId && (
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Destination DCs</label>
                  <div className="flex flex-wrap gap-3 rounded-md border border-slate-200 bg-white p-3">
                    {linehaulDcs.map((d) => (
                      <label key={d.dc_id} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={linehaulDcIds.includes(d.dc_id)}
                          onChange={() => toggleLinehaulDc(d.dc_id)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-sm text-slate-800">{d.dc_name || `DC #${d.dc_id}`}</span>
                      </label>
                    ))}
                    {linehaulDcs.length === 0 && <span className="text-sm text-slate-500">No DCs on this route</span>}
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Linehaul truck (optional)</label>
                <select
                  value={linehaulTruckId}
                  onChange={(e) => setLinehaulTruckId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">—</option>
                  {linehaulTrucks.map((t) => (
                    <option key={t.truck_id} value={t.truck_id}>
                      {t.plate_number} ({t.capacity_m3} m³)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Volume (m³) optional</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={linehaulVolume}
                  onChange={(e) => setLinehaulVolume(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="—"
                />
              </div>
            </div>
          </section>

          {linehaulDcIds.length > 0 && (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Branches by DC</h3>
              <div className="space-y-6">
                {linehaulDcIds.map((dcId) => {
                  const dc = linehaulDcs.find((d) => d.dc_id === dcId);
                  const branches = branchesByDc[dcId] ?? [];
                  const selectedForDc = selectedBranchesByDc[dcId] ?? [];
                  return (
                    <div key={dcId} className="rounded-md border border-slate-100 bg-slate-50/30 p-4">
                      <h4 className="mb-3 text-sm font-medium text-slate-700">{dc?.dc_name || `DC #${dcId}`}</h4>
                      <BranchMultiSelect
                        value={selectedForDc}
                        onChange={(next) => handleBranchesChangeForDc(dcId, next)}
                        dcId={dcId}
                        branches={branches}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="mb-2 block text-sm font-medium text-slate-700">Last-mile truck</label>
                <select
                  value={truck_id}
                  onChange={(e) => setTruckId(e.target.value)}
                  className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Assign later</option>
                  {lastMileTrucks.map((t) => (
                    <option key={t.truck_id} value={t.truck_id}>
                      {t.plate_number} ({t.capacity_m3} m³)
                    </option>
                  ))}
                </select>
              </div>
            </section>
          )}

          {allSelectedBranches.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Order items by branch
              </h3>
              <div className="space-y-4">
                {allSelectedBranches.map((branchId) => (
                  <div
                    key={branchId}
                    className="animate-in fade-in duration-200"
                    style={{ animation: 'fadeIn 0.2s ease-out' }}
                  >
                    <BranchOrderBuilder
                      branchId={branchId}
                      branchName={branchIdToName[branchId]}
                      items={branchOrders[branchId] || []}
                      onItemsChange={(items) => setItemsForBranch(branchId, items)}
                      products={products}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={!canCreate || createMutation.isPending}
              onClick={handleCreate}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {createMutation.isPending ? 'Creating…' : 'Create shipment'}
            </button>
            <button
              type="button"
              onClick={() => (onCancel ? onCancel() : navigate('/shipments'))}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <ShipmentSummaryCard
            total_volume={preview?.total_volume}
            cartons={preview?.cartons}
            utilization_percent={preview?.utilization_percent}
            loading={previewLoading}
            error={previewError}
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
