# Security Policy

## Supported Versions

We currently support security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |

## Reporting a Vulnerability

We take the security of our job board seriously. If you discover a security vulnerability, please follow these steps:

### 1. **Do NOT** open a public issue

Security vulnerabilities should be reported privately to protect our users.

### 2. Report via GitHub Security Advisories

1. Go to the [Security tab](https://github.com/zapplyjobs/New-Grad-Jobs/security)
2. Click "Report a vulnerability"
3. Fill out the form with details about the vulnerability

### 3. What to include in your report

- **Description**: Clear description of the vulnerability
- **Impact**: What an attacker could do with this vulnerability
- **Steps to reproduce**: Detailed steps to reproduce the issue
- **Affected versions**: Which versions are affected (if known)
- **Suggested fix**: If you have a suggestion for fixing it (optional)

### 4. What to expect

- **Acknowledgment**: We'll acknowledge your report within 48 hours
- **Updates**: We'll keep you informed about our progress
- **Timeline**: We aim to fix critical vulnerabilities within 7 days
- **Credit**: If you'd like, we'll credit you in the security advisory

## Security Measures

### Current Protections

- **Dependabot**: Automated dependency updates enabled
- **Secret Scanning**: GitHub secret scanning enabled
- **Code Review**: All changes reviewed before merging
- **Automated Testing**: CI/CD pipeline with security checks

### What We Protect

1. **User Data**: No personally identifiable information is collected
2. **API Keys**: All API keys stored in GitHub Secrets
3. **Discord Webhooks**: Webhook URLs secured in repository secrets
4. **Dependencies**: Regular updates via Dependabot

### Out of Scope

The following are **not** security vulnerabilities:

- Job listing content (we scrape from third-party sources)
- Outdated job postings (data refresh happens automatically)
- Missing jobs from specific companies (not all companies post publicly)
- Discord bot rate limiting (intentional to prevent spam)

## Contact

For security concerns that don't require a private report, you can reach us at:

- **GitHub Discussions**: [Security category](https://github.com/zapplyjobs/New-Grad-Jobs/discussions)
- **Email**: team@zapply.ai

---

**Last Updated**: 2025-10-23
