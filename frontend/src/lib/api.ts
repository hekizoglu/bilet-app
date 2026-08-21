/**
 * Merkezi API istemcisi
 * -------------------------------------------
 * - NEXT_PUBLIC_API_URL değerini normalize eder (sondaki /api kırpılır)
 *   Böylece tüm çağrılar tek kurala uyar: apiFetch('/events') → {ORIGIN}/api/events
 *   (Önceden kodlar hem env'e hem /api ekliyordu → "/api/api/..." 404 hatası)
 * - Authorization header'ını otomatik ekler (token cookie'sinden)
 * - Zaman aşımı (timeout) ve tutarlı hata nesneleri sağlar
 */

const RAW_BASE = process.env.NEXT_PUBLIC_API_URL?.trim() || '';

/**
 * Socket.io ve diğer origin-temelli kullanımlar için normalize edilmiş origin.
 * Env boşsa boş string döner → istemci aynı origin'e (relative) bağlanır,
 * dev'de Next.js rewrites `/api/*` ve `/socket.io/*` isteklerini backend'e proxy'ler.
 */
export const API_ORIGIN = RAW_BASE
  ? RAW_BASE.replace(/\/+$/, '').replace(/\/api$/i, '')
  : '';

/** API uç noktası URL'si: apiFetch('/events') → {ORIGIN}/api/events (env yoksa relative /api/events) */
export const apiUrl = (path: string) =>
  `${API_ORIGIN}/api${path.startsWith('/') ? path : `/${path}`}`;

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/** Tarayıcıdaki token cookie'sini okur (SSR'da null döner) */
export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const row = document.cookie.split('; ').find((r) => r.startsWith('token='));
  return row ? row.split('=').slice(1).join('=') : null;
}

interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * JSON tabanlı API isteği.
 * Başarıda parse edilmiş veriyi döner, başarısızlıkta ApiError fırlatır.
 */
export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { timeoutMs = 15000, headers, ...rest } = options;
  const token = getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(apiUrl(path), {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') || '';
    let body: unknown = null;
    if (contentType.includes('application/json')) {
      body = await res.json().catch(() => null);
    } else {
      body = await res.text().catch(() => null);
    }

    if (!res.ok) {
      const errorObj = (body && typeof body === 'object' ? (body as Record<string, unknown>) : null);
      const message =
        (typeof errorObj?.error === 'string' && errorObj.error) ||
        (typeof body === 'string' && body) ||
        `İstek başarısız oldu (${res.status})`;
      throw new ApiError(res.status, message, body);
    }

    return body as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, 'Sunucu yanıt süresi aştı, lütfen tekrar deneyin.');
    }
    throw new ApiError(0, 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.');
  } finally {
    clearTimeout(timer);
  }
}
