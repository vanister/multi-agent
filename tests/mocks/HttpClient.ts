import { vi } from 'vitest';
import type { HttpClient } from '../../src/utilities/HttpClient.js';

/**
 * Creates a mocked HttpClient for testing
 */
export function createMockHttpClient(): HttpClient {
  return {
    post: vi.fn()
  };
}
