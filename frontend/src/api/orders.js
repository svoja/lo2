import { get, post, put, del } from './client';

export function getOrders() {
  return get('/api/orders');
}

export function getOrderById(id) {
  return get(`/api/orders/${id}`);
}

export function createOrder(body) {
  return post('/api/orders', body);
}

export function updateOrder(id, body) {
  return put(`/api/orders/${id}`, body);
}

export function updateOrderItems(id, body) {
  return put(`/api/orders/${id}/items`, body);
}

export function deleteOrder(id) {
  return del(`/api/orders/${id}`);
}
