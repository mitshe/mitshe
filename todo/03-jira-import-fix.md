> MOSTLY DONE

# 03 — Fix Jira import + polling/sync

## Done
- [x] 500 error on Jira import — fixed (try/catch → BadRequestException)
- [x] "Import all assigned" — bulk import endpoint added
- [x] Refresh all — /tasks/refresh-all endpoint added

## Remaining
- [ ] Periodic sync: workflow with trigger:schedule every 15min → calls /tasks/refresh-all
- [ ] New task detection: auto-import newly assigned tasks
- [ ] "Auto-import new tasks assigned to me" toggle in settings
- [ ] Import dialog UX — still too narrow, confusing flow
- [ ] "Last synced: 5min ago" indicator
