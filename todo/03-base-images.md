# 03 — Base Images (bazowe kontenery)

## Cel

Zamiast Environments/Presets user sam konfiguruje sesje i zamraza je jako "bazowe obrazy". Z bazowego obrazu mozna:
1. Tworzyc nowe sesje (z gotowym workspace)
2. Uzywac w workflow (executor startuje z bazowego obrazu)
3. Tworzyc dalsze obrazy (layers)

Przyklad flow:
```
1. User tworzy sesje "moj-php-setup"
2. Claude Code instaluje PHP, Composer, MySQL client, Playwright
3. Klonuje repo, robi composer install, npm install
4. User klika "Save as Base Image" → obraz "php-workspace"
5. Nastepnym razem user tworzy sesje z obrazu "php-workspace"
   → wszystko juz zainstalowane, gotowe do pracy
6. User moze tez uzyc "php-workspace" w workflow jako executor
```

## Roznica vs obecny stan

Teraz `commitContainerToImage` jest **ephemeral** — obraz tworzy sie na chwile podczas clone/recreate i od razu jest usuwany. Trzeba:
1. Persistent images — przechowywane dlugoterminowo
2. Image management UI — lista, tworzenie, usuwanie
3. Image selection — przy tworzeniu sesji / w workflow

## Database

```prisma
model BaseImage {
  id             String   @id @default(cuid())
  organizationId String   @map("organization_id")
  name           String
  description    String?
  dockerImage    String   @map("docker_image")  // np. "mitshe-base:abc123"
  sizeBytes      BigInt?  @map("size_bytes")
  sourceSessionId String? @map("source_session_id") // z jakiej sesji utworzono
  parentImageId  String?  @map("parent_image_id")   // jesli oparty na innym base image
  enableDocker   Boolean  @default(false) @map("enable_docker")
  createdBy      String   @map("created_by")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  organization Organization  @relation(...)
  sourceSession AgentSession? @relation(...)
  parentImage  BaseImage?     @relation("ImageHierarchy", fields: [parentImageId], references: [id])
  childImages  BaseImage[]    @relation("ImageHierarchy")
  sessions     AgentSession[] // sesje utworzone z tego obrazu

  @@index([organizationId])
  @@map("base_images")
}
```

Dodac do `AgentSession`:
```prisma
baseImageId String? @map("base_image_id")
baseImage   BaseImage? @relation(...)
```

## API Endpoints

```
POST   /api/v1/images                    # Create from session
GET    /api/v1/images                    # List images
GET    /api/v1/images/:id                # Get image details
DELETE /api/v1/images/:id                # Delete image (+ docker rmi)
PATCH  /api/v1/images/:id                # Update name/description
POST   /api/v1/images/:id/create-session # Create session from image
```

## Implementacja

### Image creation flow
1. User klika "Save as Image" na running session
2. `POST /api/v1/images` z `{ sessionId, name, description }`
3. Backend:
   a. `docker commit <containerId> mitshe-base:<imageId>`
   b. `docker inspect` → pobierz size
   c. Zapisz `BaseImage` do DB
4. Obraz NIE jest usuwany (persistent)

### Session from image flow
1. User tworzy sesje i wybiera base image
2. `POST /api/v1/sessions` z `{ baseImageId: "...", ... }`
3. Backend:
   a. Pobierz `BaseImage.dockerImage` z DB
   b. `createAndStart()` z `image: baseImage.dockerImage`
   c. Skip repo cloning (juz w obrazie) — chyba ze user doda nowe repo
   d. Setup script NIE odpala sie ponownie (juz w obrazie)

### Image cleanup
- Cron job: usun obrazy z usunieta organizacja
- `docker system df` monitoring — ostrzez gdy duzo miejsca zajete
- Max images per org (konfigurowalny limit)

## Frontend

### Images page `/images`
- Lista obrazow (karty lub tabela)
- Karta: nazwa, opis, rozmiar, data, source session, parent image
- Akcje: create session, delete
- "Create Image" button → dialog z wyborem sesji

### Session creation dialog — zmiana
- Nowe pole: "Base Image" (select)
- Jesli wybrany → repo selection staje sie opcjonalny (juz w obrazie)
- Preview co jest w obrazie (file tree snapshot?)

### Workflow editor — zmiana
- `action:session_create` node config: dodaj "Base Image" dropdown

## Pliki do stworzenia/modyfikacji

```
# Backend
apps/api/prisma/schema.prisma               # BaseImage model, AgentSession.baseImageId
apps/api/src/modules/images/
  images.module.ts
  images.controller.ts
  images.service.ts
  dto/
apps/api/src/modules/sessions/              # Modyfikacja — obsluga baseImageId

# Frontend
apps/web/src/app/(dashboard)/images/
  page.tsx
apps/web/src/app/(dashboard)/sessions/      # Modyfikacja — base image selector
apps/web/src/lib/api/client.ts              # Image API methods
apps/web/src/lib/api/hooks.ts               # React Query hooks
apps/web/src/components/layout/sidebar.tsx   # Dodaj "Images" do nawigacji

# Types
packages/types/src/base-image.ts
```

## Zalezy od
- Nic — mozna robic rownolegle z #01

## Definition of Done
- [ ] Mozna zamrozic sesje jako persistent base image
- [ ] Mozna tworzyc sesje z base image
- [ ] Image management UI (lista, usuwanie, tworzenie)
- [ ] Mozna wybrac base image w workflow session_create node
- [ ] Docker images sa trwale przechowywane (nie usuwane po clone)
