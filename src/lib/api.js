/**
 * Platform-aware API layer.
 * - Tauri desktop: uses the Tauri SQLite adapter
 * - Android / Web (Capacitor): uses the Capacitor SQLite adapter
 */
import { createAndroidApi } from "./api-android.js";

function isTauri() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);
}

let _api = null;

export function getApi() {
  if (_api) return _api;
  _api = createAndroidApi();
  return _api;
}

// Convenience re-exports so callers can do:
//   import { api } from "./api.js";
//   api.entry.add(...)
export const api = new Proxy(
  {},
  {
    get(_target, prop) {
      return getApi()[prop];
    }
  }
);
