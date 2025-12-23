export type HttpResponse<T = unknown> = {
  ok: boolean;
  status: number;
  data: T;
};

export type HttpClientOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
  responseType?: 'json' | 'text';
  headers?: Record<string, string>;
};
