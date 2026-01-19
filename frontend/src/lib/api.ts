/* ==================================================
   api.ts
   - JWT-only authentication
   - Offline queue + replay
   - Request tracing
   - HARDENED Authorization handling (FINAL)
================================================== */

// API URL
const API_URL = 'https://realtime-collaboration-whiteboard.onrender.com';

/* ---------------------------------------------
   Token provider (set by AuthContext)
--------------------------------------------- */
let tokenProvider: (() => string | null) | null = null;

export function setApiTokenProvider(provider: () => string | null) {
  tokenProvider = provider;
}

/* ---------------------------------------------
   Offline request queue
--------------------------------------------- */
type QueuedRequest = {
  path: string;
  options: RequestInit;
  resolve: (v: any) => void;
  reject: (e: any) => void;
};

const offlineQueue: QueuedRequest[] = [];

/* ---------------------------------------------
   Utility: wait for token (provider-first)
--------------------------------------------- */
const waitForToken = async (timeoutMs = 3000): Promise<string | null> => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (tokenProvider) {
      const token = tokenProvider();
      if (token) return token;
    }
    await new Promise((r) => setTimeout(r, 25));
  }

  return null;
};

/* ---------------------------------------------
   Replay offline queue
--------------------------------------------- */
async function replayQueue() {
  const token =
    (tokenProvider && tokenProvider()) || localStorage.getItem('token');

  if (!token) return;

  while (offlineQueue.length) {
    const q = offlineQueue.shift()!;
    try {
      const res = await api(q.path, q.options);
      q.resolve(res);
    } catch (e) {
      q.reject(e);
    }
  }
}

window.addEventListener('online', replayQueue);

/* ---------------------------------------------
   Main API function
--------------------------------------------- */
export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const traceId = crypto.randomUUID();
  const method = options.method || 'GET';

  console.log(`[API ${traceId}] ${method} ${path}`);

  /* ---------------------------------------------
     Offline handling
  --------------------------------------------- */
  if (!navigator.onLine) {
    return new Promise<T>((resolve, reject) => {
      offlineQueue.push({ path, options, resolve, reject });
    });
  }

  /* ---------------------------------------------
     Token bootstrap (HARDENED)
     - provider first
     - localStorage fallback
  --------------------------------------------- */
  let token = await waitForToken();

  if (!token) {
    token = localStorage.getItem('token');
  }

  /* ---------------------------------------------
     Header handling (NEVER overwrite Authorization)
  --------------------------------------------- */
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  /* ---------------------------------------------
     Execute request
  --------------------------------------------- */
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  /* ---------------------------------------------
     Auth handling (JWT-only, no refresh)
  --------------------------------------------- */
  if (res.status === 401) {
    console.warn(`[API ${traceId}] 401 Unauthorized → logout`);

    localStorage.removeItem('token');
    localStorage.removeItem('user');

    window.location.reload();
    throw new Error('Unauthorized');
  }

  if (res.status === 403) {
    throw new Error('Forbidden');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (res.status === 204) {
    return null as T;
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}
