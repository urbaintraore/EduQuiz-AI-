/// <reference types="vite/client" />

/**
 * Centralized API Configuration
 */

// Under local development or production, we default to relative paths so they resolve to the same origin,
// but can be overridden via VITE_API_URL if needed.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/**
 * Resolves a relative API path to a fully qualified URL if needed,
 * or returns it as a relative path if running on the same domain.
 * 
 * @param path The relative API path (e.g. "/api/auth/login")
 * @returns The resolved API URL
 */
export const getApiUrl = (path: string): string => {
  if (!path.startsWith("/api/")) {
    return path;
  }

  // If a custom API URL is explicitly configured, use it
  if (import.meta.env.VITE_API_URL) {
    const base = import.meta.env.VITE_API_URL.endsWith("/")
      ? import.meta.env.VITE_API_URL.slice(0, -1)
      : import.meta.env.VITE_API_URL;
    return `${base}${path}`;
  }

  // Fallback to relative path
  return path;
};
