# 03 — Fix Jira import + polling/sync

## Bugs
- [ ] 500 error on Jira import — debug and fix
- [ ] Import dialog UX — still too narrow, confusing flow
- [ ] "Import all assigned" may timeout on large backlogs

## Sync/Polling
- [ ] Periodic sync: workflow with trigger:schedule every 15min
      → calls /tasks/refresh-all
      → updates statuses, titles from Jira
- [ ] New task detection: compare imported IDs vs Jira search results
      → auto-import new assigned tasks
- [ ] Option: "Auto-import new tasks assigned to me" toggle in settings

## Webhook alternative
- If mitshe is on public server: Jira webhook → trigger:jira_issue_created
- If local: polling is the only option
- Settings page should explain both options clearly

## UX improvements
- [ ] Show Jira status as colored badge on task list
- [ ] "Last synced: 5min ago" indicator
- [ ] Bulk actions: mark as done, reassign, archive imported tasks
