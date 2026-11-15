export async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { ...(typeof options.body === 'string' ? { 'content-type': 'application/json' } : {}), ...options.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'Permintaan belum berhasil.');
    error.status = response.status;
    throw error;
  }
  return result;
}
