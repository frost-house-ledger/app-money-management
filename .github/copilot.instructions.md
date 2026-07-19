# Error Handling & Code Quality Guidelines

These instructions define how Copilot should assist in this project.  
The project is developed as open source and must remain safe, predictable, and easy to maintain.

---

## General Principles
- Prioritise safety, predictability, and explicit error handling.
- No silent failures under any circumstances.
- All comments and error messages must use British English for international release.
- Provide clear next steps to improve user convenience.
- Update all affected files when making changes and test thoroughly.
- Copilot does not need to build the project; ensure code is correct and ready to build.
- Write all in English, even if the project is in another language.

---

## Open Source Development
- This project is developed as open source to ensure transparency, community trust, and long‑term maintainability.
- All code must remain readable, well‑documented, and easy for external contributors to review.
- Contributions must follow the same error‑handling and code‑quality standards defined in this document.
- No proprietary or closed components should be introduced without clear justification.
- Keep the codebase simple so external contributors can understand and extend it safely.

---

## Cost Optimisation
- Use minimal resources; avoid heavy or background tasks.
- Reduce network/API calls and unnecessary data transfers.
- Use safe, validated caching only.
- Never output greetings or file‑modification notices.
- After two consecutive failures, log the issue and exit gracefully with a short, user‑friendly message.

---

## Error Handling
- Wrap all async, file, network, and UI initialisation in `try/catch`.
- On UI load failure:
  - Render a minimal fallback UI with a retry option.
  - Log detailed error information internally.
- Never expose internal error details or stack traces to users.

---

## Documentation
- Use JSDoc for all functions:
  - Purpose  
  - Parameters  
  - Returns  
  - Side effects  
  - Error cases
- Add inline comments for non‑obvious logic and edge cases.

---

## UI Fallback
- Provide a minimal fallback UI containing an error message and a retry action.
- Fallback UI must not depend on any failing components.
- Log before rendering fallback.

---

## Code Quality
- Avoid deep nesting; use early returns.
- Validate all external inputs.
- Await all promises.
- No unused or unreachable code.
- Prefer pure functions and predictable behaviour.

---

## Logging
- Log timestamp, function name, message, and stack trace.
- Never log sensitive or user‑specific data.

---

## Security
- Sanitize all inputs.
- Avoid exposing internal details.
- Validate file paths and external resources before use.

