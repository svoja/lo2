import { get } from './client';

export function getDCs() {
  return get('/api/dcs');
}

export function getBranchesByDC(dcId) {
  return get(`/api/dcs/${dcId}/branches`);
}
