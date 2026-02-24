import { useState, useRef, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import OrdersTable from './pages/OrdersTable';
import ShipmentList from './pages/ShipmentList';
import TrucksTable from './pages/TrucksTable';
import BranchesTable from './pages/BranchesTable';
import ReturnsTable from './pages/ReturnsTable';
import ProductsTable from './pages/ProductsTable';
import RoutesTable from './pages/RoutesTable';
import LocationsTable from './pages/LocationsTable';
import DCsTable from './pages/DCsTable';
import ManufacturersTable from './pages/ManufacturersTable';
import ShipmentDetail from './pages/ShipmentDetail';
import ShipmentsTable from './pages/ShipmentsTable';
import OrderDetail from './pages/OrderDetail';
import ReturnDetail from './pages/ReturnDetail';
import MapPage from './pages/MapPage';

const managementPaths = ['/orders', '/trucks', '/branches', '/returns', '/products', '/routes', '/locations', '/dcs', '/manufacturers', '/shipments-table'];
const managementLinks = [
  { to: '/orders', label: 'Orders' },
  { to: '/trucks', label: 'Trucks' },
  { to: '/branches', label: 'Branches' },
  { to: '/returns', label: 'Returns' },
  { to: '/products', label: 'Products' },
  { to: '/routes', label: 'Routes' },
  { to: '/locations', label: 'Locations' },
  { to: '/dcs', label: 'DCs' },
  { to: '/manufacturers', label: 'Manufacturers' },
  { to: '/shipments-table', label: 'Shipments' },
];

function NavManagement() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isActive = managementPaths.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
        }`}
      >
        Management ▾
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-40 rounded-md border border-slate-600 bg-slate-800 py-1 shadow-lg z-50">
          {managementLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive: active }) =>
                `block px-4 py-2 text-sm ${active ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-800 text-slate-100 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2 py-3 sm:h-14 sm:py-0">
            <h1 className="font-semibold text-lg tracking-tight">Logistics</h1>
            <nav className="flex flex-wrap items-center gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/shipments"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`
                }
              >
                Shipments
              </NavLink>
              <NavLink
                to="/map"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`
                }
              >
                Map
              </NavLink>
              <NavManagement />
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/orders" element={<OrdersTable />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/shipments" element={<ShipmentList />} />
          <Route path="/shipments-table" element={<ShipmentsTable />} />
          <Route path="/shipments/:id" element={<ShipmentDetail />} />
          <Route path="/trucks" element={<TrucksTable />} />
          <Route path="/branches" element={<BranchesTable />} />
          <Route path="/returns" element={<ReturnsTable />} />
          <Route path="/returns/:id" element={<ReturnDetail />} />
          <Route path="/products" element={<ProductsTable />} />
          <Route path="/routes" element={<RoutesTable />} />
          <Route path="/locations" element={<LocationsTable />} />
          <Route path="/dcs" element={<DCsTable />} />
          <Route path="/manufacturers" element={<ManufacturersTable />} />
        </Routes>
      </main>
    </div>
  );
}
