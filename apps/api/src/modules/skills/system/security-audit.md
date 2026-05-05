---
description: Security audit — OWASP, dependency scanning, secret detection
---

## Security Audit

### OWASP Top 10 checklist

1. **Injection** — SQL, NoSQL, OS command, LDAP
2. **Broken Authentication** — Weak passwords, session fixation, missing MFA
3. **Sensitive Data Exposure** — Unencrypted data, missing HTTPS, leaked tokens
4. **XML External Entities** — XXE in XML parsers
5. **Broken Access Control** — IDOR, privilege escalation, missing authz
6. **Security Misconfiguration** — Default credentials, verbose errors, open CORS
7. **XSS** — Reflected, stored, DOM-based
8. **Insecure Deserialization** — Untrusted data deserialization
9. **Using Components with Known Vulnerabilities** — Outdated deps
10. **Insufficient Logging** — Missing audit trail, no alerting

### Dependency scanning

```bash
# npm audit
npm audit
npm audit --production   # prod deps only
npm audit fix            # auto-fix

# Check for known vulnerabilities
npx audit-ci --moderate

# Python
pip audit
safety check
```

### Secret detection

```bash
# Search for hardcoded secrets
grep -rn "password\s*=" --include="*.ts" --include="*.js" .
grep -rn "api[_-]key\s*=" --include="*.ts" --include="*.js" .
grep -rn "secret\s*=" --include="*.env*" .

# Check git history for leaked secrets
git log --all -p | grep -i "password\|secret\|api.key\|token" | head -20
```

### Common patterns to check

**SQL Injection:**
```typescript
// BAD
const query = `SELECT * FROM users WHERE id = ${userId}`;

// GOOD
const query = `SELECT * FROM users WHERE id = $1`;
await db.query(query, [userId]);
```

**XSS:**
```typescript
// BAD
element.innerHTML = userInput;

// GOOD
element.textContent = userInput;
```

**CSRF:**
- Check for CSRF tokens in forms
- Verify SameSite cookie attribute
- Check CORS configuration

**Auth:**
- Password hashing (bcrypt, argon2 — not MD5/SHA1)
- JWT expiration and refresh flow
- Rate limiting on login endpoints
- Account lockout after failed attempts

### Reporting

Structure findings as:
- **Critical** — Immediate fix required (RCE, SQL injection, auth bypass)
- **High** — Fix before next release (XSS, IDOR, weak crypto)
- **Medium** — Plan fix (missing rate limits, verbose errors)
- **Low** — Nice to have (security headers, CSP improvements)
