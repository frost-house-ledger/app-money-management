# Error Handling and Code Quality Guidelines

## General Principles
- Always prioritize robust error handling and code safety over brevity.
- Never generate code that can fail silently. All failures must be handled explicitly.
- All comments must be written in English for international readability.

## Error Handling Requirements
- Wrap all asynchronous operations, file access, network calls, and UI initialization in try/catch blocks.
- When an error occurs during UI loading:
  - Always render a fallback screen with a simple, user-friendly message.
  - Always log detailed error information (stack trace, function name, context) for debugging.
- Never expose internal error details directly to the user.

## Documentation Requirements
- Use JSDoc-style comments for all functions, including:
  - What the function does
  - What parameters it receives (with types)
  - What it returns (with types)
  - Any side effects, assumptions, or constraints
- Add inline comments explaining non-obvious logic, data transformations, and edge-case handling.

## UI Fallback Behaviour
- When UI fails to load:
  - Display a minimal fallback UI with an error message and a retry button.
  - Ensure the fallback UI does not depend on the failing component.
  - Log the error before rendering the fallback.

## Code Quality Rules
- Avoid deeply nested logic; prefer early returns.
- Validate all external inputs before use.
- Ensure all promises are awaited or explicitly handled.
- Never leave unused variables, unreachable code, or commented-out blocks.
- Prefer pure functions when possible.

## Logging Standards
- Log errors with a consistent format including:
  - Timestamp
  - Function name
  - Error message
  - Stack trace (if available)
- Never log sensitive user data.

## Security Considerations
- Sanitize all user inputs.
- Avoid exposing internal implementation details in UI messages.
- Ensure all file paths and external resources are validated before use.
