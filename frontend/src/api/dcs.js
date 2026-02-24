import { get, post, put, del } from './client';

export function getDCs() {
  return get('/api/dcs');
}

export function getDCById(id) {
  return get(`/api/dcs/${id}`);
}

export function getBranchesByDC(dcId) {
  return get(`/api/dcs/${dcId}/branches`);
}

export function createDC(body) {
  return post('/api/dcs', body);
}

export function updateDC(id, body) {
  return put(`/api/dcs/${id}`, body);
}

export function deleteDC(id) {
  return del(`/api/dcs/${id}`);
}
