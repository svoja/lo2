import { get } from './client';

export function getLocations() {
  return get('/api/locations');
}

export function getLocationById(id) {
  return get(`/api/locations/${id}`);
}
