/**
 * Platform-aware API layer.
 * - Electron (Desktop): delegates to window.ledgerApi (exposed via preload contextBridge)
 * - Android / Web (Capacitor): uses the Capacitor SQLite adapter
 */
import { createElectronApi } from "./api-electron.js";
import { createAndroidApi } from "./api-android.js";

function isElectron() {
  return (
    typeof window !== "undefined" &&
    typeof window.ledgerApi === "object" &&
    window.ledgerApi !== null
  );
}

let _api = null;

export function getApi() {
  if (_api) return _api;
  if (isElectron()) {
    _api = createElectronApi();
  } else {
    _api = createAndroidApi();
  }
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
