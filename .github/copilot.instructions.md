# Error Handling & Code Quality Guidelines

## Cost Optimization
- Use minimal resources; avoid heavy or background tasks.
- Reduce network/API calls and data transfers.
- Use safe, validated caching.
- Never output greetings or file‑modification notices.

## General Principles
- Prioritize safety and explicit error handling.
- No silent failures.
- All comments in English.
- Provide next steps for improving user convenience.
- Update all affected files and test changes thoroughly.

## Error Handling
- Wrap async, file, network, and UI init in try/catch.
- On UI load failure:
  - Show a simple fallback UI with retry.
  - Log detailed error info.
- Never expose internal error details to users.

## Documentation
- Use JSDoc for all functions: purpose, params, returns, side effects.
- Add inline comments for non-obvious logic and edge cases.

## UI Fallback
- Minimal fallback UI with error + retry.
- Fallback must not depend on failing components.
- Log before rendering fallback.

## Code Quality
- Avoid deep nesting; use early returns.
- Validate all external inputs.
- Await all promises.
- No unused or unreachable code.
- Prefer pure functions.

## Logging
- Log timestamp, function name, message, stack trace.
- Never log sensitive data.

## Security
- Sanitize all inputs.
- Avoid exposing internal details.
- Validate file paths and external resources.
