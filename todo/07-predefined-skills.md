# 07 — Predefined Skills (System Skills)

## Cel

Dostarczyc gotowe skills out of the box, zeby user nie musial pisac instrukcji od zera. Skills sa instalowane jako `~/.claude/commands/{slug}.md` w kontenerze sesji — dostepne jako slash commands w Claude Code.

## Architektura

Skills maja pole `isSystem: true` w DB. Przy pierwszym starcie (seed) lub migracji dodajemy system skills. User moze je wybrac przy tworzeniu sesji, nie moze ich edytowac/usuwac.

### Seed / migration
```typescript
// apps/api/prisma/seed.ts lub osobny migration script
const systemSkills = [
  { name: 'E2E Testing', slug: 'e2e-testing', category: 'testing', ... },
  { name: 'API Testing', slug: 'api-testing', category: 'testing', ... },
  ...
];

for (const skill of systemSkills) {
  await prisma.skill.upsert({
    where: { slug_isSystem: { slug: skill.slug, isSystem: true } },
    create: { ...skill, isSystem: true, organizationId: null },
    update: { instructions: skill.instructions },
  });
}
```

### Schema change
```prisma
model Skill {
  // ... existing
  slug String? @map("slug")  // url-friendly name, unique for system skills
  @@unique([slug, isSystem])
}
```

## Skills do stworzenia

### Kategoria: Testing

**1. E2E Testing (`/e2e-testing`)**
- Playwright best practices
- Jak pisac testy: page objects, selectors, assertions
- Jak uruchamiac: `npx playwright test`, `--headed`, `--debug`
- Screenshoty i trace
- Informacja ze Chromium jest dostepny na DISPLAY :99 (gdy enableBrowser)

**2. API Testing (`/api-testing`)**
- httpie (`http`), curl, wget — ktory kiedy
- REST i GraphQL testing patterns
- Assertions na response body, status, headers
- Load testing z k6 lub autocannon
- Mock server (json-server, msw)

**3. Unit Testing (`/unit-testing`)**
- Jest, Vitest — konfiguracja, watch mode
- Mocking (jest.mock, vi.mock)
- Coverage report (--coverage)
- TDD workflow

**4. Visual Testing (`/visual-testing`)**
- Playwright screenshot comparison
- `toHaveScreenshot()` API
- Update baselines: `--update-snapshots`
- CI/CD integration tips

### Kategoria: DevOps

**5. Docker (`/docker`)**
- Docker i Docker Compose (dostepne przez DinD)
- Budowanie images, multi-stage builds
- docker compose up/down, logs, exec
- Debugging container issues

**6. CI/CD (`/ci-cd`)**
- GitHub Actions workflow syntax
- GitLab CI pipeline syntax
- Testowanie pipeline lokalnie (act)
- Deploy strategies

### Kategoria: Code Quality

**7. Code Review (`/code-review`)**
- Jak robic review: checklist, OWASP, performance
- Git diff analysis
- Sugestie refactoringu
- PR description best practices

**8. Security Audit (`/security-audit`)**
- OWASP Top 10 checklist
- Dependency scanning (npm audit, snyk)
- Secret detection
- SQL injection, XSS, CSRF patterns

### Kategoria: Languages

**9. TypeScript (`/typescript`)**
- Strict mode, tsconfig best practices
- Common type patterns (generics, utility types)
- Migration from JavaScript
- Performance tips

**10. Python (`/python`)**
- Virtual environments (venv, poetry)
- Type hints (mypy)
- Testing (pytest, fixtures)
- FastAPI / Django patterns

### Kategoria: Frontend

**11. React (`/react`)**
- Hooks best practices
- State management patterns
- Performance (memo, useMemo, lazy)
- Testing z React Testing Library

**12. Next.js (`/nextjs`)**
- App Router vs Pages Router
- Server Components, Server Actions
- Data fetching patterns
- Deployment (Vercel, Docker)

## Frontend — skill picker

Na stronie tworzenia sesji, skills z `isSystem: true` powinny byc wyraznie oznaczone (np. badge "Built-in") i pogrupowane po kategorii. User skills na gorze, system skills pod spodem.

## Pliki do stworzenia/modyfikacji

```
# Schema
apps/api/prisma/schema.prisma              # slug field, unique constraint

# Seed
apps/api/prisma/seed.ts                    # System skills upsert

# Skill definitions (markdown content)
apps/api/src/modules/skills/system/
  e2e-testing.md
  api-testing.md
  unit-testing.md
  visual-testing.md
  docker.md
  ci-cd.md
  code-review.md
  security-audit.md
  typescript.md
  python.md
  react.md
  nextjs.md

# Loader
apps/api/src/modules/skills/system/
  index.ts                                 # Reads .md files, returns skill objects

# Frontend
apps/web/src/app/(dashboard)/sessions/page.tsx   # Skill picker grouped by category
apps/web/src/app/(dashboard)/skills/page.tsx     # Badge "Built-in" for system skills
```

## Definition of Done
- [ ] Schema: slug field + unique constraint na system skills
- [ ] 12 system skills z instrukcjami markdown
- [ ] Seed script upsertuje skills przy starcie
- [ ] Skills page: badge "Built-in", system skills nieedytowalne
- [ ] Session create: skills pogrupowane po kategorii
- [ ] Testy: skill instalowany jako ~/.claude/commands/{slug}.md w kontenerze
