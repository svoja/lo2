import { get, post, put, del } from './client';

export function getProducts() {
  return get('/api/products');
}

export function getProductById(id) {
  return get(`/api/products/${id}`);
}

export function createProduct(body) {
  return post('/api/products', body);
}

export function updateProduct(id, body) {
  return put(`/api/products/${id}`, body);
}

export function deleteProduct(id) {
  return del(`/api/products/${id}`);
}
