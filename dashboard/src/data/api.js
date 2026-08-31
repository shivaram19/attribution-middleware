// Why: single data contract for all views — fetch + hook + mock fallback ('offline demo data' badge)
// Fetch layer for the Attribution Dashboard API + useDashboardData hook (Vite).
//
// Config via env (Vite inlines VITE_* at build time):
//   VITE_API_URL          dev default http://localhost:3100; production build
//                         ships empty string -> same-origin relative /api paths
//   VITE_DASHBOARD_TOKEN  default 'demo-token'
//   VITE_DATA_SOURCE      'api' (default) | 'mock' (forces mockData)
//
// On network failure the hook falls back to the provided mock data and sets
// isFallback=true so views show the "offline demo data" badge.

import { useEffect, useState, createElement } from 'react';

const envUrl = import.meta.env.VITE_API_URL;
export const API_URL = envUrl !== undefined && envUrl !== '' ? envUrl
  : envUrl === '' ? '' // production: same-origin
  : 'http://localhost:3100';
export const DASHBOARD_TOKEN = import.meta.env.VITE_DASHBOARD_TOKEN || 'demo-token';
export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'api';

export async function fetchDashboard(endpoint, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== '')
  ).toString();
  const res = await fetch(`${API_URL}/api/v1/dashboard/${endpoint}${qs ? '?' + qs : ''}`, {
    headers: { Authorization: `Bearer ${DASHBOARD_TOKEN}` }
  });
  if (!res.ok) throw new Error(`API ${endpoint} responded ${res.status}`);
  return res.json();
}

/**
 * useDashboardData(endpoint, params, fallback, map)
 * Returns { data, loading, error, isFallback, refetch }.
 * params === null skips fetching (returns fallback).
 */
export function useDashboardData(endpoint, params, fallback, map = (d) => d) {
  const [state, setState] = useState({
    data: fallback,
    loading: DATA_SOURCE === 'api' && params !== null,
    error: null,
    isFallback: DATA_SOURCE !== 'api'
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    if (DATA_SOURCE !== 'api' || params === null) {
      setState({ data: fallback, loading: false, error: null, isFallback: true });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    fetchDashboard(endpoint, params)
      .then((json) => {
        if (cancelled) return;
        setState({ data: map(json), loading: false, error: null, isFallback: false });
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn(`[dashboard] API fetch failed for ${endpoint}, using offline demo data:`, err.message);
        setState({ data: fallback, loading: false, error: err, isFallback: true });
      });
    return () => { cancelled = true; };
  }, [endpoint, paramsKey, refreshKey]); // eslint-disable-line

  return { ...state, refetch: () => setRefreshKey((k) => k + 1) };
}

/** Badge shown when data comes from the mock fallback. */
export function OfflineBadge() {
  return createElement(
    'span',
    {
      'data-testid': 'offline-badge',
      className: 'inline-flex items-center rounded-full border border-transparent bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700'
    },
    'offline demo data'
  );
}
