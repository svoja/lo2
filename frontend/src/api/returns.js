import { get, post, put, del } from './client';

export function getReturns() {
  return get('/api/returns');
}

export function getReturnById(id) {
  return get(`/api/returns/${id}`);
}

export function createReturn(body) {
  return post('/api/returns', body);
}

export function updateReturn(id, body) {
  return put(`/api/returns/${id}`, body);
}

export function deleteReturn(id) {
  return del(`/api/returns/${id}`);
}
