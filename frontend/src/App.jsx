import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import OrdersTable from './pages/OrdersTable';
import ShipmentList from './pages/ShipmentList';
import TrucksTable from './pages/TrucksTable';
import BranchesTable from './pages/BranchesTable';
import ReturnsTable from './pages/ReturnsTable';
import ShipmentDetail from './pages/ShipmentDetail';
import OrderDetail from './pages/OrderDetail';
import ReturnDetail from './pages/ReturnDetail';
import MapPage from './pages/MapPage';

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/map', label: 'Map' },
  { to: '/orders', label: 'Orders' },
  { to: '/shipments', label: 'Shipments' },
  { to: '/trucks', label: 'Trucks' },
  { to: '/branches', label: 'Branches' },
  { to: '/returns', label: 'Returns' },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-800 text-slate-100 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2 py-3 sm:h-14 sm:py-0">
            <h1 className="font-semibold text-lg tracking-tight">Logistics</h1>
            <nav className="flex flex-wrap gap-1">
              {nav.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
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
          <Route path="/shipments/:id" element={<ShipmentDetail />} />
          <Route path="/trucks" element={<TrucksTable />} />
          <Route path="/branches" element={<BranchesTable />} />
          <Route path="/returns" element={<ReturnsTable />} />
          <Route path="/returns/:id" element={<ReturnDetail />} />
        </Routes>
      </main>
    </div>
  );
}
