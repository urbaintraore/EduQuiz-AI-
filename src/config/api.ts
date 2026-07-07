/// <reference types="vite/client" />

/**
 * Centralized API Configuration
 */

// Under local development or production, we default to relative paths so they resolve to the same origin,
// but can be overridden via VITE_API_URL if needed.
// We validate that it starts with http to avoid using internal IDs or placeholders as base URLs.
const rawApiUrl = import.meta.env.VITE_API_URL || "";
export const API_BASE_URL = (rawApiUrl.startsWith("http://") || rawApiUrl.startsWith("https://")) 
  ? rawApiUrl 
  : "";

/**
 * Resolves a relative API path to a fully qualified URL if needed,
 * or returns it as a relative path if running on the same domain.
 */
export const getApiUrl = (path: string): string => {
  if (!path.startsWith("/api/")) {
    return path;
  }

  // If a custom API URL is explicitly configured and looks valid, use it
  if (API_BASE_URL) {
    const base = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    return `${base}${path}`;
  }

  // Fallback to relative path
  return path;
};
