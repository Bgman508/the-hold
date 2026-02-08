# Security Policy

## Overview

THE HOLD is designed with a **security-first, anonymous-only** architecture. We store no PII, use no trackers, and implement defense-in-depth security measures.

## Security Principles

1. **Anonymous-First Design**: No accounts, no PII, random session IDs
2. **Defense in Depth**: Multiple security layers
3. **Principle of Least Privilege**: Minimal permissions per role
4. **No PII Storage**: Hashed IPs only, no identity tracking
5. **No Trackers**: No analytics, no third-party scripts

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **DO NOT** open a public issue
2. Email security concerns to: [security@thehold.local]
3. Include detailed description and reproduction steps
4. Allow reasonable time for response before disclosure

## Security Measures

### Authentication & Authorization

- JWT-based anonymous sessions (4-hour expiry)
- RBAC with Council/Architect/Community roles
- Cryptographically random session IDs
- IP hashing with salt for rate limiting

### Input Validation

- Zod schemas for all inputs
- SQL injection protection (Prisma ORM)
- XSS prevention (input sanitization, CSP headers)
- CSRF protection (SameSite cookies)

### Rate Limiting

- WebSocket: 10 connections/minute per IP
- API: 60 requests/minute per IP
- Abuse detection with escalating blocks

### Headers

- Content Security Policy (strict)
- HSTS (2-year max-age)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

### Audit Logging

- Governance actions logged (no PII)
- Security events tracked
- Automatic PII redaction in logs

## Data Storage

### What We Store

- Anonymous session tokens (random IDs)
- Aggregated presence counts
- Total time-in-moment (no user linkage)
- Hashed IP addresses (for abuse detection)

### What We NEVER Store

- Names, emails, phone numbers
- Raw IP addresses
- Device fingerprints
- Location data
- Social identifiers
- Chat messages

## Dependencies

We regularly audit dependencies:

```bash
npm audit
```

All dependencies are pinned to specific versions.

## Compliance

- GDPR compliant (no PII = minimal obligations)
- CCPA compliant
- Anonymous by design

## Security Checklist

- [ ] No PII in database
- [ ] No third-party trackers
- [ ] CSP headers active
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Audit logging configured
- [ ] Dependencies audited
- [ ] HTTPS enforced

## Contact

For security inquiries: security@thehold.local
