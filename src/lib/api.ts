import {env} from '../config/env';

export const API_BASE = env.apiBase;
export function resolveApiBase() { return API_BASE; }
export class ApiError extends Error { status: number; errors?: Record<string, string[]>; constructor(status: number, message: string, errors?: Record<string, string[]>) { super(message); this.status = status; this.errors = errors; } get firstError() { return this.errors ? Object.values(this.errors)[0]?.[0] || this.message : this.message; } }
let tokenGetter: () => string | null = () => null;
export function setTokenGetter(getter: () => string | null) { tokenGetter = getter; }
type RequestOptions = {method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; signal?: AbortSignal};
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {method: options.method || 'GET', headers: {'Accept': 'application/json', ...(options.body !== undefined ? {'Content-Type': 'application/json'} : {}), ...(tokenGetter() ? {Authorization: `Bearer ${tokenGetter()}`} : {})}, body: options.body === undefined ? undefined : JSON.stringify(options.body), signal: options.signal});
  if (response.status === 204) return undefined as T;
  let payload: any = null; try { payload = await response.json(); } catch { /* API may return an empty body */ }
  if (!response.ok) throw new ApiError(response.status, payload?.message || `Request failed (${response.status})`, payload?.errors);
  return payload as T;
}
export const get = <T>(path: string, signal?: AbortSignal) => api<T>(path, {signal});
export const post = <T>(path: string, body?: unknown) => api<T>(path, {method: 'POST', body});
export const put = <T>(path: string, body?: unknown) => api<T>(path, {method: 'PUT', body});
export const destroy = <T>(path: string) => api<T>(path, {method: 'DELETE'});
/** Convert a relative API media URL into an absolute URL for native media views. */
/**
 * Resolve API media URLs for native clients. Laravel's local `asset()` URLs
 * often contain localhost/127.0.0.1; those addresses point at the emulator
 * itself on Android, so rewrite them to the configured API host.
 */
export function mediaUrl(url: string | null | undefined) {
  if (!url) return null;
  const apiOrigin = API_BASE.replace(/\/api\/v1\/?$/, '');
  if (!/^(?:https?:|file:|content:|data:)/i.test(url)) {
    return `${apiOrigin}${url.startsWith('/') ? url : `/${url}`}`;
  }
  try {
    const parsed = new URL(url);
    const configured = new URL(apiOrigin);
    if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(parsed.hostname)) {
      return `${configured.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Keep unusual native/data URLs unchanged.
  }
  return url;
}


