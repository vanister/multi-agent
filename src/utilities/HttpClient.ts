import type { HttpResponse, HttpClientOptions } from './http-client-types.js';

export interface HttpClient {
  post<T = unknown>(
    url: string,
    body: unknown,
    options?: HttpClientOptions
  ): Promise<HttpResponse<T>>;
}

export class FetchHttpClient implements HttpClient {
  async post<T = unknown>(
    url: string,
    body: unknown,
    options?: HttpClientOptions
  ): Promise<HttpResponse<T>> {
    // todo: we're creating an AbortController even if we don't need it
    const controller = new AbortController();
    const timeoutId = options?.timeoutMs
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : undefined;

    const signal = options?.signal || controller.signal;
    const responseType = options?.responseType || 'json';
    const headers = {
      'Content-Type': 'application/json',
      ...options?.headers
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal
      });

      const text = await response.text();
      const data = responseType === 'json' ? JSON.parse(text) : text;

      return {
        ok: response.ok,
        status: response.status,
        data
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${options?.timeoutMs}ms`);
      }

      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}
