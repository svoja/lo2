import { get, post, put, del } from './client';

export function getBranches() {
  return get('/api/branches');
}

export function getBranchById(id) {
  return get(`/api/branches/${id}`);
}

export function createBranch(body) {
  return post('/api/branches', body);
}

export function updateBranch(id, body) {
  return put(`/api/branches/${id}`, body);
}

export function deleteBranch(id) {
  return del(`/api/branches/${id}`);
}
