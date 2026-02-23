import { get } from './client';

export function getBranchesByDC(dcId) {
  return get(`/api/dcs/${dcId}/branches`);
}
