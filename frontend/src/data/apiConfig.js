/**
 * Resolve the Arbiter backend API base URL.
 *
 * Resolution order:
 *   1. VITE_API_URL env var — baked in at build time for production deployments.
 *      Set this in Render → Environment to your backend URL
 *      (e.g. https://arbiter-backend.onrender.com).
 *   2. http://localhost:8000 — default for local development.
 *      The vite.config.js dev proxy forwards /api/* to localhost:8000.
 *
 * Usage:
 *   import { getApiBase } from '../data/apiConfig';
 *   const res = await fetch(`${getApiBase()}/api/tickets`);
 */
export function getApiBase() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:8000';
  }
  return 'https://arbiter-mcp-backend.onrender.com';
}

/** Convenience alias for one-liner usage. */
export const API_BASE = getApiBase();
