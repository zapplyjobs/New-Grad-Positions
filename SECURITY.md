# Security Policy

## Supported Versions

This project follows a **rolling release** model - only the latest commit on `main` is actively maintained.

| Version | Supported | Notes |
|---------|-----------|-------|
| `main` branch (latest) | :white_check_mark: | Active development, security patches applied immediately |
| Previous commits | :x: | Not supported - please update to latest |
| Forks | :x: | Responsibility of fork maintainer |

**Why no version numbers?** This is a continuously deployed job board, not a versioned software package. Security fixes are deployed as soon as they're committed.

---

## Reporting a Vulnerability

### :warning: **DO NOT** Create Public Issues for Security Vulnerabilities

Public disclosure before a fix is available puts all users at risk.

### :white_check_mark: **DO** Report Privately

**Option 1: GitHub Security Advisories (Preferred)**
1. Navigate to https://github.com/zapplyjobs/New-Grad-Jobs/security/advisories
2. Click "Report a vulnerability"
3. Fill out the form with technical details
4. Submit (only repository maintainers will see it)

**Option 2: Email**
- Send to: `team@zapply.ai`
- Use subject line: `[SECURITY] New-Grad-Jobs: [Brief Description]`
- Include technical details (see below)

---

## What to Include in Your Report

To help us quickly assess and fix the issue, provide:

### Required Information
- **Vulnerability Type**: (e.g., XSS, SQL Injection, Authentication Bypass, etc.)
- **Affected Component**: (e.g., Discord bot, job scraper, GitHub Actions workflow)
- **Attack Vector**: How can this be exploited?
- **Impact**: What can an attacker achieve? (data theft, DoS, code execution, etc.)
- **Reproduction Steps**: Clear, numbered steps to reproduce
- **Proof of Concept**: Code snippet, curl command, or screenshot demonstrating the issue

### Optional (But Appreciated)
- **Suggested Fix**: Patch, code change, or mitigation strategy
- **References**: Related CVEs, CWEs, or security research
- **Affected Versions**: If you've tested multiple commits/branches

### Example Report
```
Vulnerability Type: Command Injection
Affected Component: Discord bot (.github/scripts/enhanced-discord-bot.js)
Attack Vector: Malicious job title in external API response
Impact: Remote code execution on GitHub Actions runner
Reproduction:
1. External API returns job with title: `'; rm -rf / #`
2. Bot passes unsanitized title to shell command
3. Command executes on runner
PoC: [screenshot or code snippet]
Suggested Fix: Use parameterized commands, not string concatenation
```

---

## Response Timeline

| Timeframe | Action |
|-----------|--------|
| **Within 24 hours** | Acknowledgment of report received |
| **Within 72 hours** | Initial assessment and severity classification |
| **Within 7 days** | Fix developed and tested (for critical/high severity) |
| **Within 14 days** | Fix deployed to production |
| **Within 30 days** | Public disclosure (coordinated with reporter) |

**Note:** Timelines may vary based on severity and complexity. We'll keep you updated throughout.

---

## Severity Classification

We use **CVSS 3.1** to classify vulnerabilities:

| Severity | CVSS Score | Response Time | Examples |
|----------|------------|---------------|----------|
| **Critical** | 9.0-10.0 | 24 hours | Remote code execution, authentication bypass |
| **High** | 7.0-8.9 | 7 days | Command injection, privilege escalation, sensitive data exposure |
| **Medium** | 4.0-6.9 | 14 days | XSS, CSRF, insecure dependencies |
| **Low** | 0.1-3.9 | 30 days | Information disclosure, minor DoS |

**Vulnerability Acceptance Criteria:**
- Must be **reproducible** on the latest `main` branch
- Must pose **real risk** (theoretical issues without practical exploit path may be declined)
- Must be **in scope** (see below)

---

## Scope

### :white_check_mark: **In Scope** (We'll Fix)

**Application Security:**
- Discord bot code (`.github/scripts/enhanced-discord-bot.js`)
- Job fetcher and scrapers (`.github/scripts/job-fetcher/`, `jobboard/src/backend/platforms/`)
- GitHub Actions workflows (`.github/workflows/`)
- Dependency vulnerabilities (npm packages)
- Secret management (API keys, tokens, webhooks)
- Code injection vulnerabilities

**Infrastructure:**
- GitHub Actions runner security
- GitHub Pages deployment
- Repository access controls

### :x: **Out of Scope** (Not Security Issues)

**Data Quality Issues:**
- Inaccurate job listings (scraped from third parties)
- Outdated job postings (auto-refresh every 15 min)
- Missing jobs from certain companies (data source limitation)
- Duplicate job postings (deduplication runs automatically)

**Third-Party Services:**
- Vulnerabilities in Discord (report to Discord)
- Vulnerabilities in GitHub (report to GitHub)
- Vulnerabilities in job posting sites we scrape (report to them)
- JSearch API security (report to JSearch)

**Intentional Behavior:**
- Rate limiting on Discord bot (prevents spam)
- Public repository visibility (intentional - open source project)
- Job data being public (intentional - public job board)

**Low-Impact Findings:**
- Missing security headers on GitHub Pages (controlled by GitHub)
- GitHub Actions logs being public (expected for public repos)
- Dependabot alerts with no practical exploit (e.g., dev-only dependencies)

---

## Known Limitations & Accepted Risks

We believe in **transparency**. Here are known security limitations we've consciously accepted:

### 1. **webpack-dev-server < 5.2.1 (Dependabot Alert #4)**
- **Status**: Accepted Risk
- **Reason**: Upgrading breaks react-scripts compatibility
- **Impact**: Development-only vulnerability, requires non-Chrome browser + predictable port + malicious site
- **Mitigation**: Developers use Chrome/Edge (unaffected), production builds not vulnerable
- **Plan**: Will be resolved when migrating from Create React App (timeline TBD)

### 2. **No Authentication on Job Scraper API**
- **Status**: Intentional Design
- **Reason**: Public job board - data is meant to be freely accessible
- **Impact**: Anyone can scrape our scraped data
- **Mitigation**: Rate limiting via GitHub Actions scheduler, no sensitive data collected

### 3. **GitHub Actions Secrets Visible in Forks**
- **Status**: GitHub Platform Limitation
- **Reason**: Forks inherit workflow files but not secrets
- **Impact**: Fork maintainers must add their own secrets
- **Mitigation**: Documented in README, workflows fail safely if secrets missing

---

## Security Measures in Place

### Automated Protections
- **Dependabot**: Automated security updates for npm dependencies
- **Secret Scanning**: GitHub scans for accidentally committed secrets
- **npm audit**: Runs on every `npm install`

### Manual Processes
- **Code Review**: All PRs reviewed before merge
- **Principle of Least Privilege**: GitHub Actions uses minimal permissions
- **Dependency Audits**: Manual review of new dependencies

### Monitoring
- **GitHub Actions Logs**: Monitored for anomalies
- **Dependabot Alerts**: Reviewed within 48 hours
- **Discord Webhook Logs**: Monitored for abuse

---

## What We Don't Collect (Privacy)

This project is **privacy-first** by design:

- **No user accounts** → No passwords to steal
- **No personal data** → No PII to leak
- **No analytics tracking** → No browsing data collected
- **No cookies** → No session hijacking risk
- **No database** → No SQL injection possible

**All data is public job postings scraped from third-party APIs.**

---

## Disclosure Policy

### Coordinated Disclosure
We follow **responsible disclosure** principles:

1. **Reporter contacts us privately** (GitHub Security Advisory or email)
2. **We acknowledge within 24 hours** and begin investigation
3. **We develop a fix** and test thoroughly
4. **We deploy the fix** to production
5. **We coordinate public disclosure** with reporter (typically 30 days after fix)
6. **We credit the reporter** (if they wish) in security advisory and changelog

### Public Disclosure
After a fix is deployed, we'll publish:
- **GitHub Security Advisory** with technical details
- **CVE** (if applicable for high/critical severity)
- **Changelog entry** in release notes
- **Credit to reporter** (unless they prefer anonymity)

---

## Hall of Fame

We appreciate security researchers who help us improve. Reporters of valid vulnerabilities will be listed here (if they consent):

| Reporter | Vulnerability | Severity | Date |
|----------|---------------|----------|------|
| *None yet - be the first!* | - | - | - |

---

## Questions?

**Security concerns that don't require private reporting:**
- Open a [GitHub Discussion](https://github.com/zapplyjobs/New-Grad-Jobs/discussions) in the Security category
- Ask in our [Discord community](https://discord.gg/zapplyjobs)

**General security questions:**
- Email: `team@zapply.ai`
- Response time: 2-3 business days

---

**Last Updated**: 2025-10-24
**Policy Version**: 1.0
**Review Schedule**: Quarterly (next review: January 2026)
