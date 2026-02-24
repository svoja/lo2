import { get, post, put, del } from './client';

export function getRoutes() {
  return get('/api/routes');
}

export function getRouteById(id) {
  return get(`/api/routes/${id}`);
}

export function getDCsByRoute(routeId) {
  return get(`/api/routes/${routeId}/dcs`);
}

export function createRoute(body) {
  return post('/api/routes', body);
}

export function updateRoute(id, body) {
  return put(`/api/routes/${id}`, body);
}

export function deleteRoute(id) {
  return del(`/api/routes/${id}`);
}
