import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getRoutes } from '../api/routes';
import { getDCsByRoute } from '../api/routes';
import { getDCs } from '../api/dcs';
import { getBranches } from '../api/branches';
import { getLocations } from '../api/locations';
import { getManufacturers } from '../api/manufacturers';
import { getTrucks } from '../api/trucks';
import { getShipments, getShipmentRouteStops } from '../api/shipments';

import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [13.7563, 100.5018];
const DEFAULT_ZOOM = 6;
const TRUCK_ANIMATION_DURATION_MS = 15000; // full route in 15s, then repeat

function interpolate(positions, progress) {
  if (!positions || positions.length === 0) return null;
  if (positions.length === 1) return positions[0];
  const n = positions.length - 1;
  const i = Math.min(Math.floor(progress * n), n - 1);
  const t = (progress * n) - i;
  const [lat1, lng1] = positions[i];
  const [lat2, lng2] = positions[i + 1];
  return [lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t];
}

// Custom marker icons
function createIcon(color, label = '') {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #fff;
      font-weight: bold;
    ">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const DC_ICON = createIcon('#2563eb', 'DC');
const BRANCH_ICON = createIcon('#16a34a', 'B');
const MANUFACTURER_ICON = createIcon('#b45309', 'M');
const TRUCK_ICON = L.divIcon({
  className: 'custom-marker',
  html: `<div style="
    background: #ea580c;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  ">🚛</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FitBounds({ points }) {
  const map = useMap();
  const hasPoints = points.length > 0;
  if (hasPoints && map) {
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }
  return null;
}

function MovingTruckMarker({ positions, truck, isPaused }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!positions || positions.length < 2 || isPaused) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      let p = (elapsed / TRUCK_ANIMATION_DURATION_MS) % 1;
      setProgress(p);
    };
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [positions, isPaused]);

  const pos = useMemo(() => interpolate(positions, progress), [positions, progress]);
  if (!pos) return null;
  return (
    <Marker position={pos} icon={TRUCK_ICON}>
      <Popup>
        <strong>🚛 {truck.plate_number}</strong>
        <br />
        Shipment #{truck.shipment_id} — {truck.status}
        <br />
        {(truck.origin_is_dc ? `DC: ${truck.origin_branch ?? ''}` : truck.origin_branch) ?? '—'} → … → {truck.destination_branch ?? '—'}
      </Popup>
    </Marker>
  );
}

export default function MapPage() {
  const { data: routes = [], isLoading: routesLoading } = useQuery({ queryKey: ['routes'], queryFn: getRoutes });
  const { data: locations = [], isLoading: locationsLoading } = useQuery({ queryKey: ['locations'], queryFn: getLocations });
  const { data: dcs = [], isLoading: dcsLoading } = useQuery({ queryKey: ['dcs'], queryFn: getDCs });
  const { data: manufacturers = [], isLoading: manufacturersLoading } = useQuery({ queryKey: ['manufacturers'], queryFn: getManufacturers });
  const { data: branches = [], isLoading: branchesLoading } = useQuery({ queryKey: ['branches'], queryFn: getBranches });
  const { data: trucks = [], isLoading: trucksLoading } = useQuery({ queryKey: ['trucks'], queryFn: getTrucks });
  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({ queryKey: ['shipments'], queryFn: getShipments });

  const locationById = useMemo(() => Object.fromEntries((locations || []).map((l) => [l.location_id, l])), [locations]);

  const dcsByRouteQueries = useQueries({
    queries: (routes || []).map((route) => ({
      queryKey: ['dcsByRoute', route.route_id],
      queryFn: () => getDCsByRoute(route.route_id),
      enabled: !!route.route_id,
    })),
  });

  const activeShipments = useMemo(() => {
    const busy = (trucks || []).filter((t) => String(t.status || '').toLowerCase() === 'busy');
    return (shipments || [])
      .filter((s) => busy.some((t) => Number(t.truck_id) === Number(s.truck_id)) && (s.status === 'In Transit' || s.status === 'pending' || s.status === 'Preparing'))
      .map((s) => ({ ...s, truck: busy.find((t) => Number(t.truck_id) === Number(s.truck_id)) }));
  }, [trucks, shipments]);

  const routeStopsQueries = useQueries({
    queries: activeShipments.map((s) => ({
      queryKey: ['shipmentRouteStops', s.shipment_id],
      queryFn: () => getShipmentRouteStops(s.shipment_id),
      enabled: !!s.shipment_id,
    })),
  });

  const routeStopsByShipmentId = useMemo(() => {
    const out = {};
    activeShipments.forEach((s, i) => {
      const data = routeStopsQueries[i]?.data;
      if (data) out[s.shipment_id] = data;
    });
    return out;
  }, [activeShipments, routeStopsQueries]);

  const routePolylines = useMemo(() => {
    return (routes || []).map((route, routeIndex) => {
      const dcsList = dcsByRouteQueries[routeIndex]?.data || [];
      const hasCoords = (arr) => arr.every((p) => p?.latitude != null && p?.longitude != null);
      if (dcsList.length >= 2 && hasCoords(dcsList)) {
        const positions = dcsList.map((d) => [Number(d.latitude), Number(d.longitude)]);
        return { name: route.route_name, positions };
      }
      const start = route.start_location_id != null ? locationById[route.start_location_id] : null;
      const end = route.end_location_id != null ? locationById[route.end_location_id] : null;
      if (start?.latitude != null && end?.latitude != null) {
        return {
          name: route.route_name,
          positions: [[Number(start.latitude), Number(start.longitude)], [Number(end.latitude), Number(end.longitude)]],
        };
      }
      return null;
    }).filter(Boolean);
  }, [routes, locationById, dcsByRouteQueries]);

  const truckRoutePolylines = useMemo(() => {
    return activeShipments.map((s) => {
      const data = routeStopsByShipmentId[s.shipment_id];
      if (!data) return null;
      const positions = [];
      if (data.origin?.latitude != null && data.origin?.longitude != null) {
        positions.push([Number(data.origin.latitude), Number(data.origin.longitude)]);
      }
      (data.stops || []).forEach((stop) => {
        if (stop?.latitude != null && stop?.longitude != null) {
          positions.push([Number(stop.latitude), Number(stop.longitude)]);
        }
      });
      if (data.destination?.latitude != null && data.destination?.longitude != null) {
        positions.push([Number(data.destination.latitude), Number(data.destination.longitude)]);
      }
      if (positions.length < 2) return null;
      return { shipment_id: s.shipment_id, truck: s.truck, positions };
    }).filter(Boolean);
  }, [activeShipments, routeStopsByShipmentId]);

  const allPoints = useMemo(() => {
    const pts = [];
    (dcs || []).forEach((d) => {
      if (d.latitude != null && d.longitude != null) pts.push({ lat: Number(d.latitude), lng: Number(d.longitude) });
    });
    (manufacturers || []).forEach((m) => {
      if (m.latitude != null && m.longitude != null) pts.push({ lat: Number(m.latitude), lng: Number(m.longitude) });
    });
    (branches || []).forEach((b) => {
      if (b.latitude != null && b.longitude != null) pts.push({ lat: Number(b.latitude), lng: Number(b.longitude) });
    });
    truckRoutePolylines.forEach((tr) => tr.positions.forEach(([lat, lng]) => pts.push({ lat, lng })));
    return pts;
  }, [dcs, manufacturers, branches, truckRoutePolylines]);

  const isLoading = routesLoading || locationsLoading || dcsLoading || manufacturersLoading || branchesLoading || trucksLoading || shipmentsLoading;
  const dcsLoading_ = dcsByRouteQueries.some((q) => q.isLoading);

  if (isLoading || dcsLoading_) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500">
        Loading map…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold text-slate-800">Map — Routes, DCs, Branches &amp; active trucks</h2>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-600" /> Manufacturer
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600" /> DC
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-600" /> Branch
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-5 rounded bg-orange-500 text-center text-xs leading-5">🚛</span> Moving truck
          </span>
          <span className="text-slate-400">— Gray: routes (multi-DC); Orange: truck route</span>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm" style={{ height: 'calc(100vh - 220px)', minHeight: 400 }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {allPoints.length > 0 && <FitBounds points={allPoints} />}

          {/* Manufacturers */}
          {(manufacturers || []).map((m) => {
            const lat = m.latitude != null ? Number(m.latitude) : null;
            const lng = m.longitude != null ? Number(m.longitude) : null;
            if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
            return (
              <Marker key={`manufacturer-${m.manufacturer_id}`} position={[lat, lng]} icon={MANUFACTURER_ICON}>
                <Popup>
                  <strong>Manufacturer</strong> {m.manufacturer_name || m.name}
                  <br />
                  <span className="text-slate-500 text-xs">ID: {m.manufacturer_id}</span>
                </Popup>
              </Marker>
            );
          })}

          {/* Route lines (multi-stop through DCs) */}
          {routePolylines.map((r, i) => (
            <Polyline
              key={`route-${i}-${r.name}`}
              positions={r.positions}
              pathOptions={{ color: '#64748b', weight: 3, opacity: 0.8 }}
            />
          ))}

          {/* Truck route lines (origin → stops → destination) */}
          {truckRoutePolylines.map((tr) => (
            <Polyline
              key={`truck-route-${tr.shipment_id}`}
              positions={tr.positions}
              pathOptions={{ color: '#ea580c', weight: 4, opacity: 0.7, dashArray: '8 4' }}
            />
          ))}

          {/* DCs */}
          {(dcs || []).map((dc) => {
            const lat = dc.latitude != null ? Number(dc.latitude) : null;
            const lng = dc.longitude != null ? Number(dc.longitude) : null;
            if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
            return (
              <Marker key={`dc-${dc.dc_id}`} position={[lat, lng]} icon={DC_ICON}>
                <Popup>
                  <strong>DC</strong> {dc.dc_name}
                  <br />
                  <span className="text-slate-500 text-xs">ID: {dc.dc_id}</span>
                </Popup>
              </Marker>
            );
          })}

          {/* Branches */}
          {(branches || []).map((b) => {
            const lat = b.latitude != null ? Number(b.latitude) : null;
            const lng = b.longitude != null ? Number(b.longitude) : null;
            if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
            return (
              <Marker key={`branch-${b.branch_id}`} position={[lat, lng]} icon={BRANCH_ICON}>
                <Popup>
                  <strong>Branch</strong> {b.branch_name}
                  <br />
                  <span className="text-slate-500 text-xs">ID: {b.branch_id}</span>
                </Popup>
              </Marker>
            );
          })}

          {/* Moving trucks along their route */}
          {truckRoutePolylines.map((tr) => (
            <MovingTruckMarker
              key={`moving-${tr.shipment_id}`}
              positions={tr.positions}
              truck={{
                plate_number: tr.truck?.plate_number,
                shipment_id: tr.shipment_id,
                status: activeShipments.find((s) => s.shipment_id === tr.shipment_id)?.status,
                origin_branch: activeShipments.find((s) => s.shipment_id === tr.shipment_id)?.origin_branch,
                origin_is_dc: activeShipments.find((s) => s.shipment_id === tr.shipment_id)?.origin_is_dc,
                destination_branch: activeShipments.find((s) => s.shipment_id === tr.shipment_id)?.destination_branch,
              }}
              isPaused={false}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
