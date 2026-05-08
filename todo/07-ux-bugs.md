# 07 — UX bugs and friction

## Critical (blocks core flow)
- [ ] Delete task redirects to deleted task page (404) — should go to /tasks
- [ ] Page navigation loses state — chat message draft lost when switching pages
      → Use React Query or zustand for persisting form state
- [ ] Tab switch / window focus doesn't refresh data reliably
      → refetchOnWindowFocus is enabled but may not trigger for all queries
- [ ] Creating session from snapshot that was deleted → generic error
      → Need to show "Snapshot no longer exists" with link to snapshots page

## Important (degrades experience)
- [ ] Thread/session notifications — when Claude finishes in background thread,
      show toast/notification: "Thread X: Claude finished. Review changes."
      → WebSocket event from session_agent completion
- [ ] Active threads indicator — sidebar should show count of RUNNING threads
- [ ] Chat draft persistence — don't lose typed message on navigation
      → Store in sessionStorage keyed by conversation ID
- [ ] Workflow execution status not visible from workflow list
      → Show last execution status badge on workflow row

## Nice-to-have
- [ ] Keyboard shortcuts: Cmd+1/2/3 to switch between recent threads
- [ ] Thread quick-switch dropdown in top nav
- [ ] "Recently used" snapshots at top of snapshot selector
