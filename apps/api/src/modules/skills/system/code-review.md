---
description: Code review checklist and best practices
---

## Code Review

### Review checklist

1. **Correctness** — Does the code do what it's supposed to?
2. **Security** — OWASP Top 10, input validation, auth checks
3. **Performance** — N+1 queries, unnecessary re-renders, memory leaks
4. **Error handling** — Edge cases, error messages, graceful failures
5. **Readability** — Clear naming, reasonable function length, no magic numbers
6. **Tests** — Are new features tested? Do existing tests still pass?
7. **Dependencies** — Are new deps justified? License compatible?

### Analyzing a diff

```bash
# View changes
git diff main..HEAD

# Changed files only
git diff main..HEAD --name-only

# Stats
git diff main..HEAD --stat

# Specific file
git diff main..HEAD -- src/auth/login.ts
```

### Common issues to flag

**Security:**
- SQL injection (use parameterized queries)
- XSS (escape user input in templates)
- Hardcoded secrets or API keys
- Missing auth/authz checks
- Unvalidated redirects

**Performance:**
- N+1 database queries
- Missing indexes for frequent queries
- Large payloads without pagination
- Synchronous operations that should be async

**Code quality:**
- Functions longer than 50 lines
- Deep nesting (> 3 levels)
- Duplicate code that should be extracted
- Dead code or unused imports
- Missing TypeScript types (any usage)

### Providing feedback

- Be specific: "Line 47: this query runs inside a loop, consider using a JOIN"
- Suggest fixes, don't just point out problems
- Distinguish between blocking issues and suggestions
- Acknowledge good patterns when you see them
