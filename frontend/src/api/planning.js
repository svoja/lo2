import { post } from './client';

/**
 * Preview volume/cartons/utilization for given branches and items.
 * Backend returns { total_volume, cartons, utilization_percent }.
 */
export function previewVolume(body) {
  return post('/api/planning/preview-volume', body);
}
