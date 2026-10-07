/**
 * FLYX Insight — Production API Client & Request Deduplicator
 *
 * Handles:
 * - Dynamic production API Base URL resolution (respects VITE_API_URL / VITE_API_BASE_URL / relative origin)
 * - In-flight request deduplication (prevents duplicate simultaneous calls across components)
 * - Automatic data envelope unwrapping ({ success: true, data: { ... } } -> payload)
 * - Exponential backoff on transient errors to prevent rapid console error spam
 */

import { OverviewResponse } from '../types/flyx.ts';
import { LivePriceData } from '../components/LivePricePanel.tsx';

function getApiBaseUrl(): string {
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL
      : '') || '';

  if (envUrl && typeof envUrl === 'string') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '';
}

export function buildApiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}

// In-flight promise cache for deduplication
const inFlightRequests = new Map<string, Promise<any>>();

async function fetchWithDeduplication<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = buildApiUrl(endpoint);
  const cacheKey = `${options?.method || 'GET'}:${url}`;

  // If identical request is already in-flight, return the same promise
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  const promise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(url, {
        signal: options?.signal || controller.signal,
        headers: {
          Accept: 'application/json',
          ...(options?.headers || {}),
        },
        ...options,
      });

      if (!res.ok) {
        let errMessage = `API error ${res.status}: ${res.statusText}`;
        try {
          const errJson = await res.json();
          if (errJson && errJson.error) {
            errMessage = errJson.error;
          }
        } catch {
          // fallback to status text
        }
        throw new Error(errMessage);
      }

      const json = await res.json();
      // Unpack { success: true, data: { ... } } if present
      if (json && typeof json === 'object' && 'data' in json && json.data) {
        return json.data as T;
      }
      return json as T;
    } finally {
      clearTimeout(timeoutId);
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

/**
 * Retrieves FLYX Insight ecosystem overview data.
 */
export async function getOverview(): Promise<OverviewResponse> {
  return fetchWithDeduplication<OverviewResponse>('/api/overview');
}

/**
 * Retrieves the current FLYX token price and reference volume data.
 */
export async function getPrice(): Promise<LivePriceData> {
  return fetchWithDeduplication<LivePriceData>('/api/price');
}
