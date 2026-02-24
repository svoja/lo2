import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getManufacturers } from '../api/manufacturers';
import { getDCs } from '../api/dcs';
import { getTrucks } from '../api/trucks';
import { createLinehaul } from '../api/shipments';
import CreateShipmentPage from './CreateShipmentPage';

const STEP = { CHOOSE: 'choose', LINEHAUL: 'linehaul', LAST_MILE: 'lastmile' };

export default function CreateShipmentFlow({ onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(STEP.CHOOSE);
  const [manufacturer_id, setManufacturerId] = useState('');
  const [dc_id, setDcId] = useState('');
  const [truck_id, setTruckId] = useState('');
  const [total_volume, setTotalVolume] = useState('');

  const { data: manufacturers = [] } = useQuery({ queryKey: ['manufacturers'], queryFn: getManufacturers });
  const { data: dcs = [] } = useQuery({ queryKey: ['dcs'], queryFn: getDCs });
  const { data: trucks = [] } = useQuery({ queryKey: ['trucks'], queryFn: getTrucks });
  const linehaulTrucks = trucks.filter((t) => (t.truck_type || '').toString() === 'Linehaul');
  const availableLinehaulTrucks = linehaulTrucks.filter((t) => (t.status || '').toLowerCase() === 'available');

  const createLinehaulMutation = useMutation({
    mutationFn: createLinehaul,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      onSuccess?.();
    },
  });

  const handleBack = () => {
    if (step === STEP.LINEHAUL || step === STEP.LAST_MILE) {
      setStep(STEP.CHOOSE);
      setManufacturerId('');
      setDcId('');
      setTruckId('');
      setTotalVolume('');
      createLinehaulMutation.reset();
    } else {
      onCancel?.();
    }
  };

  const handleSubmitLinehaul = (e) => {
    e.preventDefault();
    const payload = {
      manufacturer_id: Number(manufacturer_id),
      dc_id: Number(dc_id),
    };
    if (truck_id) payload.truck_id = Number(truck_id);
    if (total_volume !== '' && total_volume != null) payload.total_volume = Number(total_volume);
    createLinehaulMutation.mutate(payload);
  };

  if (step === STEP.LAST_MILE) {
    return (
      <CreateShipmentPage
        onSuccess={onSuccess}
        onCancel={handleBack}
      />
    );
  }

  if (step === STEP.LINEHAUL) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">สร้าง Shipment แบบ Linehaul (Manufacturer → DC)</h2>
          <button
            type="button"
            onClick={handleBack}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← กลับ
          </button>
        </div>

        {createLinehaulMutation.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {createLinehaulMutation.error?.body?.message || createLinehaulMutation.error?.message || 'สร้างไม่สำเร็จ'}
          </div>
        )}

        <form onSubmit={handleSubmitLinehaul} className="max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Manufacturer (ต้นทาง)</label>
            <select
              value={manufacturer_id}
              onChange={(e) => setManufacturerId(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">— เลือก —</option>
              {manufacturers.map((m) => (
                <option key={m.manufacturer_id} value={m.manufacturer_id}>
                  {m.name || `Manufacturer #${m.manufacturer_id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">DC (ปลายทาง)</label>
            <select
              value={dc_id}
              onChange={(e) => setDcId(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">— เลือก —</option>
              {dcs.map((d) => (
                <option key={d.dc_id} value={d.dc_id}>
                  {d.dc_name || `DC #${d.dc_id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">รถบรรทุก (Linehaul) — ไม่บังคับ</label>
            <select
              value={truck_id}
              onChange={(e) => setTruckId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">— ไม่กำหนด (กำหนดภายหลัง) —</option>
              {availableLinehaulTrucks.map((t) => (
                <option key={t.truck_id} value={t.truck_id}>
                  {t.plate_number} ({t.capacity_m3} m³)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">ปริมาตรรวม (m³) — ไม่บังคับ</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={total_volume}
              onChange={(e) => setTotalVolume(e.target.value)}
              className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createLinehaulMutation.isPending || !manufacturer_id || !dc_id}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createLinehaulMutation.isPending ? 'กำลังสร้าง…' : 'สร้าง Linehaul Shipment'}
            </button>
            <button type="button" onClick={handleBack} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step: CHOOSE
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">สร้าง Shipment</h2>
        <button type="button" onClick={handleBack} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
          ← ยกเลิก
        </button>
      </div>
      <p className="text-slate-600">เลือกประเภทการส่ง:</p>
      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <button
          type="button"
          onClick={() => setStep(STEP.LINEHAUL)}
          className="rounded-lg border-2 border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-sky-400 hover:bg-sky-50/50 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <span className="block font-semibold text-slate-800">Manufacturer → DC (Linehaul)</span>
          <span className="mt-1 block text-sm text-slate-500">ส่งจากโรงงานไปยังศูนย์กระจายสินค้า (รถใหญ่)</span>
        </button>
        <button
          type="button"
          onClick={() => setStep(STEP.LAST_MILE)}
          className="rounded-lg border-2 border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-sky-400 hover:bg-sky-50/50 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <span className="block font-semibold text-slate-800">DC → Branch (Last Mile)</span>
          <span className="mt-1 block text-sm text-slate-500">ส่งจาก DC ไปสาขาตาม Route และคำสั่งซื้อ</span>
        </button>
      </div>
    </div>
  );
}
