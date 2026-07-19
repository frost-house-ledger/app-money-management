# Security Policy

## Supported Versions

Currently supported versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please follow these steps:

1. **Do NOT** create a public GitHub issue
2. Email security details to the project maintainer (frost@example.com or create a private security advisory on GitHub)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce (if applicable)
   - Potential impact
   - Suggested fix (if you have one)

## Response Timeline

- **Initial Response**: Within 48 hours
- **Security Fix Released**: Within 2 weeks (for critical vulnerabilities)
- **Public Disclosure**: Coordinated with the fix release

## Security Best Practices for Users

This application handles sensitive financial data. To keep your data secure:

- Keep the application updated to the latest version
- Use strong passwords for any authentication features
- Regularly back up your financial data
- Be cautious with file permissions and access to the application's data directory
- Review and enable any security features available in settings

## Dependencies

This project uses the following key dependencies:
- **Electron**: For desktop application framework
- **React**: For UI component library
- **Better-sqlite3**: For database operations
- **Node.js**: Requires >= 22

Dependabot automatically monitors these dependencies for security vulnerabilities.
