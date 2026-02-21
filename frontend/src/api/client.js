const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(res.statusText);
    err.status = res.status;
    try {
      err.body = text ? JSON.parse(text) : {};
    } catch {
      err.body = { message: text || res.statusText };
    }
    throw err;
  }
  if (!text) return null;
  return JSON.parse(text);
}

export function get(path) {
  return request(path, { method: 'GET' });
}

export function post(path, body) {
  return request(path, { method: 'POST', body: JSON.stringify(body) });
}

export function put(path, body) {
  return request(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
}

export function del(path) {
  return request(path, { method: 'DELETE' });
}

export default { get, post, put, del };
