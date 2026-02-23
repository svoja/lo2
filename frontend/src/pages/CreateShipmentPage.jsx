import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoutes, getDCsByRoute } from '../api/routes';
import { getBranchesByDC } from '../api/dcs';
import { getProducts } from '../api/products';
import { getTrucks } from '../api/trucks';
import { previewVolume } from '../api/planning';
import { createWithOrders } from '../api/shipments';
import RouteSelector from '../components/RouteSelector';
import DCSelector from '../components/DCSelector';
import BranchMultiSelect from '../components/BranchMultiSelect';
import BranchOrderBuilder from '../components/BranchOrderBuilder';
import ShipmentSummaryCard from '../components/ShipmentSummaryCard';

const PREVIEW_DEBOUNCE_MS = 350;

export default function CreateShipmentPage({ onSuccess, onCancel }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEmbedded = typeof onCancel === 'function';
  const [route_id, setRouteId] = useState(null);
  const [dc_id, setDcId] = useState(null);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [branchOrders, setBranchOrders] = useState({});
  const [truck_id, setTruckId] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const debounceRef = useRef(null);

  const { data: routes = [] } = useQuery({ queryKey: ['routes'], queryFn: getRoutes });
  const { data: trucks = [] } = useQuery({ queryKey: ['trucks'], queryFn: getTrucks });
  const availableTrucks = trucks.filter((t) => (t.status || '').toLowerCase() === 'available');
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: dcs = [] } = useQuery({
    queryKey: ['dcs', route_id],
    queryFn: () => getDCsByRoute(route_id),
    enabled: !!route_id,
  });
  const { data: branches = [] } = useQuery({
    queryKey: ['branches', dc_id],
    queryFn: () => getBranchesByDC(dc_id),
    enabled: !!dc_id,
  });

  const handleRouteChange = useCallback((id) => {
    setRouteId(id);
    setDcId(null);
    setSelectedBranches([]);
    setBranchOrders({});
    setPreview(null);
    setPreviewError(null);
  }, []);

  const handleDCChange = useCallback((id) => {
    setDcId(id);
    setSelectedBranches([]);
    setBranchOrders({});
    setPreview(null);
    setPreviewError(null);
  }, []);

  const handleBranchesChange = useCallback((next) => {
    setSelectedBranches(next);
    setBranchOrders((prev) => {
      const out = { ...prev };
      next.forEach((bid) => {
        if (out[bid] == null) out[bid] = [];
      });
      Object.keys(out).forEach((key) => {
        const id = Number(key);
        if (!next.includes(id)) delete out[id];
      });
      return out;
    });
  }, []);

  const setItemsForBranch = useCallback((branchId, items) => {
    setBranchOrders((prev) => ({ ...prev, [branchId]: items }));
  }, []);

  const previewPayload = selectedBranches.map((bid) => ({
    branch_id: bid,
    items: branchOrders[bid] || [],
  }));
  const hasAnyItems = previewPayload.some((b) => b.items.length > 0);

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
    mutationFn: createWithOrders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      if (onSuccess) onSuccess();
      else navigate('/shipments');
    },
  });

  const canCreate =
    route_id != null &&
    dc_id != null &&
    selectedBranches.length > 0 &&
    hasAnyItems;

  const handleCreate = () => {
    if (!canCreate) return;
    createMutation.mutate({
      route_id,
      dc_id,
      branches: previewPayload,
      truck_id: truck_id === '' ? undefined : Number(truck_id),
    });
  };

  const branchIdToName = Object.fromEntries(branches.map((b) => [b.branch_id, b.branch_name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Create Shipment</h2>
        <button
          type="button"
          onClick={() => (onCancel ? onCancel() : navigate('/shipments'))}
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          {isEmbedded ? '← ยกเลิก' : '← Back to Shipments'}
        </button>
      </div>

      {createMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {createMutation.error?.body?.message || createMutation.error?.message || 'Failed to create shipment'}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Route &amp; DC</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <RouteSelector value={route_id} onChange={handleRouteChange} routes={routes} />
              <DCSelector
                value={dc_id}
                onChange={handleDCChange}
                routeId={route_id}
                dcs={dcs}
              />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Branches</h3>
            <BranchMultiSelect
              value={selectedBranches}
              onChange={handleBranchesChange}
              dcId={dc_id}
              branches={branches}
            />
            {selectedBranches.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="mb-2 block text-sm font-medium text-slate-700">Assign truck</label>
                <select
                  value={truck_id}
                  onChange={(e) => setTruckId(e.target.value)}
                  className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">— No truck (assign later) —</option>
                  {availableTrucks.map((t) => (
                    <option key={t.truck_id} value={t.truck_id}>
                      {t.plate_number} ({t.capacity_m3} m³)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {selectedBranches.length > 0 && (
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Products per branch
              </h3>
              <div className="space-y-4">
                {selectedBranches.map((branchId) => (
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
              {createMutation.isPending ? 'Creating…' : 'Create Shipment'}
            </button>
            <button
              type="button"
              onClick={() => (onCancel ? onCancel() : navigate('/shipments'))}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors duration-200"
            >
              {isEmbedded ? 'ยกเลิก' : 'Cancel'}
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
