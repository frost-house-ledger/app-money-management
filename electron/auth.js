export function createAuthGuard(options = {}) {
  const expectedToken = options.expectedToken ?? process.env.LEDGER_API_KEY;

  function ensureAuthorized(token) {
    // 認証キー未設定時は従来どおり認証をスキップする。
    if (!expectedToken) {
      return;
    }

    if (!token || token !== expectedToken) {
      throw new Error("認証に失敗しました。");
    }
  }

  return {
    ensureAuthorized,
    isEnabled: () => Boolean(expectedToken)
  };
}
