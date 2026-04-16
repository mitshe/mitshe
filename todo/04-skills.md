# 04 — Skills System

## Cel

Skills to reuzywalne "umiejetnosci" ktore AI agent (Claude Code) w sesji moze uzyc. Skill = zestaw instrukcji + narzedzi + konfiguracji ktory agent dostaje gdy potrzebuje wykonac okreslone zadanie.

Przyklady skills:
- **E2E Testing** — wie jak uzyc Playwright, pisac testy, uruchamiac Chrome
- **PHP Laravel** — wie jak zarzadzac artisan, migracje, konfiguracja
- **Code Review** — wie jak robic review, na co zwracac uwage
- **Database Migration** — wie jak pisac i uruchamiac migracje
- **Docker Compose** — wie jak pisac compose files, zarzadzac serwisami
- **Security Audit** — skanuje kod pod katem OWASP top 10

## Jak to dziala

Skill to w gruncie rzeczy **zestaw instrukcji wstrzykiwanych do agenta** + opcjonalnie **pliki/skrypty** ktore agent ma dostepne.

```
Skill = {
  name: "E2E Testing with Playwright"
  instructions: "You have Playwright available. Chrome runs on localhost:9222..."
  files: {
    "playwright.config.ts": "...",       // template config
    ".playwright/setup.sh": "..."         // setup script
  }
  requiredTools: ["chrome", "playwright"] // co musi byc zainstalowane
}
```

Gdy user tworzy sesje i wybiera skill:
1. Instrukcje skilla sa dodawane do system prompt agenta
2. Pliki skilla sa kopiowane do /workspace
3. Setup skilla jest uruchamiany (np. `npx playwright install`)

## Integracja z Claude Code

Claude Code ma wlasny system skills (CLAUDE.md, slash commands). Mozna to zintegrowac:
- Skill mitshe generuje CLAUDE.md content z instrukcjami
- Albo tworzy `.claude/commands/` z custom slash commands
- Agent w sesji automatycznie widzi te pliki

## Database

```prisma
model Skill {
  id             String   @id @default(cuid())
  organizationId String?  @map("organization_id") // null = system skill
  name           String
  description    String?
  category       String?  // "testing", "devops", "security", etc.
  instructions   String   // markdown instructions for AI
  files          Json?    // { "path": "content" } — files to copy
  setupScript    String?  @map("setup_script") // run on activation
  isSystem       Boolean  @default(false) @map("is_system")
  createdBy      String?  @map("created_by")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  organization Organization? @relation(...)

  @@index([organizationId])
  @@map("skills")
}
```

## API Endpoints

```
GET    /api/v1/skills                  # List (system + org skills)
POST   /api/v1/skills                  # Create custom skill
GET    /api/v1/skills/:id              # Get skill details
PUT    /api/v1/skills/:id              # Update
DELETE /api/v1/skills/:id              # Delete (only custom)
```

## System Skills (predefiniowane)

Dostarczamy zestaw gotowych skills:
1. **playwright-e2e** — Playwright + Chrome testing
2. **laravel** — Laravel development & artisan
3. **nextjs** — Next.js development
4. **docker-compose** — Docker service orchestration
5. **code-review** — Structured code review
6. **security-audit** — OWASP security scanning
7. **database-migration** — DB migration patterns
8. **api-testing** — REST/GraphQL API testing

User moze tez tworzyc wlasne skills.

## Frontend

### Skills page `/skills`
- Lista skills (system + custom)
- Filtrowanie po kategorii
- Tworzenie custom skills (form: name, instructions, files, setup)
- Preview skill instructions

### Session creation — zmiana
- Multi-select "Skills" obok repo i integrations
- Wybrane skills wstrzykuja instrukcje + pliki do sesji

## Pliki do stworzenia/modyfikacji

```
# Backend
apps/api/prisma/schema.prisma
apps/api/src/modules/skills/
  skills.module.ts
  skills.controller.ts
  skills.service.ts
  system-skills/               # predefiniowane skille
    playwright-e2e.skill.ts
    laravel.skill.ts
    ...
apps/api/src/modules/sessions/  # Modyfikacja — skill injection

# Frontend
apps/web/src/app/(dashboard)/skills/
  page.tsx
apps/web/src/app/(dashboard)/sessions/  # Modyfikacja — skill selector

# Types
packages/types/src/skill.ts
```

## Zalezy od
- #03 Base Images (skills dobrze sie lacza z images — obraz moze miec pre-installed skills)

## Definition of Done
- [ ] System skills dostepne out of box
- [ ] Custom skills CRUD
- [ ] Skills wstrzykiwane do sesji (instructions + files)
- [ ] Skills widoczne w session creation dialog
- [ ] Integracja z Claude Code (CLAUDE.md / .claude/commands/)
