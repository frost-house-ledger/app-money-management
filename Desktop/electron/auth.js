export function createAuthGuard(options = {}) {
  const expectedToken = options.expectedToken ?? process.env.LEDGER_API_KEY;

  function ensureAuthorized(token) {
    // If the authentication key is not set, skip authentication as before.
    if (!expectedToken) {
      return;
    }

    if (!token || token !== expectedToken) {
      throw new Error("Authentication failed: invalid or missing token.");
    }
  }

  return {
    ensureAuthorized,
    isEnabled: () => Boolean(expectedToken)
  };
}
