# Contributing

How to contribute to HouseLedger development.

## Code of Conduct

- Be respectful and inclusive
- Collaborate constructively
- Assume good intentions
- Focus on code, not personality
- Report harassment to maintainers

---

## Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR-USERNAME/app-money-management.git
cd app-money-management
git remote add upstream https://github.com/frost-house-ledger/app-money-management.git
```

### 2. Create Feature Branch

```bash
git checkout -b feature/my-feature
# or
git checkout -b fix/bug-number
```

### 3. Install Dependencies

```bash
npm install
npm run electron:rebuild
```

### 4. Make Changes

Follow [Development Guide](05-Development-Guide.md):
- Code style
- Testing requirements
- Git workflow

### 5. Test Locally

```bash
npm test                    # Run tests
npm run dev                 # Start dev server
npm run dist:win:all:fast   # Test build
```

---

## Pull Request Process

### Before Submitting

1. **Update from upstream**
   ```bash
   git fetch upstream
   git rebase upstream/master
   ```

2. **Pass all checks**
   ```bash
   npm test                  # All tests pass
   npm run react:build       # Builds successfully
   npm run dist:win          # Windows build works
   ```

3. **Clean commit history**
   ```bash
   git log --oneline origin/master..HEAD
   # Should show logical, descriptive commits
   ```

### Submit PR

1. **Push to your fork**
   ```bash
   git push origin feature/my-feature
   ```

2. **Create pull request on GitHub**
   - Target: `frost-house-ledger:master` (or `dev`)
   - Title: Concise description
   - Description: Why, what changed, how to test

3. **Link issues**
   ```
   Fixes #123
   Related to #456
   ```

4. **Wait for CI**
   - GitHub Actions runs build & tests
   - All checks must pass
   - Address any failures

5. **Respond to review**
   - Address feedback promptly
   - Request re-review when done
   - Maintain respectful discussion

6. **Merge**
   - Maintainer merges when approved
   - Deletes branch
   - Closes linked issues

---

## Types of Contributions

### Bug Fixes

**Good bug fixes:**
- Fix specific, reproducible issues
- Include test cases
- Small, focused changes
- Clear commit messages

**Example:**
```
fix: resolve currency conversion error in category analysis

When displaying amounts in non-base currencies, the exchange 
rate was applied twice, resulting in incorrect totals.

Fixes: #456
```

### Features

**Guidelines:**
- Discuss large features first (open issue)
- Keep scope manageable
- Add tests for new functionality
- Update documentation
- Consider performance impact

**Example feature:** "Add category icons picker"

### Documentation

**Types:**
- Wiki pages
- README improvements
- Code comments
- API documentation
- Examples

**How to contribute:**
```bash
# Edit .md files in docs/wiki/
git add docs/wiki/
git commit -m "docs: improve Getting Started guide"
```

### Tests

**Improve test coverage:**
- Add unit tests for critical functions
- Add integration tests for features
- Test error cases
- Aim for 80%+ coverage

```javascript
describe('CategoryBreakdown', () => {
  it('calculates percentages correctly', () => {
    // Test implementation
  });
});
```

### Translations

**Add language support:**
1. See [Localization](09-Localization.md#adding-a-new-language)
2. Add translations to all 100+ keys
3. Test UI in new language
4. Submit PR with complete translations

**Fix translations:**
- Correct typos or mistakes
- Improve clarity
- Maintain consistency with context

### Performance

- Profile bottlenecks
- Optimize queries
- Reduce bundle size
- Improve load times

---

## Code Review

### What Reviewers Look For

✅ **Code Quality**
- Follows style guide
- Clear variable names
- No unnecessary complexity
- DRY (Don't Repeat Yourself)

✅ **Testing**
- Tests pass
- New tests for new code
- Edge cases covered
- No console errors

✅ **Documentation**
- Code comments for complex logic
- Strings in translation file (not hardcoded)
- API documentation updated
- README updated if needed

✅ **Performance**
- No obvious inefficiencies
- Proper use of memoization
- Database queries optimized
- Bundle size impact acceptable

❌ **Common Issues**
- Hardcoded strings (use translations)
- Missing error handling
- No tests for new code
- Incomplete/unclear commits

### Giving Good Feedback

- Be specific (line numbers, code snippets)
- Explain why, not just what
- Suggest solutions
- Acknowledge good code
- Use "we" language, not "you"

---

## Development Tips

### Debugging

**Browser DevTools (Desktop):**
```javascript
// In component
console.log("Debug info", value);

// Check in DevTools console
F12 → Console tab
```

**Electron DevTools:**
```bash
# Press Ctrl+Shift+I in Electron window
# Or add to main.js:
mainWindow.webContents.openDevTools();
```

**Android Debug:**
```bash
# Android Studio → Logcat
# Or via adb
adb logcat
```

### Performance Profiling

```javascript
// React Profiler
import { Profiler } from 'react';

<Profiler id="component" onRender={logProfilingData}>
  <Component />
</Profiler>
```

### Testing Sync Locally

```bash
# Terminal 1: Desktop app
npm run dev

# Terminal 2: Simulate Android requests
curl http://localhost:30303/api/sync/export
```

---

## Commit Messages

### Format

```
type: short description

Longer explanation (optional).
- Bullet point 1
- Bullet point 2

Fixes #123
```

### Types

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `style:` — Code style (formatting, etc.)
- `refactor:` — Code reorganization (no behavior change)
- `test:` — Add/update tests
- `chore:` — Dependency updates, CI changes
- `perf:` — Performance improvement

### Examples

```
feat: add dark theme toggle to settings

refactor: extract currency formatting to utility function

fix: resolve sync conflict resolution logic

docs: update LAN sync troubleshooting section

test: add CategoryAnalysisPage component tests
```

---

## Release Workflow

### Version Numbering

HouseLedger uses [Semantic Versioning](https://semver.org/):

- `MAJOR.MINOR.PATCH` (e.g., `0.1.0`)
- `0.x.x` — Pre-release (breaking changes possible)
- `1.0.0` — Stable API

### Release Process

1. **Feature freeze** — No new features, only fixes
2. **Testing** — Comprehensive testing on all platforms
3. **Version bump** — Update `package.json`
4. **Release notes** — Document changes
5. **Tag & push** — `git tag v0.1.0 && git push --tags`
6. **Build & publish** — GitHub Actions handles it
7. **Announce** — Notify users

### Hotfix Process

For critical bugs in released version:

```bash
# Branch from release tag
git checkout -b hotfix/critical-bug v0.1.0

# Fix bug, test, commit
git commit -m "fix: critical security issue"

# Tag as patch release
git tag v0.1.1

# Push
git push && git push --tags
```

---

## Testing Requirements

### Unit Tests

- New functions need tests
- Test happy path and error cases
- Mock external dependencies
- Aim for 80%+ coverage

```bash
npm test -- --coverage
```

### Integration Tests

- Test API endpoints with real data
- Test component interactions
- Test database operations

### Manual Testing

Before each release:
- Test on Windows, macOS, Linux
- Test on Android
- Test offline functionality
- Test LAN sync

---

## Documentation

### When to Update Docs

- ✅ New features → Add to [Features](07-Features.md)
- ✅ API changes → Update [API Reference](12-API-Reference.md)
- ✅ Database schema changes → Update [Database Schema](11-Database-Schema.md)
- ✅ Build/release changes → Update [Build & Release](10-Build-Release.md)
- ✅ Troubleshooting discovered → Update [FAQ](13-FAQ-Troubleshooting.md)

### Documentation Format

- Use Markdown (`.md`)
- Clear structure with headings
- Code examples where relevant
- Links between related pages
- Keep up to date

---

## Security

### Reporting Vulnerabilities

**Do NOT open public issue.** Follow [SECURITY.md](../SECURITY.md):

1. Email maintainer privately
2. Describe vulnerability clearly
3. Allow time for fix
4. Coordinate disclosure

### Security Best Practices

- Never store secrets in code
- Use environment variables
- Validate all inputs
- Escape user data
- Keep dependencies updated

---

## Community

### Getting Help

- **Discussions** — GitHub Discussions (if enabled)
- **Issues** — Open GitHub issue
- **Email** — Contact maintainer
- **Wiki** — Check existing documentation

### Sharing Your Work

- Blog post about contribution
- Share custom modifications
- Create extensions (if framework supports)
- Help other users

---

## License

HouseLedger is licensed under the **ISC License**.

By contributing, you agree that your contributions are licensed under the ISC License.

---

## Thanks!

Thank you for contributing to HouseLedger! 🎉

Your contributions make this project better for everyone.

---

## Quick Reference

| Task | Command |
|------|---------|
| Setup | `npm install && npm run electron:rebuild` |
| Dev server | `npm run dev` |
| Tests | `npm test` |
| Build | `npm run react:build && npm run dist:win:all` |
| Lint | `npm run lint` (if configured) |
| Format | `npm run format` (if configured) |

---

## Additional Resources

- [Development Guide](05-Development-Guide.md)
- [Project Structure](04-Project-Structure.md)
- [Architecture](06-Architecture.md)
- [GitHub Repository](https://github.com/frost-house-ledger/app-money-management)
- [Issues](https://github.com/frost-house-ledger/app-money-management/issues)

---

Welcome to the team! 🚀
