import { get, post, put, del } from './client';

export function getManufacturers() {
  return get('/api/manufacturers');
}

export function getManufacturerById(id) {
  return get(`/api/manufacturers/${id}`);
}

export function createManufacturer(body) {
  return post('/api/manufacturers', body);
}

export function updateManufacturer(id, body) {
  return put(`/api/manufacturers/${id}`, body);
}

export function deleteManufacturer(id) {
  return del(`/api/manufacturers/${id}`);
}
