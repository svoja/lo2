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

/** Route stops (origin, destination, ordered branch stops) for map polyline */
export function getShipmentRouteStops(id) {
  return get(`/api/shipments/${id}/route-stops`);
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

export function completeShipment(id, body = {}) {
  return put(`/api/shipments/${id}/complete`, body);
}

/**
 * Receive inbound shipment (optional receipt_notes, receipt_damage).
 */
export function receiveShipment(id, body = {}) {
  return put(`/api/shipments/${id}/receive`, body);
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

/**
 * Create shipment with orders in one request.
 * Body: { route_id, dc_id, branches: [{ branch_id, items: [{ product_id, quantity }] }] }
 */
export function createWithOrders(body) {
  return post('/api/shipments/create-with-orders', body);
}

/**
 * Create Linehaul shipment (Manufacturer → DC).
 * Body: { manufacturer_id, dc_id, truck_id?, total_volume? }
 */
export function createLinehaul(body) {
  return post('/api/shipments/linehaul', body);
}
