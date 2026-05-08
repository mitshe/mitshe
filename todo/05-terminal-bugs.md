# 05 — Terminal bugs and artifacts

## Problem
When Claude Code generates a lot of output, terminal gets artifacts (garbled text,
wrong positioning, overwritten lines). User has to `clear` to fix.

## Likely causes
1. xterm.js buffer overflow — too much data at once
2. ANSI escape sequences not properly handled
3. Docker exec stream multiplexing issues (stdout/stderr mixing)
4. Terminal size mismatch (COLUMNS/ROWS env vs actual xterm size)

## Fixes
- [ ] Throttle terminal output — batch writes to xterm.js (max 60fps)
- [ ] Ensure COLUMNS/ROWS match xterm.js dimensions (fit addon)
- [ ] Handle terminal resize event properly (send SIGWINCH)
- [ ] Add "Clear" button in terminal toolbar (not just `clear` command)
- [ ] Test with large outputs: npm install, git log, cat large file
