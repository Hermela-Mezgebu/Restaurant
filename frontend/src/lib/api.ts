const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000/api';

interface ApiRequestOptions extends RequestInit {
  params?: Record<
    string,
    string | number | boolean | null | undefined
  >;
}

const buildUrl = (
  endpoint: string,
  params?: ApiRequestOptions['params']
): string => {
  const url = new URL(`${API_URL}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};

export async function apiFetch<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    params,
    ...requestOptions
  } = options;

  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('token')
      : null;

  const response = await fetch(
    buildUrl(endpoint, params),
    {
      ...requestOptions,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),

        ...(requestOptions.headers || {}),
      },
      cache: 'no-store',
    }
  );

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data as T;
};

interface ApiResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}

interface GenericApiData {
  data?: unknown;
  restaurants?: unknown;
  users?: unknown;
  reservations?: unknown;
  tables?: unknown;
  [key: string]: unknown;
}

const api = {
  get: async <T = GenericApiData>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> => {
    const data = await apiFetch<T>(
      endpoint,
      {
        ...options,
        method: 'GET',
      }
    );

    return {
      data,
      status: 200,
      ok: true,
    };
  },

  post: async <T = GenericApiData>(
    endpoint: string,
    body?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> => {
    const data = await apiFetch<T>(
      endpoint,
      {
        ...options,
        method: 'POST',
        body:
          body !== undefined
            ? JSON.stringify(body)
            : undefined,
      }
    );

    return {
      data,
      status: 200,
      ok: true,
    };
  },

  put: async <T = GenericApiData>(
    endpoint: string,
    body?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> => {
    const data = await apiFetch<T>(
      endpoint,
      {
        ...options,
        method: 'PUT',
        body:
          body !== undefined
            ? JSON.stringify(body)
            : undefined,
      }
    );

    return {
      data,
      status: 200,
      ok: true,
    };
  },

  patch: async <T = GenericApiData>(
    endpoint: string,
    body?: unknown,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> => {
    const data = await apiFetch<T>(
      endpoint,
      {
        ...options,
        method: 'PATCH',
        body:
          body !== undefined
            ? JSON.stringify(body)
            : undefined,
      }
    );

    return {
      data,
      status: 200,
      ok: true,
    };
  },

  delete: async <T = GenericApiData>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> => {
    const data = await apiFetch<T>(
      endpoint,
      {
        ...options,
        method: 'DELETE',
      }
    );

    return {
      data,
      status: 200,
      ok: true,
    };
  },
};

export default api;

export { API_URL };