import { get } from './client';

export function getRoutes() {
  return get('/api/routes');
}

export function getDCsByRoute(routeId) {
  return get(`/api/routes/${routeId}/dcs`);
}
