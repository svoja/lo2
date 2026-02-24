import { get, post, put, del } from './client';

export function getLocations() {
  return get('/api/locations');
}

export function getLocationById(id) {
  return get(`/api/locations/${id}`);
}

export function createLocation(body) {
  return post('/api/locations', body);
}

export function updateLocation(id, body) {
  return put(`/api/locations/${id}`, body);
}

export function deleteLocation(id) {
  return del(`/api/locations/${id}`);
}
