import { useAuthStore } from '@/store/auth-store';

export interface HttpResponse<T = unknown> {
  ok: boolean;
  status: number | null;
  data: T | null;
  text: string | null;
  contentType: string;
  latencyMs: number;
  bytes: number;
  error: string | null;
  requestHeaders: Record<string, string>;
  requestQuery: Record<string, unknown>;
  requestBody: unknown;
  url: string;
  method: string;
}

export interface RequestOptions {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: unknown;
  includeAuth?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

function buildQueryString(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
    } else {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function httpRequest<T = unknown>(opts: RequestOptions): Promise<HttpResponse<T>> {
  const method = (opts.method ?? 'GET').toUpperCase();
  const query = opts.query ?? {};
  const qs = buildQueryString(query);
  const fullUrl = `${opts.url}${qs}`;
  const timeoutMs = opts.timeoutMs ?? 40000;

  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };

  if (opts.body !== undefined && opts.body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  if (opts.includeAuth !== false) {
    const token = useAuthStore.getState().getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const safeHeaders = { ...headers };
  if (safeHeaders['Authorization']) safeHeaders['Authorization'] = 'Bearer ***';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (opts.signal) {
    opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const signal = controller.signal;

  const start = performance.now();

  try {
    const fetchOpts: RequestInit = { method, headers, signal };
    if (opts.body !== undefined && opts.body !== null && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      fetchOpts.body = JSON.stringify(opts.body);
    }

    const response = await fetch(fullUrl, fetchOpts);
    clearTimeout(timer);
    const latencyMs = performance.now() - start;
    const contentType = response.headers.get('Content-Type') ?? '';
    const raw = await response.arrayBuffer();
    const bytes = raw.byteLength;
    const text = new TextDecoder().decode(raw);

    let data: T | null = null;
    let textOut: string | null = null;

    if (contentType.toLowerCase().includes('application/json')) {
      try { data = JSON.parse(text) as T; } catch { textOut = text; }
    } else {
      textOut = text;
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      text: textOut,
      contentType,
      latencyMs,
      bytes,
      error: null,
      requestHeaders: safeHeaders,
      requestQuery: query,
      requestBody: opts.body ?? null,
      url: fullUrl,
      method,
    };
  } catch (err) {
    clearTimeout(timer);
    const latencyMs = performance.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: null,
      data: null,
      text: null,
      contentType: '',
      latencyMs,
      bytes: 0,
      error: message,
      requestHeaders: safeHeaders,
      requestQuery: query,
      requestBody: opts.body ?? null,
      url: fullUrl,
      method,
    };
  }
}

export async function loginRequest(url: string, email: string, password: string): Promise<HttpResponse> {
  return httpRequest({
    method: 'POST',
    url,
    body: { email, password },
    includeAuth: false,
    timeoutMs: 30000,
  });
}
