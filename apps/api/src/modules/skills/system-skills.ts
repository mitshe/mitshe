/**
 * Predefined system skills available to all organizations.
 * Seeded on module init, updated if instructions change.
 */

export interface SystemSkillDef {
  id: string;
  name: string;
  description: string;
  category: string;
  instructions: string;
}

export const SYSTEM_SKILLS: SystemSkillDef[] = [
  {
    id: 'system-e2e-testing',
    name: 'E2E Testing (Playwright)',
    description:
      'Write and run end-to-end browser tests with Playwright and Chromium',
    category: 'testing',
    instructions: `## E2E Testing with Playwright

You have Playwright available in this environment.

### Setup
\`\`\`bash
npx playwright install chromium
\`\`\`

### Writing tests
Create test files in \`/workspace/tests/\` with the pattern \`*.spec.ts\`.

Example test:
\`\`\`typescript
import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/My App/);
});
\`\`\`

### Running tests
\`\`\`bash
npx playwright test
npx playwright test --headed  # with browser visible
npx playwright test --ui      # interactive mode
\`\`\`

### Config
If no playwright.config.ts exists, create one:
\`\`\`typescript
import { defineConfig } from '@playwright/test';
export default defineConfig({
  use: { baseURL: 'http://localhost:3000' },
});
\`\`\``,
  },
  {
    id: 'system-code-review',
    name: 'Code Review',
    description: 'Review code for quality, security, and best practices',
    category: 'quality',
    instructions: `## Code Review

When reviewing code, check for:

1. **Security** — SQL injection, XSS, command injection, hardcoded secrets
2. **Error handling** — unhandled promises, missing try/catch, generic error messages
3. **Performance** — N+1 queries, missing indexes, unnecessary re-renders
4. **Readability** — naming conventions, function length, comments where needed
5. **Testing** — are critical paths tested? edge cases covered?

### Output format
For each issue found, provide:
- File and line number
- Severity: CRITICAL / WARNING / SUGGESTION
- Description of the issue
- Suggested fix with code example

At the end, provide a summary with overall assessment.`,
  },
  {
    id: 'system-docker-compose',
    name: 'Docker Compose',
    description:
      'Set up and manage multi-service environments with Docker Compose',
    category: 'devops',
    instructions: `## Docker Compose

This session has Docker-in-Docker enabled. You can use \`docker compose\` to manage services.

### Common patterns

**Web app + database:**
\`\`\`yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    ports: ["5432:5432"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
\`\`\`

### Commands
\`\`\`bash
docker compose up -d          # start services
docker compose logs -f        # follow logs
docker compose ps             # list running
docker compose down           # stop all
docker compose exec db psql   # connect to postgres
\`\`\`

### Tips
- Always use \`-d\` (detached) so services run in background
- Check logs if a service fails to start
- Use \`docker compose down -v\` to also remove volumes`,
  },
  {
    id: 'system-api-testing',
    name: 'API Testing',
    description: 'Test REST APIs with automated requests and assertions',
    category: 'testing',
    instructions: `## API Testing

### Using curl
\`\`\`bash
# GET
curl -s http://localhost:3000/api/health | jq

# POST with JSON
curl -s -X POST http://localhost:3000/api/users \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Test", "email": "test@test.com"}' | jq

# With auth header
curl -s -H "Authorization: Bearer TOKEN" http://localhost:3000/api/me | jq
\`\`\`

### Using httpie (also available)
\`\`\`bash
http GET localhost:3000/api/health
http POST localhost:3000/api/users name=Test email=test@test.com
\`\`\`

### Test patterns
1. Test happy path (200 OK)
2. Test validation errors (400)
3. Test auth required (401)
4. Test not found (404)
5. Test edge cases (empty body, large payload, special characters)

### Output
Report results as a table: endpoint, method, status, pass/fail, notes.`,
  },
  {
    id: 'system-git-workflow',
    name: 'Git Workflow',
    description: 'Git branch management, commits, and PR preparation',
    category: 'devops',
    instructions: `## Git Workflow

### Branch naming
- Feature: \`feature/description\`
- Bugfix: \`fix/description\`
- Hotfix: \`hotfix/description\`

### Commit messages
Use conventional commits:
- \`feat: add user registration\`
- \`fix: handle null email in login\`
- \`chore: update dependencies\`
- \`refactor: extract auth middleware\`

### Workflow
\`\`\`bash
git checkout -b feature/my-feature
# ... make changes ...
git add -A
git commit -m "feat: description"
git push -u origin feature/my-feature
\`\`\`

### Before PR
- Run tests: make sure all pass
- Run linter: fix all errors
- Check diff: \`git diff main\` — review what changed
- Write PR description with summary and test plan`,
  },
];
