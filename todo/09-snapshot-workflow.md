# 09 — Snapshot w workflow

## Cel

Workflow może tworzyć sesje z konkretnego snapshoта i uruchamiać w nich Claude Code.
Np: Jira trigger → sesja z "firma-fullstack" → Claude Code robi zadanie → testy → PR → Slack.

## Co brakuje

### Workflow runner — session executor z snapshotId
`action:session_create` w workflow runner musi obsługiwać `snapshotId` w config.
Runner wywołuje API z `baseImageId`.

Plik: `apps/api/docker/executor/workflow-runner/src/executors/session/session.executor.ts`

### Workflow editor — snapshot selector w node config
UI workflow editora: node `action:session_create` potrzebuje dropdown z listą snapshotów.

### Workflow template — "Run task from snapshot"
Gotowy template: trigger → create session from snapshot → run Claude Code → stop session.

## Definition of Done
- [ ] Workflow node session_create akceptuje snapshotId
- [ ] Workflow editor pokazuje dropdown snapshotów
- [ ] Template "Run task from snapshot" dostępny
