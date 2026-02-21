import { get, post, put, del } from './client';

export function getShipments() {
  return get('/api/shipments');
}

export function getShipmentById(id) {
  return get(`/api/shipments/${id}`);
}

export function getShipmentOrders(id) {
  return get(`/api/shipments/${id}/orders`);
}

export function createShipment(body) {
  return post('/api/shipments', body);
}

export function updateShipment(id, body) {
  return put(`/api/shipments/${id}`, body);
}

export function deleteShipment(id) {
  return del(`/api/shipments/${id}`);
}

export function assignTruck(shipmentId, truckId) {
  return put(`/api/shipments/${shipmentId}/assign-truck`, { truck_id: truckId });
}

export function startShipment(id) {
  return put(`/api/shipments/${id}/start`);
}

export function completeShipment(id) {
  return put(`/api/shipments/${id}/complete`);
}

export function getShipmentCapacity(id) {
  return get(`/api/shipments/${id}/capacity`);
}

export function autoAssignTruck(id) {
  return put(`/api/shipments/${id}/auto-assign`);
}

export function addOrdersToShipment(shipmentId, orderIds) {
  return post(`/api/shipments/${shipmentId}/orders`, { order_ids: orderIds });
}
