import React from "react";
import { logError } from "../lib/logger.js";
import { getMessages } from "../i18n/translations.js";

/**
 * ErrorBoundary - React error boundary that logs errors and shows a fallback UI.
 * @extends {React.Component}
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, key: 0 };
    this.handleRetry = this.handleRetry.bind(this);
  }

  /**
   * Update state when an error is thrown in a child component during rendering.
   * This ensures the fallback UI is only shown after an actual error.
   * @param {Error} error
   */
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  /**
   * Lifecycle: catch rendering errors in child component tree
   * @param {Error} error
   * @param {Object} errorInfo
   */
  componentDidCatch(error, errorInfo) {
    this.setState({ hasError: true, error, errorInfo });
    try {
      logError("ErrorBoundary.componentDidCatch", { message: error.message, stack: error.stack, info: errorInfo });
    } catch (e) {
      // best-effort logging only
      console.error("ErrorBoundary log failed", e);
    }
  }

  /**
   * Retry by remounting children
   */
  handleRetry() {
    this.setState((s) => ({ hasError: false, error: null, errorInfo: null, key: s.key + 1 }));
  }

  render() {
    if (this.state.hasError) {
      const locale = (typeof localStorage !== 'undefined' && localStorage.getItem("settings.locale")) || 'en';
      const t = getMessages(locale);
      const message = this.state.error?.message || t.errorUnexpectedMessage;
      return (
        <main className="page error-fallback" role="alert">
          <section className="card">
            <h2>{t.errorUnexpectedTitle}</h2>
            <p>{message}</p>
            <div style={{ marginTop: 12 }}>
              <button type="button" onClick={this.handleRetry}>{t.actionRetry}</button>
              <button type="button" onClick={() => window.location.reload()} style={{ marginLeft: 8 }}>{t.actionReload}</button>
            </div>
          </section>
        </main>
      );
    }

    // Key ensures children are remounted on retry
    return <React.Fragment key={this.state.key}>{this.props.children}</React.Fragment>;
  }
}
