import { get, post, put, del } from './client';

export function getTrucks() {
  return get('/api/trucks');
}

export function getTruckById(id) {
  return get(`/api/trucks/${id}`);
}

export function createTruck(body) {
  return post('/api/trucks', body);
}

export function updateTruck(id, body) {
  return put(`/api/trucks/${id}`, body);
}

export function deleteTruck(id) {
  return del(`/api/trucks/${id}`);
}
