# 06 — Cleanup (usuniecie Environments/Presets)

## Cel

Po wdrozeniu Base Images (#03) i Skills (#04), moduly Environments i Presets (AgentDefinition) staja sie redundantne. Trzeba je zmigrować lub usunąć.

## Co zastepuje co

| Stare | Nowe | Migracja |
|-------|------|----------|
| Environment.setupScript | Base Image (juz zainstalowane) | Nie potrzebne |
| Environment.memoryMb/cpuCores | Config per session lub per image | Przenosimy na BaseImage lub Session |
| Environment.variables | Session env vars (bezposrednio) | Przenosimy na Session |
| Environment.enableDocker | Session.enableDocker (juz istnieje) | Bez zmian |
| AgentDefinition (Presets) | Base Image + Skills + Instructions | Migracja danych |

## Plan migracji

### Krok 1: Dodaj brakujace pola do Session/BaseImage
- `memoryMb`, `cpuCores` na `BaseImage` (lub Session bezposrednio)
- `variables` jako JSON na Session (zamiast osobnej tabeli)

### Krok 2: Migracja danych
- Dla kazdego Environment z setupScript → zaproponuj userowi stworzenie Base Image
- Dla kazdego AgentDefinition → zachowaj jako "Session Template" lub zmigruj do skilla

### Krok 3: Usuniecie
- Drop tabele: `environments`, `environment_variables`, `environment_integrations`
- Drop tabele: `agent_definitions`, `agent_definition_repositories`
- Usun moduly: `environments/`, `agents/` (presets)
- Usun z frontendu: `/environments`, `/presets`
- Zaktualizuj sidebar

### Krok 4: Porządki
- Zaktualizuj CLAUDE.md
- Zaktualizuj packages/types
- Usun nieuzywane importy

## Zalezy od
- #03 Base Images
- #04 Skills (opcjonalnie, ale lepiej miec zanim usuwamy presets)

## Uwaga
To jest BREAKING CHANGE. Jesli sa istniejace dane w environments/presets, trzeba je zmigrować. Prawdopodobnie latwe bo projekt jest mlody.

## Definition of Done
- [ ] Environments i Presets usuniete z DB
- [ ] Moduly backendowe usuniete
- [ ] Strony frontendowe usuniete
- [ ] Sidebar zaktualizowany
- [ ] Brak broken imports/references
- [ ] typecheck i lint przechodzi
